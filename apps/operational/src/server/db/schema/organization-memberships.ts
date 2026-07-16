import {
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const organizationRoleValues = [
  "organization_admin",
  "operations_manager",
  "dispatcher",
  "technical_reviewer",
  "field_technician",
  "viewer",
] as const;

export type OrganizationRole = (typeof organizationRoleValues)[number];

export const organizationRole = pgEnum(
  "organization_role",
  organizationRoleValues,
);

export const membershipStatusValues = [
  "invited",
  "active",
  "suspended",
  "revoked",
] as const;

export type MembershipStatus = (typeof membershipStatusValues)[number];

export const membershipStatus = pgEnum(
  "organization_membership_status",
  membershipStatusValues,
);

export const officeAccessPolicyValues = ["all", "restricted"] as const;

export type OfficeAccessPolicy = (typeof officeAccessPolicyValues)[number];

export const officeAccessPolicy = pgEnum(
  "office_access_policy",
  officeAccessPolicyValues,
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: organizationRole("role").notNull(),
    status: membershipStatus("status").notNull().default("invited"),
    officeAccess: officeAccessPolicy("office_access").notNull().default("restricted"),
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
      columns: [table.organizationId],
      foreignColumns: [organizations.id],
      name: "organization_memberships_organization_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "organization_memberships_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [users.id],
      name: "organization_memberships_created_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedByUserId],
      foreignColumns: [users.id],
      name: "organization_memberships_updated_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("organization_memberships_organization_user_unique").on(
      table.organizationId,
      table.userId,
    ),
    unique("organization_memberships_id_organization_unique").on(
      table.id,
      table.organizationId,
    ),
    unique("organization_memberships_id_organization_user_unique").on(
      table.id,
      table.organizationId,
      table.userId,
    ),
    index("organization_memberships_user_status_idx").on(
      table.userId,
      table.status,
    ),
    index("organization_memberships_organization_status_role_idx").on(
      table.organizationId,
      table.status,
      table.role,
    ),
  ],
);

export type OrganizationMembershipRecord =
  typeof organizationMemberships.$inferSelect;
