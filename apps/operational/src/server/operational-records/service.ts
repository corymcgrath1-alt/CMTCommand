import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { OperationalDatabase } from "@/server/db/client";
import {
  dispatchAssignments,
  officeAssignments,
  offices,
  organizationMemberships,
  organizations,
  projects,
  technicians,
  users,
  workOrders,
  type DispatchAssignmentRecord,
  type ProjectRecord,
  type TechnicianRecord,
  type WorkOrderRecord,
} from "@/server/db/schema";
import {
  hasPermission,
  permissionsForRole,
  roleMayUseOrganizationWideOfficeAccess,
  type Permission,
} from "@/server/auth/permissions";
import type { AuthorizationContext } from "@/server/auth/types";
import { getPostgresErrorInfo } from "@/server/tenancy/errors";
import { uuidInputSchema, validationIssues } from "@/server/tenancy/validation";
import {
  createDispatchAssignmentInputSchema,
  createProjectInputSchema,
  createTechnicianInputSchema,
  createWorkOrderInputSchema,
} from "./validation";
import {
  forbidden,
  notFoundOrInaccessible,
  persistenceFailure,
  type OperationalRecordConflictReason,
  type OperationalRecordCreateResult,
  type OperationalRecordFailure,
  type OperationalRecordListResult,
  type OperationalRecordLookupResult,
  type OperationalRecordMutationAction,
  type OperationalRecordMutationMetadata,
} from "./results";
import { operationalRecordScopePredicate } from "./scope";

type Transaction = Parameters<
  Parameters<OperationalDatabase["transaction"]>[0]
>[0];

type CurrentActorCheck = "allowed" | "forbidden" | "office_inaccessible";

