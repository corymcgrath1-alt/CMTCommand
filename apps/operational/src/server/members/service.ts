import { randomUUID } from "node:crypto";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { OperationalDatabase } from "@/server/db/client";
import {
  officeAssignments,
  offices,
  organizationMemberships,
  organizations,
  users,
  type MembershipStatus,
  type OfficeAccessPolicy,
  type OrganizationRole,
} from "@/server/db/schema";
import {
  hasPermission,
  permissionsForRole,
  roleMayUseOrganizationWideOfficeAccess,
  type Permission,
} from "@/server/auth/permissions";
import type { AuthorizationContext } from "@/server/auth/types";
import {
  membershipVersionInputSchema,
  officeAssignmentInputSchema,
  prepareMembershipInputSchema,
  updateMembershipRoleInputSchema,
  updateMembershipStatusInputSchema,
  updateOfficeAccessInputSchema,
} from "./validation";

export type SecurityMutationAction =
  | "membership.prepared"
  | "membership.role_changed"
  | "membership.status_changed"
  | "membership.office_access_changed"
  | "office_assignment.created"
  | "office_assignment.removed";

export type SecurityMutationMetadata = {
  mutationId: string;
  action: SecurityMutationAction;
  actorUserId: string;
  organizationId: string;
  subjectId: string;
  occurredAt: string;
};

export type MembershipMutationResult =
  | {
      status: "ok";
      membershipId: string;
      version?: number;
      mutation: SecurityMutationMetadata;
    }
  | {
      status:
        | "validation_error"
        | "forbidden"
        | "not_found_or_inaccessible"
        | "conflict"
        | "stale_update"
        | "final_admin"
        | "invalid_transition"
        | "persistence_error";
      reason: string;
    };

export type MemberAdministrationRecord = {
  membershipId: string;
  version: number;
  displayName: string;
  email: string;
  role: OrganizationRole;
  status: MembershipStatus;
  officeAccess: OfficeAccessPolicy;
  offices: { id: string; code: string; name: string }[];
};

