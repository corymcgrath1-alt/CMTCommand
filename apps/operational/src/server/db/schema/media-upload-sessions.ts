import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { dispatchAssignments } from "./dispatch-assignments";
import {
  organizationMemberships,
} from "./organization-memberships";
import { users } from "./users";

export const mediaAssetCategoryValues = [
  "general_photo",
  "truck_ticket",
  "test_result",
  "observation",
  "voice_note",
  "video_summary",
  "other",
] as const;

export const mediaUploadStatusValues = [
  "pending_upload",
  "completed",
  "failed",
] as const;

export const mediaAssetCategory = pgEnum(
  "media_asset_category",
  mediaAssetCategoryValues,
);
export const mediaUploadStatus = pgEnum(
  "media_upload_status",
  mediaUploadStatusValues,
);

export const mediaUploadSessions = pgTable(
  "media_upload_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    dispatchAssignmentId: uuid("dispatch_assignment_id").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdByMembershipId: uuid("created_by_membership_id").notNull(),
    category: mediaAssetCategory("category").notNull(),
    originalFilename: text("original_filename").notNull(),
    declaredMediaType: text("declared_media_type").notNull(),
    expectedByteSize: integer("expected_byte_size").notNull(),
    expectedSha256: text("expected_sha256").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    storageProvider: text("storage_provider").notNull(),
    storageBucket: text("storage_bucket").notNull(),
    storageKey: text("storage_key").notNull(),
    status: mediaUploadStatus("status").notNull().default("pending_upload"),
    completedMediaAssetId: uuid("completed_media_asset_id"),
    duplicateOfMediaAssetId: uuid("duplicate_of_media_asset_id"),
    failureReason: text("failure_reason"),
    uploadExpiresAt: timestamp("upload_expires_at", {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [
        table.dispatchAssignmentId,
        table.organizationId,
        table.officeId,
      ],
      foreignColumns: [
        dispatchAssignments.id,
        dispatchAssignments.organizationId,
        dispatchAssignments.officeId,
      ],
      name: "media_upload_sessions_assignment_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [users.id],
      name: "media_upload_sessions_created_by_user_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [
        table.createdByMembershipId,
        table.organizationId,
        table.createdByUserId,
      ],
      foreignColumns: [
        organizationMemberships.id,
        organizationMemberships.organizationId,
        organizationMemberships.userId,
      ],
      name: "media_upload_sessions_membership_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("media_upload_sessions_actor_idempotency_unique").on(
      table.organizationId,
      table.dispatchAssignmentId,
      table.createdByUserId,
      table.idempotencyKey,
    ),
    unique("media_upload_sessions_storage_key_unique").on(
      table.storageProvider,
      table.storageBucket,
      table.storageKey,
    ),
    index("media_upload_sessions_assignment_idx").on(
      table.organizationId,
      table.officeId,
      table.dispatchAssignmentId,
      table.createdAt,
    ),
    index("media_upload_sessions_actor_idx").on(
      table.organizationId,
      table.createdByUserId,
      table.createdAt,
    ),
    check(
      "media_upload_sessions_filename_check",
      sql`${table.originalFilename} ~ '[^[:space:]]' and char_length(${table.originalFilename}) <= 180`,
    ),
    check(
      "media_upload_sessions_declared_type_check",
      sql`${table.declaredMediaType} ~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$' and char_length(${table.declaredMediaType}) <= 120`,
    ),
    check(
      "media_upload_sessions_expected_size_check",
      sql`${table.expectedByteSize} > 0 and ${table.expectedByteSize} <= 52428800`,
    ),
    check(
      "media_upload_sessions_expected_sha256_check",
      sql`${table.expectedSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "media_upload_sessions_idempotency_key_check",
      sql`${table.idempotencyKey} ~ '^[A-Za-z0-9._:-]{8,120}$'`,
    ),
    check(
      "media_upload_sessions_storage_reference_check",
      sql`${table.storageProvider} = 'local-test' and ${table.storageBucket} ~ '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' and ${table.storageKey} ~ '^[a-z0-9][a-z0-9._/-]*$' and char_length(${table.storageKey}) <= 512 and position('..' in ${table.storageKey}) = 0`,
    ),
    check(
      "media_upload_sessions_status_completion_check",
      sql`(${table.status} = 'completed' and ${table.completedMediaAssetId} is not null and ${table.failureReason} is null) or (${table.status} = 'failed' and ${table.completedMediaAssetId} is null and ${table.failureReason} ~ '[^[:space:]]') or (${table.status} = 'pending_upload' and ${table.completedMediaAssetId} is null and ${table.duplicateOfMediaAssetId} is null and ${table.failureReason} is null)`,
    ),
  ],
);

export type MediaUploadSessionRecord =
  typeof mediaUploadSessions.$inferSelect;
export type MediaAssetCategory = (typeof mediaAssetCategoryValues)[number];
export type MediaUploadStatus = (typeof mediaUploadStatusValues)[number];