export async function listProjects(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<ProjectRecord>> {
  if (!hasPermission(context, "project.read")) {
    return forbidden();
  }

  try {
    const values = await db
      .select()
      .from(projects)
      .where(
        operationalRecordScopePredicate(
          context.tenantScope,
          projects.organizationId,
          projects.officeId,
        ),
      )
      .orderBy(projects.projectNumber, projects.name);

    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function findProjectById(
  db: OperationalDatabase,
  context: AuthorizationContext,
  idInput: unknown,
): Promise<OperationalRecordLookupResult<ProjectRecord>> {
  if (!hasPermission(context, "project.read")) {
    return forbidden();
  }

  const parsedId = parseRecordId(idInput);
  if (!parsedId.ok) {
    return parsedId.failure;
  }

  try {
    const [value] = await db
      .select()
      .from(projects)
      .where(
        and(
          operationalRecordScopePredicate(
            context.tenantScope,
            projects.organizationId,
            projects.officeId,
          ),
          eq(projects.id, parsedId.id),
        ),
      )
      .limit(1);

    return value ? { status: "found", value } : notFoundOrInaccessible();
  } catch {
    return persistenceFailure();
  }
}

export async function listTechnicians(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<TechnicianRecord>> {
  if (!hasPermission(context, "technician.read")) {
    return forbidden();
  }

  try {
    const values = await db
      .select()
      .from(technicians)
      .where(
        operationalRecordScopePredicate(
          context.tenantScope,
          technicians.organizationId,
          technicians.officeId,
        ),
      )
      .orderBy(technicians.displayName, technicians.sourceTechnicianId);

    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function findTechnicianById(
  db: OperationalDatabase,
  context: AuthorizationContext,
  idInput: unknown,
): Promise<OperationalRecordLookupResult<TechnicianRecord>> {
  if (!hasPermission(context, "technician.read")) {
    return forbidden();
  }

  const parsedId = parseRecordId(idInput);
  if (!parsedId.ok) {
    return parsedId.failure;
  }

  try {
    const [value] = await db
      .select()
      .from(technicians)
      .where(
        and(
          operationalRecordScopePredicate(
            context.tenantScope,
            technicians.organizationId,
            technicians.officeId,
          ),
          eq(technicians.id, parsedId.id),
        ),
      )
      .limit(1);

    return value ? { status: "found", value } : notFoundOrInaccessible();
  } catch {
    return persistenceFailure();
  }
}

export async function listWorkOrders(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<WorkOrderRecord>> {
  if (!hasPermission(context, "work_order.read")) {
    return forbidden();
  }

  try {
    const values = await db
      .select()
      .from(workOrders)
      .where(
        operationalRecordScopePredicate(
          context.tenantScope,
          workOrders.organizationId,
          workOrders.officeId,
        ),
      )
      .orderBy(workOrders.scheduledStartAt, workOrders.workOrderNumber);

    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function findWorkOrderById(
  db: OperationalDatabase,
  context: AuthorizationContext,
  idInput: unknown,
): Promise<OperationalRecordLookupResult<WorkOrderRecord>> {
  if (!hasPermission(context, "work_order.read")) {
    return forbidden();
  }

  const parsedId = parseRecordId(idInput);
  if (!parsedId.ok) {
    return parsedId.failure;
  }

  try {
    const [value] = await db
      .select()
      .from(workOrders)
      .where(
        and(
          operationalRecordScopePredicate(
            context.tenantScope,
            workOrders.organizationId,
            workOrders.officeId,
          ),
          eq(workOrders.id, parsedId.id),
        ),
      )
      .limit(1);

    return value ? { status: "found", value } : notFoundOrInaccessible();
  } catch {
    return persistenceFailure();
  }
}

export async function listDispatchAssignments(
  db: OperationalDatabase,
  context: AuthorizationContext,
): Promise<OperationalRecordListResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.read")) {
    return forbidden();
  }

  try {
    const values = await db
      .select()
      .from(dispatchAssignments)
      .where(
        operationalRecordScopePredicate(
          context.tenantScope,
          dispatchAssignments.organizationId,
          dispatchAssignments.officeId,
        ),
      )
      .orderBy(
        dispatchAssignments.assignmentStartAt,
        dispatchAssignments.sourceAssignmentId,
      );

    return { status: "ok", values };
  } catch {
    return persistenceFailure();
  }
}

export async function findDispatchAssignmentById(
  db: OperationalDatabase,
  context: AuthorizationContext,
  idInput: unknown,
): Promise<OperationalRecordLookupResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.read")) {
    return forbidden();
  }

  const parsedId = parseRecordId(idInput);
  if (!parsedId.ok) {
    return parsedId.failure;
  }

  try {
    const [value] = await db
      .select()
      .from(dispatchAssignments)
      .where(
        and(
          operationalRecordScopePredicate(
            context.tenantScope,
            dispatchAssignments.organizationId,
            dispatchAssignments.officeId,
          ),
          eq(dispatchAssignments.id, parsedId.id),
        ),
      )
      .limit(1);

    return value ? { status: "found", value } : notFoundOrInaccessible();
  } catch {
    return persistenceFailure();
  }
}

export async function createProject(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordCreateResult<ProjectRecord>> {
  if (!hasPermission(context, "project.manage")) {
    return forbidden();
  }

  const parsed = createProjectInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOrganization(transaction, context.membership.organizationId);

      const actorCheck = await checkCurrentActor(
        transaction,
        context,
        "project.manage",
        parsed.data.officeId,
      );
      const actorFailure = failureForActorCheck(actorCheck);
      if (actorFailure) {
        return actorFailure;
      }

      const [value] = await transaction
        .insert(projects)
        .values({
          ...parsed.data,
          organizationId: context.membership.organizationId,
        })
        .returning();

      return created(value, context, "project.created");
    });
  } catch (error) {
    return failureForDatabaseError(
      error,
      "projects_organization_source_unique",
      "project_source_already_exists",
      ["projects_office_organization_fk"],
    );
  }
}

export async function createTechnician(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordCreateResult<TechnicianRecord>> {
  if (!hasPermission(context, "technician.manage")) {
    return forbidden();
  }

  const parsed = createTechnicianInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOrganization(transaction, context.membership.organizationId);

      const actorCheck = await checkCurrentActor(
        transaction,
        context,
        "technician.manage",
        parsed.data.officeId,
      );
      const actorFailure = failureForActorCheck(actorCheck);
      if (actorFailure) {
        return actorFailure;
      }

      const [value] = await transaction
        .insert(technicians)
        .values({
          ...parsed.data,
          organizationId: context.membership.organizationId,
        })
        .returning();

      return created(value, context, "technician.created");
    });
  } catch (error) {
    return failureForDatabaseError(
      error,
      "technicians_organization_source_unique",
      "technician_source_already_exists",
      ["technicians_office_organization_fk"],
    );
  }
}

export async function createWorkOrder(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordCreateResult<WorkOrderRecord>> {
  if (!hasPermission(context, "work_order.manage")) {
    return forbidden();
  }

  const parsed = createWorkOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOrganization(transaction, context.membership.organizationId);

      const actorCheck = await checkCurrentActor(
        transaction,
        context,
        "work_order.manage",
        parsed.data.officeId,
      );
      const actorFailure = failureForActorCheck(actorCheck);
      if (actorFailure) {
        return actorFailure;
      }

      const [project] = await transaction
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, parsed.data.projectId),
            eq(projects.organizationId, context.membership.organizationId),
            eq(projects.officeId, parsed.data.officeId),
          ),
        )
        .limit(1);

      if (!project) {
        return notFoundOrInaccessible();
      }

      const [value] = await transaction
        .insert(workOrders)
        .values({
          ...parsed.data,
          organizationId: context.membership.organizationId,
        })
        .returning();

      return created(value, context, "work_order.created");
    });
  } catch (error) {
    return failureForDatabaseError(
      error,
      "work_orders_organization_source_unique",
      "work_order_source_already_exists",
      [
        "work_orders_office_organization_fk",
        "work_orders_project_organization_office_fk",
      ],
    );
  }
}

