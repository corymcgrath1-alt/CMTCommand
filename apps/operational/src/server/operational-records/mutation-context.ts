import { and, eq, sql } from "drizzle-orm";
import type { OperationalDatabase } from "@/server/db/client";
import {
  officeAssignments,
  offices,
  organizationMemberships,
  organizations,
  users,
} from "@/server/db/schema";
import {
  permissionsForRole,
  roleMayUseOrganizationWideOfficeAccess,
  type Permission,
} from "@/server/auth/permissions";
import type { AuthorizationContext } from "@/server/auth/types";
import {
  forbidden,
  notFoundOrInaccessible,
  type OperationalRecordFailure,
} from "./results";

export type OperationalTransaction = Parameters<
  Parameters<OperationalDatabase["transaction"]>[0]
>[0];

type CurrentActorCheck = "allowed" | "forbidden" | "office_inaccessible";

export async function lockOperationalOrganization(
  transaction: OperationalTransaction,
  organizationId: string,
): Promise<void> {
  await transaction.execute(sql`
    select ${organizations.id}
    from ${organizations}
    where ${organizations.id} = ${organizationId}
    for update
  `);
}

export async function revalidateOperationalActor(
  transaction: OperationalTransaction,
  context: AuthorizationContext,
  permission: Permission,
  officeId: string,
): Promise<OperationalRecordFailure | null> {
  const check = await checkCurrentActor(transaction, context, permission, officeId);

  if (check === "forbidden") {
    return forbidden();
  }

  if (check === "office_inaccessible") {
    return notFoundOrInaccessible();
  }

  return null;
}

async function checkCurrentActor(
  transaction: OperationalTransaction,
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
        eq(officeAssignments.organizationMembershipId, context.membership.id),
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