export async function listOrganizationMembers(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<MemberAdministrationRecord[] | null> {
  if (!hasPermission(context, "organization.members.read")) {
    return null;
  }

  const memberRows = await db
    .select({
      membershipId: organizationMemberships.id,
      version: organizationMemberships.version,
      displayName: users.displayName,
      email: users.email,
      role: organizationMemberships.role,
      status: organizationMemberships.status,
      officeAccess: organizationMemberships.officeAccess,
    })
    .from(organizationMemberships)
    .innerJoin(users, eq(organizationMemberships.userId, users.id))
    .where(
      eq(
        organizationMemberships.organizationId,
        context.membership.organizationId,
      ),
    )
    .orderBy(users.displayName, users.email);

  const assignmentRows = await db
    .select({
      membershipId: officeAssignments.organizationMembershipId,
      officeId: offices.id,
      code: offices.code,
      name: offices.name,
    })
    .from(officeAssignments)
    .innerJoin(offices, eq(officeAssignments.officeId, offices.id))
    .where(
      eq(officeAssignments.organizationId, context.membership.organizationId),
    )
    .orderBy(offices.code);

  const byMembership = new Map<
    string,
    { id: string; code: string; name: string }[]
  >();

  for (const assignment of assignmentRows) {
    const values = byMembership.get(assignment.membershipId) ?? [];
    values.push({
      id: assignment.officeId,
      code: assignment.code,
      name: assignment.name,
    });
    byMembership.set(assignment.membershipId, values);
  }

  return memberRows.map((member) => ({
    ...member,
    offices: byMembership.get(member.membershipId) ?? [],
  }));
}

export async function prepareOrganizationMembership(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<MembershipMutationResult> {
  if (!allows(context, "organization.members.manage", "organization.roles.manage")) {
    return forbidden();
  }

  const parsed = prepareMembershipInputSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("invalid_membership_input");
  }

  if (
    parsed.data.officeAccess === "all" &&
    !roleMayUseOrganizationWideOfficeAccess(parsed.data.role)
  ) {
    return invalid("role_requires_restricted_office_access");
  }

  const officeIds = [...new Set(parsed.data.officeIds)];

  try {
    return await db.transaction(async (transaction) => {
      await lockOrganization(transaction, context.membership.organizationId);

      if (
        !(await currentActorAllows(
          transaction,
          context,
          "organization.members.manage",
          "organization.roles.manage",
        ))
      ) {
        return forbidden();
      }

      if (officeIds.length > 0) {
        const matchingOffices = await transaction
          .select({ id: offices.id })
          .from(offices)
          .where(
            and(
              eq(offices.organizationId, context.membership.organizationId),
              inArray(offices.id, officeIds),
            ),
          );

        if (matchingOffices.length !== officeIds.length) {
          return inaccessible();
        }
      }

      const [existingUser] = await transaction
        .select()
        .from(users)
        .where(eq(users.normalizedEmail, parsed.data.email))
        .limit(1);

      const user =
        existingUser ??
        (
          await transaction
            .insert(users)
            .values({
              email: parsed.data.email,
              normalizedEmail: parsed.data.email,
              displayName: parsed.data.displayName,
              status: "invited",
            })
            .returning()
        )[0];

      const [membership] = await transaction
        .insert(organizationMemberships)
        .values({
          organizationId: context.membership.organizationId,
          userId: user.id,
          role: parsed.data.role,
          status: "invited",
          officeAccess: parsed.data.officeAccess,
          createdByUserId: context.user.id,
          updatedByUserId: context.user.id,
        })
        .onConflictDoNothing({
          target: [
            organizationMemberships.organizationId,
            organizationMemberships.userId,
          ],
        })
        .returning();

      if (!membership) {
        return conflict("membership_already_exists");
      }

      if (officeIds.length > 0) {
        await transaction.insert(officeAssignments).values(
          officeIds.map((officeId) => ({
            organizationId: context.membership.organizationId,
            organizationMembershipId: membership.id,
            officeId,
            createdByUserId: context.user.id,
          })),
        );
      }

      return success(
        "membership.prepared",
        context,
        membership.id,
        membership.version,
      );
    });
  } catch {
    return persistenceFailure();
  }
}

export async function changeMembershipRole(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<MembershipMutationResult> {
  if (!allows(context, "organization.roles.manage")) {
    return forbidden();
  }

  const parsed = updateMembershipRoleInputSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("invalid_role_change");
  }

  return mutateMembership(
    db,
    context,
    parsed.data,
    ["organization.roles.manage"],
    async (transaction, target) => {
    if (target.userId === context.user.id) {
      return forbidden("self_role_change_forbidden");
    }

    if (
      target.officeAccess === "all" &&
      !roleMayUseOrganizationWideOfficeAccess(parsed.data.role)
    ) {
      return invalid("role_requires_restricted_office_access");
    }

    if (
      target.role === "organization_admin" &&
      target.status === "active" &&
      parsed.data.role !== "organization_admin" &&
      (await activeAdminCount(transaction, context.membership.organizationId)) <= 1
    ) {
      return finalAdmin();
    }

    const [updated] = await transaction
      .update(organizationMemberships)
      .set({
        role: parsed.data.role,
        version: sql`${organizationMemberships.version} + 1`,
        updatedByUserId: context.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMemberships.id, target.id),
          eq(organizationMemberships.organizationId, target.organizationId),
          eq(organizationMemberships.version, parsed.data.expectedVersion),
        ),
      )
      .returning({ version: organizationMemberships.version });

    return updated
      ? success("membership.role_changed", context, target.id, updated.version)
      : stale();
    },
  );
}

export async function changeMembershipStatus(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<MembershipMutationResult> {
  if (!allows(context, "organization.members.manage")) {
    return forbidden();
  }

  const parsed = updateMembershipStatusInputSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("invalid_status_change");
  }

  return mutateMembership(
    db,
    context,
    parsed.data,
    ["organization.members.manage"],
    async (transaction, target) => {
    if (target.userId === context.user.id) {
      return forbidden("self_status_change_forbidden");
    }

    if (!statusTransitionAllowed(target.status, parsed.data.status)) {
      return {
        status: "invalid_transition",
        reason: "membership_status_transition_not_allowed",
      };
    }

    if (
      target.role === "organization_admin" &&
      target.status === "active" &&
      parsed.data.status !== "active" &&
      (await activeAdminCount(transaction, context.membership.organizationId)) <= 1
    ) {
      return finalAdmin();
    }

    const [updated] = await transaction
      .update(organizationMemberships)
      .set({
        status: parsed.data.status,
        version: sql`${organizationMemberships.version} + 1`,
        updatedByUserId: context.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMemberships.id, target.id),
          eq(organizationMemberships.organizationId, target.organizationId),
          eq(organizationMemberships.version, parsed.data.expectedVersion),
        ),
      )
      .returning({ version: organizationMemberships.version });

    return updated
      ? success("membership.status_changed", context, target.id, updated.version)
      : stale();
    },
  );
}

