import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { dispatchAssignments } from "./dispatch-assignments";
import { technicians } from "./technicians";
import { users } from "./users";

export const assignmentTechnicianRoleValues = ["primary", "support"] as const;
export const assignmentTechnicianStatusValues = ["active", "ended"] as const;

export const assignmentTechnicianRole = pgEnum(
  "assignment_technician_role",
  assignmentTechnicianRoleValues,
);
export const assignmentTechnicianStatus = pgEnum(
  "assignment_technician_status",
  assignmentTechnicianStatusValues,
);

export const assignmentTechnicians = pgTable(
  "assignment_technicians",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    dispatchAssignmentId: uuid("dispatch_assignment_id").notNull(),
    technicianId: uuid("technician_id").notNull(),
    role: assignmentTechnicianRole("role").notNull(),
    status: assignmentTechnicianStatus("status").notNull().default("active"),
    assignedByUserId: uuid("assigned_by_user_id").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    endedByUserId: uuid("ended_by_user_id"),
    endedAt: timestamp("ended_at", { withTimezone: true, precision: 3 }),
    endReason: text("end_reason"),
  },
  (table) => [
    foreignKey({
      columns: [table.dispatchAssignmentId],
      foreignColumns: [dispatchAssignments.id],
      name: "assignment_technicians_assignment_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.technicianId],
      foreignColumns: [technicians.id],
      name: "assignment_technicians_technician_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.assignedByUserId],
      foreignColumns: [users.id],
      name: "assignment_technicians_assigned_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.endedByUserId],
      foreignColumns: [users.id],
      name: "assignment_technicians_ended_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    uniqueIndex("assignment_technicians_one_active_primary_idx")
      .on(table.dispatchAssignmentId)
      .where(sql`${table.status} = 'active' and ${table.role} = 'primary'`),
    uniqueIndex("assignment_technicians_active_relationship_unique_idx")
      .on(table.dispatchAssignmentId, table.technicianId)
      .where(sql`${table.status} = 'active'`),
    index("assignment_technicians_active_technician_idx").on(
      table.organizationId,
      table.technicianId,
      table.status,
    ),
    check(
      "assignment_technicians_end_state_check",
      sql`(${table.status} = 'active' and ${table.endedAt} is null and ${table.endedByUserId} is null and ${table.endReason} is null) or (${table.status} = 'ended' and ${table.endedAt} is not null and ${table.endedByUserId} is not null and ${table.endReason} ~ '[^[:space:]]')`,
    ),
  ],
);

export type AssignmentTechnicianRecord = typeof assignmentTechnicians.$inferSelect;
export type AssignmentTechnicianRole =
  (typeof assignmentTechnicianRoleValues)[number];