export async function createDispatchAssignment(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<OperationalRecordCreateResult<DispatchAssignmentRecord>> {
  if (!hasPermission(context, "dispatch_assignment.manage")) {
    return forbidden();
  }

  const parsed = createDispatchAssignmentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  try {
    return await db.transaction(async (transaction) => {
      await lockOrganization(transaction, context.membership.organizationId);

      const actorCheck = await checkCurrentActor(
        transaction,
        context,
        "dispatch_assignment.manage",
        parsed.data.officeId,
      );
      const actorFailure = failureForActorCheck(actorCheck);
      if (actorFailure) {
        return actorFailure;
      }

      const [workOrder] = await transaction
        .select({ id: workOrders.id })
        .from(workOrders)
        .where(
          and(
            eq(workOrders.id, parsed.data.workOrderId),
            eq(workOrders.organizationId, context.membership.organizationId),
            eq(workOrders.officeId, parsed.data.officeId),
          ),
        )
        .limit(1);
      const [technician] = await transaction
        .select({ id: technicians.id })
        .from(technicians)
        .where(
          and(
            eq(technicians.id, parsed.data.technicianId),
            eq(technicians.organizationId, context.membership.organizationId),
            eq(technicians.officeId, parsed.data.officeId),
          ),
        )
        .limit(1);

      if (!workOrder || !technician) {
        return notFoundOrInaccessible();
      }

      const [value] = await transaction
        .insert(dispatchAssignments)
        .values({
          ...parsed.data,
          organizationId: context.membership.organizationId,
          createdByUserId: context.user.id,
          updatedByUserId: context.user.id,
        })
        .returning();

      return created(value, context, "dispatch_assignment.created");
    });
  } catch (error) {
    return failureForDatabaseError(
      error,
      "dispatch_assignments_organization_source_unique",
      "dispatch_assignment_source_already_exists",
      [
        "dispatch_assignments_work_order_organization_office_fk",
        "dispatch_assignments_technician_organization_office_fk",
      ],
    );
  }
}

function parseRecordId(
  input: unknown,
):
  | { ok: true; id: string }
  | { ok: false; failure: OperationalRecordFailure } {
  const parsed = uuidInputSchema.safeParse(input);

  return parsed.success
    ? { ok: true, id: parsed.data }
    : {
        ok: false,
        failure: {
          status: "validation_error",
          issues: validationIssues(parsed.error),
        },
      };
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

async function checkCurrentActor(
  transaction: Transaction,
  context: AuthorizationContext,
  permission: Permission,
  officeId: string,
): Promise<CurrentActorCheck> {
  const [actor] = await transaction
    .select({
      role: organizationMemberships.role,
      membershipStatus: organizationMemberships.status,
      officeAccess: organizationMemberships.officeAccess,
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
    actor.organizationStatus !== "active" ||
    !permissionsForRole(actor.role).includes(permission)
  ) {
    return "forbidden";
  }

  if (actor.officeAccess === "all") {
    if (!roleMayUseOrganizationWideOfficeAccess(actor.role)) {
      return "forbidden";
    }

    const [office] = await transaction
      .select({ id: offices.id })
      .from(offices)
      .where(
        and(
          eq(offices.id, officeId),
          eq(offices.organizationId, context.membership.organizationId),
        ),
      )
      .limit(1);

    return office ? "allowed" : "office_inaccessible";
  }

  const [office] = await transaction
    .select({ id: offices.id })
    .from(officeAssignments)
    .innerJoin(offices, eq(officeAssignments.officeId, offices.id))
    .where(
      and(
        eq(
          officeAssignments.organizationMembershipId,
          context.membership.id,
        ),
        eq(
          officeAssignments.organizationId,
          context.membership.organizationId,
        ),
        eq(officeAssignments.officeId, officeId),
        eq(offices.organizationId, context.membership.organizationId),
      ),
    )
    .limit(1);

  return office ? "allowed" : "office_inaccessible";
}

function failureForActorCheck(
  check: CurrentActorCheck,
): OperationalRecordFailure | null {
  if (check === "forbidden") {
    return forbidden();
  }

  if (check === "office_inaccessible") {
    return notFoundOrInaccessible();
  }

  return null;
}

function created<T extends { id: string }>(
  value: T,
  context: AuthorizationContext,
  action: OperationalRecordMutationAction,
): OperationalRecordCreateResult<T> {
  return {
    status: "created",
    value,
    mutation: mutationMetadata(action, context, value.id),
  };
}

function mutationMetadata(
  action: OperationalRecordMutationAction,
  context: AuthorizationContext,
  subjectId: string,
): OperationalRecordMutationMetadata {
  return {
    mutationId: randomUUID(),
    action,
    actorUserId: context.user.id,
    organizationId: context.membership.organizationId,
    subjectId,
    occurredAt: new Date().toISOString(),
  };
}

function failureForDatabaseError(
  error: unknown,
  uniqueConstraint: string,
  conflictReason: OperationalRecordConflictReason,
  inaccessibleForeignKeys: readonly string[],
): OperationalRecordFailure {
  const info = getPostgresErrorInfo(error);

  if (info.code === "23505" && info.constraint === uniqueConstraint) {
    return { status: "conflict", reason: conflictReason };
  }

  if (
    info.code === "23503" &&
    info.constraint !== undefined &&
    inaccessibleForeignKeys.includes(info.constraint)
  ) {
    return notFoundOrInaccessible();
  }

  return persistenceFailure();
}
