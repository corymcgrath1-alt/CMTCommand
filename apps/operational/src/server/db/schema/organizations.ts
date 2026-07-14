import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const organizationStatusValues = ["active", "inactive"] as const;

export type OrganizationStatus = (typeof organizationStatusValues)[number];

export const organizationStatus = pgEnum(
  "organization_status",
  organizationStatusValues,
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: organizationStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("organizations_slug_unique").on(table.slug),
    check(
      "organizations_slug_format_check",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check("organizations_name_not_blank_check", sql`length(trim(${table.name})) > 0`),
  ],
);

export type OrganizationRecord = typeof organizations.$inferSelect;
