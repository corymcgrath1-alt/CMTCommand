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
import { mediaAssetCategory, mediaUploadSessions } from "./media-upload-sessions";
import { organizationMemberships } from "./organization-memberships";
import { users } from "./users";

export const mediaAssetStatusValues = [
  "ready",
  "processing_failed",
  "deleted_under_policy",
] as const;

export const mediaAssetStatus = pgEnum(
  "media_asset_status",
  mediaAssetStatusValues,
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    dispatchAssignmentId: uuid("dispatch_assignment_id").notNull(),
    uploadSessionId: uuid("upload_session_id").notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").notNull(),
    uploadedByMembershipId: uuid("uploaded_by_membership_id").notNull(),
    category: mediaAssetCategory("category").notNull(),
    originalFilename: text("original_filename").notNull(),
    detectedMediaType: text("detected_media_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    storageProvider: text("storage_provider").notNull(),
    storageBucket: text("storage_bucket").notNull(),
    storageKey: text("storage_key").notNull(),
    status: mediaAssetStatus("status").notNull().default("ready"),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
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
      name: "media_assets_assignment_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uploadSessionId],
      foreignColumns: [mediaUploadSessions.id],
      name: "media_assets_upload_session_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uploadedByUserId],
      foreignColumns: [users.id],
      name: "media_assets_uploaded_by_user_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [
        table.uploadedByMembershipId,
        table.organizationId,
        table.uploadedByUserId,
      ],
      foreignColumns: [
        organizationMemberships.id,
        organizationMemberships.organizationId,
        organizationMemberships.userId,
      ],
      name: "media_assets_membership_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("media_assets_upload_session_unique").on(table.uploadSessionId),
    unique("media_assets_assignment_hash_size_unique").on(
      table.organizationId,
      table.dispatchAssignmentId,
      table.sha256,
      table.byteSize,
    ),
    unique("media_assets_storage_key_unique").on(
      table.storageProvider,
      table.storageBucket,
      table.storageKey,
    ),
    unique("media_assets_id_organization_office_unique").on(
      table.id,
      table.organizationId,
      table.officeId,
    ),
    index("media_assets_assignment_created_idx").on(
      table.organizationId,
      table.officeId,
      table.dispatchAssignmentId,
      table.createdAt,
    ),
    index("media_assets_uploader_idx").on(
      table.organizationId,
      table.uploadedByUserId,
      table.createdAt,
    ),
    check(
      "media_assets_filename_check",
      sql`${table.originalFilename} ~ '[^[:space:]]' and char_length(${table.originalFilename}) <= 180`,
    ),
    check(
      "media_assets_detected_type_check",
      sql`${table.detectedMediaType} ~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$' and char_length(${table.detectedMediaType}) <= 120`,
    ),
    check(
      "media_assets_size_check",
      sql`${table.byteSize} > 0 and ${table.byteSize} <= 52428800`,
    ),
    check(
      "media_assets_sha256_check",
      sql`${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "media_assets_storage_reference_check",
      sql`${table.storageProvider} = 'local-test' and ${table.storageBucket} ~ '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' and ${table.storageKey} ~ '^[a-z0-9][a-z0-9._/-]*$' and char_length(${table.storageKey}) <= 512 and position('..' in ${table.storageKey}) = 0`,
    ),
  ],
);

export type MediaAssetRecord = typeof mediaAssets.$inferSelect;
export type MediaAssetStatus = (typeof mediaAssetStatusValues)[number];
