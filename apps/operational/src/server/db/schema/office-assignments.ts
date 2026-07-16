import {
  foreignKey,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { offices } from "./offices";
import { organizationMemberships } from "./organization-memberships";
import { users } from "./users";

export const officeAssignments = pgTable(
  "office_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    organizationMembershipId: uuid("organization_membership_id").notNull(),
    officeId: uuid("office_id").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.organizationMembershipId, table.organizationId],
      foreignColumns: [
        organizationMemberships.id,
        organizationMemberships.organizationId,
      ],
      name: "office_assignments_membership_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.officeId, table.organizationId],
      foreignColumns: [offices.id, offices.organizationId],
      name: "office_assignments_office_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [users.id],
      name: "office_assignments_created_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("office_assignments_membership_office_unique").on(
      table.organizationMembershipId,
      table.officeId,
    ),
    index("office_assignments_membership_idx").on(
      table.organizationMembershipId,
    ),
    index("office_assignments_organization_office_idx").on(
      table.organizationId,
      table.officeId,
    ),
  ],
);

export type OfficeAssignmentRecord = typeof officeAssignments.$inferSelect;