export async function changeOfficeAccessPolicy(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<MembershipMutationResult> {
  if (!allows(context, "office.assignments.manage")) {
    return forbidden();
  }

  const parsed = updateOfficeAccessInputSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("invalid_office_access_change");
  }

  return mutateMembership(
    db,
    context,
    parsed.data,
    ["office.assignments.manage"],
    async (transaction, target) => {
    if (
      parsed.data.officeAccess === "all" &&
      !roleMayUseOrganizationWideOfficeAccess(target.role)
    ) {
      return invalid("role_requires_restricted_office_access");
    }

    const [updated] = await transaction
      .update(organizationMemberships)
      .set({
        officeAccess: parsed.data.officeAccess,
        version: sql`${organizationMemberships.version} + 1`,
        updatedByUserId: context.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationMemberships.id, target.id),
          eq(organizationMemberships.organizationId, target.organizationId),
          eq(organizationMemberships.version, parsed.data.expectedVersion),
        ),
      )
      .returning({ version: organizationMemberships.version });

    return updated
      ? success(
          "membership.office_access_changed",
          context,
          target.id,
          updated.version,
        )
      : stale();
    },
  );
}

export async function assignOfficeToMembership(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<MembershipMutationResult> {
  if (!allows(context, "office.assignments.manage")) {
    return forbidden();
  }

  const parsed = officeAssignmentInputSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("invalid_office_assignment");
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOrganization(transaction, context.membership.organizationId);

      if (
        !(await currentActorAllows(
          transaction,
          context,
          "office.assignments.manage",
        ))
      ) {
        return forbidden();
      }
      const [target] = await transaction
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.id, parsed.data.membershipId),
            eq(
              organizationMemberships.organizationId,
              context.membership.organizationId,
            ),
          ),
        )
        .limit(1);

      if (!target) {
        return inaccessible();
      }

      if (target.officeAccess !== "restricted") {
        return invalid("membership_has_organization_wide_office_access");
      }

      const [office] = await transaction
        .select({ id: offices.id })
        .from(offices)
        .where(
          and(
            eq(offices.id, parsed.data.officeId),
            eq(offices.organizationId, context.membership.organizationId),
          ),
        )
        .limit(1);

      if (!office) {
        return inaccessible();
      }

      const [assignment] = await transaction
        .insert(officeAssignments)
        .values({
          organizationId: context.membership.organizationId,
          organizationMembershipId: target.id,
          officeId: office.id,
          createdByUserId: context.user.id,
        })
        .onConflictDoNothing({
          target: [
            officeAssignments.organizationMembershipId,
            officeAssignments.officeId,
          ],
        })
        .returning({ id: officeAssignments.id });

      return assignment
        ? success("office_assignment.created", context, target.id)
        : conflict("office_assignment_already_exists");
    });
  } catch {
    return persistenceFailure();
  }
}

export async function removeOfficeFromMembership(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<MembershipMutationResult> {
  if (!allows(context, "office.assignments.manage")) {
    return forbidden();
  }

  const parsed = officeAssignmentInputSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("invalid_office_assignment");
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOrganization(transaction, context.membership.organizationId);

      if (
        !(await currentActorAllows(
          transaction,
          context,
          "office.assignments.manage",
        ))
      ) {
        return forbidden();
      }

      const [removed] = await transaction
        .delete(officeAssignments)
        .where(
          and(
            eq(
              officeAssignments.organizationId,
              context.membership.organizationId,
            ),
            eq(
              officeAssignments.organizationMembershipId,
              parsed.data.membershipId,
            ),
            eq(officeAssignments.officeId, parsed.data.officeId),
          ),
        )
        .returning({
          membershipId: officeAssignments.organizationMembershipId,
        });

      return removed
        ? success("office_assignment.removed", context, removed.membershipId)
        : inaccessible();
    });
  } catch {
    return persistenceFailure();
  }
}

type MembershipTarget = typeof organizationMemberships.$inferSelect;
type Transaction = Parameters<
  Parameters<OperationalDatabase["transaction"]>[0]
>[0];

