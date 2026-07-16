import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/server/auth/permissions";
import type { AuthorizationContext } from "@/server/auth/types";
import type { OperationalDatabase } from "@/server/db/client";
import { auditEvents, offices, users } from "@/server/db/schema";
import { uuidInputSchema, validationIssues } from "@/server/tenancy/validation";
import {
  auditActionCategory,
  auditActionValues,
  auditCategoryValues,
  auditOutcomeValues,
  auditTargetTypeValues,
  securityAuditCategories,
  type AuditAction,
  type AuditCategory,
  type AuditOutcome,
  type AuditTargetType,
} from "./taxonomy";
import { safeAuditMetadataSchema, safeAuditStateSchema } from "./validation";

const isoDateTimeSchema = z
  .string()
  .trim()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const auditQueryInputSchema = z
  .object({
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
    category: z.enum(auditCategoryValues).optional(),
    action: z.enum(auditActionValues).optional(),
    outcome: z.enum(auditOutcomeValues).optional(),
    actorId: uuidInputSchema.optional(),
    targetType: z.enum(auditTargetTypeValues).optional(),
    targetId: uuidInputSchema.optional(),
    officeId: uuidInputSchema.optional(),
    requestId: uuidInputSchema.optional(),
    correlationId: uuidInputSchema.optional(),
    cursorOccurredAt: isoDateTimeSchema.optional(),
    cursorId: uuidInputSchema.optional(),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .superRefine((value, context) => {
    if ((value.cursorOccurredAt && !value.cursorId) || (!value.cursorOccurredAt && value.cursorId)) {
      context.addIssue({ code: "custom", path: ["cursorId"], message: "both cursor fields are required" });
    }
    if ((value.targetType && !value.targetId) || (!value.targetType && value.targetId)) {
      context.addIssue({ code: "custom", path: ["targetId"], message: "both target fields are required" });
    }
    if (value.from && value.to && value.to.getTime() < value.from.getTime()) {
      context.addIssue({ code: "custom", path: ["to"], message: "to must be after from" });
    }
    if (
      value.from &&
      value.to &&
      value.to.getTime() - value.from.getTime() > 90 * 24 * 60 * 60 * 1000
    ) {
      context.addIssue({ code: "custom", path: ["from"], message: "date range cannot exceed 90 days" });
    }
  });

export type AuditQueryInput = z.input<typeof auditQueryInputSchema>;

export type AuditListItem = {
  id: string;
  organizationId: string;
  officeId: string | null;
  officeCode: string | null;
  officeName: string | null;
  timeZone: string;
  actorUserId: string;
  actorMembershipId: string | null;
  actorDisplayName: string;
  actorRole: string;
  category: AuditCategory;
  action: AuditAction;
  outcome: AuditOutcome;
  targetType: AuditTargetType;
  targetId: string;
  secondaryTargetType: AuditTargetType | null;
  secondaryTargetId: string | null;
  requestId: string | null;
  correlationId: string | null;
  reason: string | null;
  previousState: Record<string, unknown> | null;
  resultingState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
};

export type AuditListResult =
  | {
      status: "ok";
      values: AuditListItem[];
      nextCursor: { occurredAt: string; id: string } | null;
    }
  | { status: "validation_error"; issues: string[] }
  | { status: "forbidden"; reason: "missing_permission" }
  | { status: "not_found_or_inaccessible" }
  | { status: "persistence_error"; reason: "database_error" };

export async function listAuditEvents(
  db: OperationalDatabase,
  context: AuthorizationContext,
  input: unknown,
): Promise<AuditListResult> {
  if (!hasPermission(context, "audit.read")) {
    return { status: "forbidden", reason: "missing_permission" };
  }

  const parsed = auditQueryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "validation_error", issues: validationIssues(parsed.error) };
  }

  const now = new Date();
  const from = parsed.data.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const to = parsed.data.to ?? now;
  if (to.getTime() - from.getTime() > 90 * 24 * 60 * 60 * 1000) {
    return { status: "validation_error", issues: ["date range cannot exceed 90 days"] };
  }

  const requestedCategory = parsed.data.category ??
    (parsed.data.action ? auditActionCategory[parsed.data.action] : undefined);
  const requestsSecurity =
    requestedCategory !== undefined &&
    securityAuditCategories.includes(requestedCategory as (typeof securityAuditCategories)[number]);
  const mayReadSecurity = hasPermission(context, "audit.read_security");
  if (requestsSecurity && !mayReadSecurity) {
    return { status: "forbidden", reason: "missing_permission" };
  }

  const predicates: SQL[] = [
    eq(auditEvents.organizationId, context.membership.organizationId),
    gte(auditEvents.occurredAt, from),
    lte(auditEvents.occurredAt, to),
  ];

  if (!mayReadSecurity) {
    predicates.push(notInArray(auditEvents.category, [...securityAuditCategories]));
  }

  const restrictedOfficeIds =
    context.membership.role !== "organization_admin" &&
    context.tenantScope.officeAccess === "restricted"
      ? context.tenantScope.officeIds
      : null;
  if (restrictedOfficeIds) {
    if (restrictedOfficeIds.length === 0) {
      return { status: "ok", values: [], nextCursor: null };
    }
    predicates.push(
      or(
        isNull(auditEvents.officeId),
        inArray(auditEvents.officeId, restrictedOfficeIds),
      ) as SQL,
    );
  }

  if (parsed.data.officeId) {
    if (
      restrictedOfficeIds &&
      !restrictedOfficeIds.includes(parsed.data.officeId)
    ) {
      return { status: "not_found_or_inaccessible" };
    }
    predicates.push(eq(auditEvents.officeId, parsed.data.officeId));
  }
  if (parsed.data.category) predicates.push(eq(auditEvents.category, parsed.data.category));
  if (parsed.data.action) predicates.push(eq(auditEvents.action, parsed.data.action));
  if (parsed.data.outcome) predicates.push(eq(auditEvents.outcome, parsed.data.outcome));
  if (parsed.data.actorId) predicates.push(eq(auditEvents.actorUserId, parsed.data.actorId));
  if (parsed.data.targetType && parsed.data.targetId) {
    predicates.push(eq(auditEvents.targetType, parsed.data.targetType));
    predicates.push(eq(auditEvents.targetId, parsed.data.targetId));
  }
  if (parsed.data.requestId) predicates.push(eq(auditEvents.requestId, parsed.data.requestId));
  if (parsed.data.correlationId) {
    predicates.push(eq(auditEvents.correlationId, parsed.data.correlationId));
  }
  if (parsed.data.cursorOccurredAt && parsed.data.cursorId) {
    const cursor = or(
      lt(auditEvents.occurredAt, parsed.data.cursorOccurredAt),
      and(
        eq(auditEvents.occurredAt, parsed.data.cursorOccurredAt),
        lt(auditEvents.id, parsed.data.cursorId),
      ),
    );
    if (cursor) predicates.push(cursor);
  }

  try {
    const rows = await db
      .select({
        event: auditEvents,
        actorDisplayName: users.displayName,
        officeCode: offices.code,
        officeName: offices.name,
        officeTimeZone: offices.timeZone,
      })
      .from(auditEvents)
      .innerJoin(users, eq(auditEvents.actorUserId, users.id))
      .leftJoin(
        offices,
        and(
          eq(auditEvents.officeId, offices.id),
          eq(auditEvents.organizationId, offices.organizationId),
        ),
      )
      .where(and(...predicates))
      .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
      .limit(parsed.data.pageSize + 1);

    const hasMore = rows.length > parsed.data.pageSize;
    const pageRows = hasMore ? rows.slice(0, parsed.data.pageSize) : rows;
    const values = pageRows.map(({ event, actorDisplayName, officeCode, officeName, officeTimeZone }) => ({
      id: event.id,
      organizationId: event.organizationId,
      officeId: event.officeId,
      officeCode,
      officeName,
      timeZone: officeTimeZone ?? "UTC",
      actorUserId: event.actorUserId,
      actorMembershipId: event.actorMembershipId,
      actorDisplayName,
      actorRole: event.actorRole,
      category: event.category,
      action: event.action,
      outcome: event.outcome,
      targetType: event.targetType,
      targetId: event.targetId,
      secondaryTargetType: event.secondaryTargetType,
      secondaryTargetId: event.secondaryTargetId,
      requestId: event.requestId,
      correlationId: event.correlationId,
      reason: event.reason,
      previousState: safeAuditStateSchema.safeParse(event.previousState).success
        ? event.previousState
        : null,
      resultingState: safeAuditStateSchema.safeParse(event.resultingState).success
        ? event.resultingState
        : null,
      metadata: safeAuditMetadataSchema.safeParse(event.metadata).success
        ? event.metadata
        : null,
      occurredAt: event.occurredAt.toISOString(),
    }));
    const last = values.at(-1);
    return {
      status: "ok",
      values,
      nextCursor: hasMore && last ? { occurredAt: last.occurredAt, id: last.id } : null,
    };
  } catch {
    return { status: "persistence_error", reason: "database_error" };
  }
}
