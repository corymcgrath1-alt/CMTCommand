import { and, eq } from "drizzle-orm";
import type { AuthorizationContext } from "@/server/auth/types";
import type { OperationalDatabase } from "@/server/db/client";
import {
  auditEvents,
  organizationMemberships,
  organizations,
  users,
  type AuditEventRecord,
} from "@/server/db/schema";
import type { OperationalTransaction } from "@/server/operational-records/mutation-context";
import { auditActionCategory } from "./taxonomy";
import {
  auditEventDetailsSchema,
  type AuditEventDetails,
} from "./validation";

export class AuditWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditWriteError";
  }
}

export async function appendAuditEvent(
  transaction: OperationalTransaction,
  context: AuthorizationContext,
  input: AuditEventDetails,
): Promise<AuditEventRecord> {
  const details = auditEventDetailsSchema.parse(input);
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
        eq(organizationMemberships.organizationId, context.membership.organizationId),
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
    throw new AuditWriteError("audit_actor_not_active");
  }

  const [event] = await transaction
    .insert(auditEvents)
    .values({
      organizationId: context.membership.organizationId,
      officeId: details.officeId ?? null,
      actorUserId: context.user.id,
      actorMembershipId: context.membership.id,
      actorRole: actor.role,
      category: auditActionCategory[details.action],
      action: details.action,
      outcome: details.outcome,
      targetType: details.target.type,
      targetId: details.target.id,
      secondaryTargetType: details.secondaryTarget?.type ?? null,
      secondaryTargetId: details.secondaryTarget?.id ?? null,
      requestId: details.requestContext.requestId,
      correlationId: details.requestContext.correlationId,
      transactionId: details.requestContext.transactionId,
      reason: details.reason ?? null,
      previousState: details.previousState ?? null,
      resultingState: details.resultingState ?? null,
      metadata: details.metadata ?? null,
    })
    .returning();

  if (!event) throw new AuditWriteError("audit_insert_failed");
  return event;
}

export async function appendDeniedAuditEvent(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: AuditEventDetails,
): Promise<boolean> {
  try {
    await db.transaction(async (transaction) => {
      await appendAuditEvent(transaction, context, { ...input, outcome: "denied" });
    });
    return true;
  } catch {
    return false;
  }
}