async function mutateMembership(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: { membershipId: string; expectedVersion: number },
  requiredPermissions: Permission[],
  mutation: (
    transaction: Transaction,
    target: MembershipTarget,
  ) => Promise<MembershipMutationResult>,
): Promise<MembershipMutationResult> {
  const parsed = membershipVersionInputSchema.safeParse(input);

  if (!parsed.success) {
    return invalid("invalid_membership_mutation");
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOrganization(transaction, context.membership.organizationId);

      if (
        !(await currentActorAllows(
          transaction,
          context,
          ...requiredPermissions,
        ))
      ) {
        return forbidden();
      }
      const [target] = await transaction
        .select()
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.id, parsed.data.membershipId),
            eq(
              organizationMemberships.organizationId,
              context.membership.organizationId,
            ),
          ),
        )
        .limit(1);

      if (!target) {
        return inaccessible();
      }

      if (target.version !== parsed.data.expectedVersion) {
        return stale();
      }

      return mutation(transaction, target);
    });
  } catch {
    return persistenceFailure();
  }
}

async function lockOrganization(
  transaction: Transaction,
  organizationId: string,
): Promise<void> {
  await transaction.execute(sql`
    select ${organizations.id}
    from ${organizations}
    where ${organizations.id} = ${organizationId}
    for update
  `);
}

async function activeAdminCount(
  transaction: Transaction,
  organizationId: string,
): Promise<number> {
  const [result] = await transaction
    .select({ value: count() })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.role, "organization_admin"),
        eq(organizationMemberships.status, "active"),
      ),
    );

  return result?.value ?? 0;
}

async function currentActorAllows(
  transaction: Transaction,
  context: AuthorizationContext,
  ...requiredPermissions: Permission[]
): Promise<boolean> {
  const [actor] = await transaction
    .select({
      role: organizationMemberships.role,
      membershipStatus: organizationMemberships.status,
      userStatus: users.status,
      organizationStatus: organizations.status,
    })
    .from(organizationMemberships)
    .innerJoin(users, eq(organizationMemberships.userId, users.id))
    .innerJoin(
      organizations,
      eq(organizationMemberships.organizationId, organizations.id),
    )
    .where(
      and(
        eq(organizationMemberships.id, context.membership.id),
        eq(
          organizationMemberships.organizationId,
          context.membership.organizationId,
        ),
        eq(organizationMemberships.userId, context.user.id),
      ),
    )
    .limit(1);

  if (
    !actor ||
    actor.membershipStatus !== "active" ||
    actor.userStatus !== "active" ||
    actor.organizationStatus !== "active"
  ) {
    return false;
  }

  const currentPermissions = permissionsForRole(actor.role);
  return requiredPermissions.every((permission) =>
    currentPermissions.includes(permission),
  );
}

export function statusTransitionAllowed(
  from: MembershipStatus,
  to: MembershipStatus,
): boolean {
  const transitions: Record<MembershipStatus, MembershipStatus[]> = {
    invited: ["invited", "active", "revoked"],
    active: ["active", "suspended", "revoked"],
    suspended: ["suspended", "active", "revoked"],
    revoked: ["revoked"],
  };

  return transitions[from].includes(to);
}

function allows(context: AuthorizationContext, ...permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(context, permission));
}

function success(
  action: SecurityMutationAction,
  context: AuthorizationContext,
  subjectId: string,
  version?: number,
): MembershipMutationResult {
  return {
    status: "ok",
    membershipId: subjectId,
    version,
    mutation: {
      mutationId: randomUUID(),
      action,
      actorUserId: context.user.id,
      organizationId: context.membership.organizationId,
      subjectId,
      occurredAt: new Date().toISOString(),
    },
  };
}

function forbidden(reason = "missing_permission"): MembershipMutationResult {
  return { status: "forbidden", reason };
}

function invalid(reason: string): MembershipMutationResult {
  return { status: "validation_error", reason };
}

function inaccessible(): MembershipMutationResult {
  return {
    status: "not_found_or_inaccessible",
    reason: "not_found_or_inaccessible",
  };
}

function conflict(reason: string): MembershipMutationResult {
  return { status: "conflict", reason };
}

function stale(): MembershipMutationResult {
  return { status: "stale_update", reason: "membership_changed_since_read" };
}

function finalAdmin(): MembershipMutationResult {
  return { status: "final_admin", reason: "final_active_admin_required" };
}

function persistenceFailure(): MembershipMutationResult {
  return { status: "persistence_error", reason: "database_error" };
}
