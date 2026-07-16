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
import { organizationMemberships } from "./organization-memberships";

export const technicianStatusValues = ["active", "inactive", "on_leave"] as const;
export const technicianStatus = pgEnum("technician_status", technicianStatusValues);

export const technicians = pgTable(
  "technicians",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    sourceSystem: text("source_system").notNull(),
    sourceTechnicianId: text("source_technician_id").notNull(),
    displayName: text("display_name").notNull(),
    operationalRole: text("operational_role"),
    workEmail: text("work_email"),
    workPhone: text("work_phone"),
    organizationMembershipId: uuid("organization_membership_id"),
    homeOfficeId: uuid("home_office_id").notNull(),
    status: technicianStatus("status").notNull().default("active"),
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
      name: "technicians_office_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.organizationMembershipId, table.organizationId],
      foreignColumns: [
        organizationMemberships.id,
        organizationMemberships.organizationId,
      ],
      name: "technicians_membership_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.homeOfficeId, table.organizationId],
      foreignColumns: [offices.id, offices.organizationId],
      name: "technicians_home_office_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("technicians_id_organization_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("technicians_id_organization_office_unique").on(
      table.id,
      table.organizationId,
      table.officeId,
    ),
    unique("technicians_organization_source_unique").on(
      table.organizationId,
      table.sourceSystem,
      table.sourceTechnicianId,
    ),
    unique("technicians_organization_membership_unique").on(
      table.organizationId,
      table.organizationMembershipId,
    ),
    index("technicians_organization_office_active_idx").on(
      table.organizationId,
      table.officeId,
      table.isActive,
    ),
    index("technicians_organization_office_name_idx").on(
      table.organizationId,
      table.officeId,
      table.displayName,
    ),
    index("technicians_organization_home_office_status_idx").on(
      table.organizationId,
      table.homeOfficeId,
      table.status,
    ),
    check(
      "technicians_source_system_not_blank_check",
      sql`${table.sourceSystem} ~ '[^[:space:]]'`,
    ),
    check(
      "technicians_source_system_format_check",
      sql`${table.sourceSystem} = lower(trim(${table.sourceSystem})) and ${table.sourceSystem} ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'`,
    ),
    check(
      "technicians_source_technician_id_not_blank_check",
      sql`${table.sourceTechnicianId} ~ '[^[:space:]]'`,
    ),
    check(
      "technicians_display_name_not_blank_check",
      sql`${table.displayName} ~ '[^[:space:]]'`,
    ),
    check(
      "technicians_operational_role_not_blank_check",
      sql`${table.operationalRole} is null or ${table.operationalRole} ~ '[^[:space:]]'`,
    ),
    check(
      "technicians_work_email_not_blank_check",
      sql`${table.workEmail} is null or ${table.workEmail} ~ '[^[:space:]]'`,
    ),
    check(
      "technicians_work_phone_not_blank_check",
      sql`${table.workPhone} is null or ${table.workPhone} ~ '[^[:space:]]'`,
    ),
    check("technicians_version_positive_check", sql`${table.version} > 0`),
  ],
);

export type TechnicianRecord = typeof technicians.$inferSelect;
export type TechnicianStatus = (typeof technicianStatusValues)[number];
