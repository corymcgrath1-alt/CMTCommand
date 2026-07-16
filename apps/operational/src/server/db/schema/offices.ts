import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const officeStatusValues = ["active", "inactive"] as const;

export type OfficeStatus = (typeof officeStatusValues)[number];

export const officeStatus = pgEnum("office_status", officeStatusValues);

export const offices = pgTable(
  "offices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    timeZone: text("time_zone").notNull(),
    status: officeStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "offices_organization_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("offices_id_organization_unique").on(table.id, table.organizationId),
    unique("offices_organization_code_unique").on(table.organizationId, table.code),
    check(
      "offices_code_format_check",
      sql`${table.code} ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'`,
    ),
    check("offices_name_not_blank_check", sql`length(trim(${table.name})) > 0`),
    check("offices_time_zone_not_blank_check", sql`length(trim(${table.timeZone})) > 0`),
  ],
);

export type OfficeRecord = typeof offices.$inferSelect;
