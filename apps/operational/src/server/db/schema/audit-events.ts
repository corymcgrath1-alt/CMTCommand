import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  auditActionValues,
  auditCategoryValues,
  auditOutcomeValues,
  auditTargetTypeValues,
} from "@/server/audit/taxonomy";
import { offices } from "./offices";
import {
  organizationMemberships,
  organizationRole,
} from "./organization-memberships";
import { organizations } from "./organizations";
import { users } from "./users";

export const auditCategory = pgEnum("audit_category", auditCategoryValues);
export const auditAction = pgEnum("audit_action", auditActionValues);
export const auditOutcome = pgEnum("audit_outcome", auditOutcomeValues);
export const auditTargetType = pgEnum("audit_target_type", auditTargetTypeValues);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id"),
    actorUserId: uuid("actor_user_id").notNull(),
    actorMembershipId: uuid("actor_membership_id"),
    actorRole: organizationRole("actor_role").notNull(),
    category: auditCategory("category").notNull(),
    action: auditAction("action").notNull(),
    outcome: auditOutcome("outcome").notNull(),
    targetType: auditTargetType("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    secondaryTargetType: auditTargetType("secondary_target_type"),
    secondaryTargetId: uuid("secondary_target_id"),
    requestId: uuid("request_id"),
    correlationId: uuid("correlation_id"),
    transactionId: uuid("transaction_id"),
    reason: text("reason"),
    previousState: jsonb("previous_state").$type<Record<string, unknown>>(),
    resultingState: jsonb("resulting_state").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "audit_events_organization_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.officeId, table.organizationId],
      foreignColumns: [offices.id, offices.organizationId],
      name: "audit_events_office_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [users.id],
      name: "audit_events_actor_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [
        table.actorMembershipId,
        table.organizationId,
        table.actorUserId,
      ],
      foreignColumns: [
        organizationMemberships.id,
        organizationMemberships.organizationId,
        organizationMemberships.userId,
      ],
      name: "audit_events_actor_membership_organization_user_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    index("audit_events_organization_occurred_id_idx").on(
      table.organizationId,
      table.occurredAt,
      table.id,
    ),
    index("audit_events_organization_office_occurred_idx").on(
      table.organizationId,
      table.officeId,
      table.occurredAt,
    ),
    index("audit_events_organization_actor_occurred_idx").on(
      table.organizationId,
      table.actorUserId,
      table.occurredAt,
    ),
    index("audit_events_organization_target_occurred_idx").on(
      table.organizationId,
      table.targetType,
      table.targetId,
      table.occurredAt,
    ),
    index("audit_events_organization_taxonomy_occurred_idx").on(
      table.organizationId,
      table.category,
      table.action,
      table.outcome,
      table.occurredAt,
    ),
    index("audit_events_organization_request_idx").on(
      table.organizationId,
      table.requestId,
    ),
    index("audit_events_organization_correlation_idx").on(
      table.organizationId,
      table.correlationId,
    ),
    check(
      "audit_events_secondary_target_pair_check",
      sql`(${table.secondaryTargetType} is null and ${table.secondaryTargetId} is null) or (${table.secondaryTargetType} is not null and ${table.secondaryTargetId} is not null)`,
    ),
    check(
      "audit_events_reason_check",
      sql`${table.reason} is null or (${table.reason} ~ '[^[:space:]]' and char_length(${table.reason}) <= 1000)`,
    ),
    check(
      "audit_events_previous_state_shape_size_check",
      sql`${table.previousState} is null or (jsonb_typeof(${table.previousState}) = 'object' and octet_length(${table.previousState}::text) <= 4096)`,
    ),
    check(
      "audit_events_resulting_state_shape_size_check",
      sql`${table.resultingState} is null or (jsonb_typeof(${table.resultingState}) = 'object' and octet_length(${table.resultingState}::text) <= 4096)`,
    ),
    check(
      "audit_events_metadata_shape_size_check",
      sql`${table.metadata} is null or (jsonb_typeof(${table.metadata}) = 'object' and octet_length(${table.metadata}::text) <= 8192 and not (${table.metadata} ?| array['password','passphrase','secret','token','cookie','authorization','credential','transcript','file_content','media_content']))`,
    ),
  ],
);

export type AuditEventRecord = typeof auditEvents.$inferSelect;
