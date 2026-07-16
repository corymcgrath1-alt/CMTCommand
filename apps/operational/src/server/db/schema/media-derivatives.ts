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
import { mediaAssets } from "./media-assets";

export const mediaDerivativeTypeValues = ["preview", "thumbnail"] as const;

export const mediaDerivativeType = pgEnum(
  "media_derivative_type",
  mediaDerivativeTypeValues,
);

export const mediaDerivatives = pgTable(
  "media_derivatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    mediaAssetId: uuid("media_asset_id").notNull(),
    derivativeType: mediaDerivativeType("derivative_type").notNull(),
    mediaType: text("media_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    storageProvider: text("storage_provider").notNull(),
    storageBucket: text("storage_bucket").notNull(),
    storageKey: text("storage_key").notNull(),
    processorName: text("processor_name").notNull(),
    processorVersion: text("processor_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.mediaAssetId, table.organizationId, table.officeId],
      foreignColumns: [
        mediaAssets.id,
        mediaAssets.organizationId,
        mediaAssets.officeId,
      ],
      name: "media_derivatives_asset_scope_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("media_derivatives_asset_type_unique").on(
      table.mediaAssetId,
      table.derivativeType,
    ),
    unique("media_derivatives_storage_key_unique").on(
      table.storageProvider,
      table.storageBucket,
      table.storageKey,
    ),
    index("media_derivatives_asset_idx").on(
      table.organizationId,
      table.officeId,
      table.mediaAssetId,
    ),
    check(
      "media_derivatives_media_type_check",
      sql`${table.mediaType} ~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$' and char_length(${table.mediaType}) <= 120`,
    ),
    check(
      "media_derivatives_size_check",
      sql`${table.byteSize} > 0 and ${table.byteSize} <= 52428800`,
    ),
    check(
      "media_derivatives_sha256_check",
      sql`${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "media_derivatives_storage_reference_check",
      sql`${table.storageProvider} = 'local-test' and ${table.storageBucket} ~ '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' and ${table.storageKey} ~ '^[a-z0-9][a-z0-9._/-]*$' and char_length(${table.storageKey}) <= 512 and position('..' in ${table.storageKey}) = 0`,
    ),
    check(
      "media_derivatives_processor_name_check",
      sql`${table.processorName} ~ '[^[:space:]]' and char_length(${table.processorName}) <= 80`,
    ),
    check(
      "media_derivatives_processor_version_check",
      sql`${table.processorVersion} ~ '[^[:space:]]' and char_length(${table.processorVersion}) <= 40`,
    ),
  ],
);

export type MediaDerivativeRecord = typeof mediaDerivatives.$inferSelect;
export type MediaDerivativeType = (typeof mediaDerivativeTypeValues)[number];
