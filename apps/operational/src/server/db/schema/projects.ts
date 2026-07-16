import { sql } from "drizzle-orm";
import {
  boolean,
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

export const projectStatusValues = ["active", "inactive", "archived"] as const;
export const projectStatus = pgEnum("project_status", projectStatusValues);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    sourceSystem: text("source_system").notNull(),
    sourceProjectId: text("source_project_id").notNull(),
    projectNumber: text("project_number").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    status: projectStatus("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
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
      name: "projects_office_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("projects_id_organization_office_unique").on(
      table.id,
      table.organizationId,
      table.officeId,
    ),
    unique("projects_organization_source_unique").on(
      table.organizationId,
      table.sourceSystem,
      table.sourceProjectId,
    ),
    index("projects_organization_office_active_idx").on(
      table.organizationId,
      table.officeId,
      table.isActive,
    ),
    index("projects_organization_office_number_idx").on(
      table.organizationId,
      table.officeId,
      table.projectNumber,
    ),
    check(
      "projects_source_system_not_blank_check",
      sql`${table.sourceSystem} ~ '[^[:space:]]'`,
    ),
    check(
      "projects_source_system_format_check",
      sql`${table.sourceSystem} = lower(trim(${table.sourceSystem})) and ${table.sourceSystem} ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'`,
    ),
    check(
      "projects_source_project_id_not_blank_check",
      sql`${table.sourceProjectId} ~ '[^[:space:]]'`,
    ),
    check(
      "projects_project_number_not_blank_check",
      sql`${table.projectNumber} ~ '[^[:space:]]'`,
    ),
    check("projects_name_not_blank_check", sql`${table.name} ~ '[^[:space:]]'`),
    check(
      "projects_address_not_blank_check",
      sql`${table.address} is null or ${table.address} ~ '[^[:space:]]'`,
    ),
    check("projects_version_positive_check", sql`${table.version} > 0`),
  ],
);

export type ProjectRecord = typeof projects.$inferSelect;
export type ProjectStatus = (typeof projectStatusValues)[number];
