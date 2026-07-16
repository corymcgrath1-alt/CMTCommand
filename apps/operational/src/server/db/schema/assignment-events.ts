import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { dispatchAssignmentStatus } from "./dispatch-assignments";
import { technicians } from "./technicians";
import { users } from "./users";
import { dispatchAssignments } from "./dispatch-assignments";

export const assignmentEventTypeValues = [
  "created",
  "scheduled",
  "primary_assigned",
  "primary_reassigned",
  "primary_removed",
  "support_added",
  "support_removed",
  "acknowledged",
  "started",
  "completed",
  "cancelled",
  "schedule_changed",
  "conflict_overridden",
] as const;

export const assignmentEventType = pgEnum(
  "assignment_event_type",
  assignmentEventTypeValues,
);

export const assignmentEvents = pgTable(
  "assignment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    dispatchAssignmentId: uuid("dispatch_assignment_id").notNull(),
    eventType: assignmentEventType("event_type").notNull(),
    fromStatus: dispatchAssignmentStatus("from_status"),
    toStatus: dispatchAssignmentStatus("to_status"),
    technicianId: uuid("technician_id"),
    previousTechnicianId: uuid("previous_technician_id"),
    reason: text("reason"),
    actedByUserId: uuid("acted_by_user_id").notNull(),
    assignmentVersion: integer("assignment_version").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.dispatchAssignmentId],
      foreignColumns: [dispatchAssignments.id],
      name: "assignment_events_assignment_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.technicianId],
      foreignColumns: [technicians.id],
      name: "assignment_events_technician_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.previousTechnicianId],
      foreignColumns: [technicians.id],
      name: "assignment_events_previous_technician_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.actedByUserId],
      foreignColumns: [users.id],
      name: "assignment_events_acted_by_user_id_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    index("assignment_events_assignment_version_idx").on(
      table.organizationId,
      table.dispatchAssignmentId,
      table.assignmentVersion,
    ),
    check(
      "assignment_events_version_positive_check",
      sql`${table.assignmentVersion} > 0`,
    ),
    check(
      "assignment_events_reason_not_blank_check",
      sql`${table.reason} is null or ${table.reason} ~ '[^[:space:]]'`,
    ),
  ],
);

export type AssignmentEventRecord = typeof assignmentEvents.$inferSelect;
export type AssignmentEventType = (typeof assignmentEventTypeValues)[number];
