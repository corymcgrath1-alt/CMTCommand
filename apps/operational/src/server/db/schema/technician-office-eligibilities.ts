import {
  foreignKey,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { offices } from "./offices";
import { technicians } from "./technicians";
import { users } from "./users";

export const technicianOfficeEligibilities = pgTable(
  "technician_office_eligibilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    technicianId: uuid("technician_id").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.officeId, table.organizationId],
      foreignColumns: [offices.id, offices.organizationId],
      name: "technician_eligibilities_office_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.technicianId],
      foreignColumns: [technicians.id],
      name: "technician_eligibilities_technician_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [users.id],
      name: "technician_eligibilities_created_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("technician_eligibilities_technician_office_unique").on(
      table.technicianId,
      table.officeId,
    ),
    unique("technician_eligibilities_scope_unique").on(
      table.technicianId,
      table.organizationId,
      table.officeId,
    ),
    index("technician_eligibilities_organization_office_idx").on(
      table.organizationId,
      table.officeId,
      table.technicianId,
    ),
  ],
);

export type TechnicianOfficeEligibilityRecord =
  typeof technicianOfficeEligibilities.$inferSelect;
