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
import { technicians } from "./technicians";
import { users } from "./users";
import { workOrders } from "./work-orders";

export const dispatchAssignmentStatusValues = [
  "draft",
  "unassigned",
  "assigned",
  "acknowledged",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const dispatchAssignmentStatus = pgEnum(
  "dispatch_assignment_status",
  dispatchAssignmentStatusValues,
);

export const dispatchAssignments = pgTable(
  "dispatch_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    sourceSystem: text("source_system").notNull(),
    sourceAssignmentId: text("source_assignment_id").notNull(),
    workOrderId: uuid("work_order_id").notNull(),
    technicianId: uuid("technician_id"),
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
    status: dispatchAssignmentStatus("status").notNull().default("unassigned"),
    version: integer("version").notNull().default(1),
    timeZone: text("time_zone").notNull().default("UTC"),
    cancellationReason: text("cancellation_reason"),
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
      columns: [table.technicianId],
      foreignColumns: [technicians.id],
      name: "dispatch_assignments_technician_id_fk",
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
    unique("dispatch_assignments_id_organization_office_unique").on(
      table.id,
      table.organizationId,
      table.officeId,
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
    check("dispatch_assignments_version_positive_check", sql`${table.version} > 0`),
    check(
      "dispatch_assignments_time_zone_not_blank_check",
      sql`${table.timeZone} ~ '[^[:space:]]'`,
    ),
    check(
      "dispatch_assignments_primary_pointer_check",
      sql`(${table.status} in ('assigned', 'acknowledged', 'in_progress', 'completed') and ${table.technicianId} is not null) or (${table.status} in ('draft', 'unassigned', 'cancelled'))`,
    ),
    check(
      "dispatch_assignments_cancellation_reason_check",
      sql`(${table.status} = 'cancelled' and ${table.cancellationReason} ~ '[^[:space:]]') or (${table.status} <> 'cancelled' and ${table.cancellationReason} is null)`,
    ),
  ],
);

export type DispatchAssignmentRecord = typeof dispatchAssignments.$inferSelect;
export type DispatchAssignmentStatus =
  (typeof dispatchAssignmentStatusValues)[number];
