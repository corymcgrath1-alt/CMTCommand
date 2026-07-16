import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { technicians } from "./technicians";
import { users } from "./users";
import { workOrders } from "./work-orders";

export const dispatchAssignments = pgTable(
  "dispatch_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    sourceSystem: text("source_system").notNull(),
    sourceAssignmentId: text("source_assignment_id").notNull(),
    workOrderId: uuid("work_order_id").notNull(),
    technicianId: uuid("technician_id").notNull(),
    assignmentStartAt: timestamp("assignment_start_at", {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    assignmentEndAt: timestamp("assignment_end_at", {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    updatedByUserId: uuid("updated_by_user_id").notNull(),
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
      columns: [table.workOrderId, table.organizationId, table.officeId],
      foreignColumns: [
        workOrders.id,
        workOrders.organizationId,
        workOrders.officeId,
      ],
      name: "dispatch_assignments_work_order_organization_office_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.technicianId, table.organizationId, table.officeId],
      foreignColumns: [
        technicians.id,
        technicians.organizationId,
        technicians.officeId,
      ],
      name: "dispatch_assignments_technician_organization_office_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.createdByUserId],
      foreignColumns: [users.id],
      name: "dispatch_assignments_created_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.updatedByUserId],
      foreignColumns: [users.id],
      name: "dispatch_assignments_updated_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("dispatch_assignments_organization_source_unique").on(
      table.organizationId,
      table.sourceSystem,
      table.sourceAssignmentId,
    ),
    index("dispatch_assignments_organization_office_schedule_idx").on(
      table.organizationId,
      table.officeId,
      table.assignmentStartAt,
    ),
    index("dispatch_assignments_work_order_idx").on(
      table.organizationId,
      table.officeId,
      table.workOrderId,
    ),
    index("dispatch_assignments_technician_schedule_idx").on(
      table.organizationId,
      table.officeId,
      table.technicianId,
      table.assignmentStartAt,
    ),
    check(
      "dispatch_assignments_source_system_not_blank_check",
      sql`${table.sourceSystem} ~ '[^[:space:]]'`,
    ),
    check(
      "dispatch_assignments_source_system_format_check",
      sql`${table.sourceSystem} = lower(trim(${table.sourceSystem})) and ${table.sourceSystem} ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'`,
    ),
    check(
      "dispatch_assignments_source_assignment_id_not_blank_check",
      sql`${table.sourceAssignmentId} ~ '[^[:space:]]'`,
    ),
    check(
      "dispatch_assignments_schedule_order_check",
      sql`${table.assignmentEndAt} > ${table.assignmentStartAt}`,
    ),
  ],
);

export type DispatchAssignmentRecord = typeof dispatchAssignments.$inferSelect;
