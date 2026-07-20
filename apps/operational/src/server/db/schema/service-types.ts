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
import { offices } from "./offices";
import { users } from "./users";

export const serviceTypeCategoryValues = [
  "concrete",
  "soils",
  "masonry",
  "reinforcing_steel",
  "structural_steel",
  "fireproofing",
  "asphalt",
  "other",
] as const;

export const serviceTypeStatusValues = ["active", "inactive", "archived"] as const;

export const serviceTypeCategory = pgEnum(
  "service_type_category",
  serviceTypeCategoryValues,
);
export const serviceTypeStatus = pgEnum(
  "service_type_status",
  serviceTypeStatusValues,
);

export const serviceTypes = pgTable(
  "service_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id"),
    key: text("key").notNull(),
    name: text("name").notNull(),
    category: serviceTypeCategory("category").notNull(),
    status: serviceTypeStatus("status").notNull().default("active"),
    description: text("description"),
    version: integer("version").notNull().default(1),
    createdByUserId: uuid("created_by_user_id").notNull(),
    updatedByUserId: uuid("updated_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.officeId, table.organizationId],
      foreignColumns: [offices.id, offices.organizationId],
      name: "service_types_office_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [users.id],
      name: "service_types_created_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedByUserId],
      foreignColumns: [users.id],
      name: "service_types_updated_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("service_types_id_organization_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("service_types_organization_key_unique").on(
      table.organizationId,
      table.key,
    ),
    index("service_types_organization_status_name_idx").on(
      table.organizationId,
      table.status,
      table.name,
    ),
    check(
      "service_types_key_format_check",
      sql`${table.key} = lower(trim(${table.key})) and ${table.key} ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'`,
    ),
    check("service_types_name_not_blank_check", sql`${table.name} ~ '[^[:space:]]'`),
    check(
      "service_types_description_not_blank_check",
      sql`${table.description} is null or ${table.description} ~ '[^[:space:]]'`,
    ),
    check("service_types_version_positive_check", sql`${table.version} > 0`),
  ],
);

export type ServiceTypeRecord = typeof serviceTypes.$inferSelect;
export type ServiceTypeCategory = (typeof serviceTypeCategoryValues)[number];
export type ServiceTypeStatus = (typeof serviceTypeStatusValues)[number];
