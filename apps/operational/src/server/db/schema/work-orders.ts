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
import { projects } from "./projects";
import { serviceTypes } from "./service-types";

export const workOrderStatusValues = [
  "draft",
  "ready_for_dispatch",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export const workOrderPriorityValues = ["low", "normal", "high", "urgent"] as const;

export const workOrderStatus = pgEnum("work_order_status", workOrderStatusValues);
export const workOrderPriority = pgEnum(
  "work_order_priority",
  workOrderPriorityValues,
);

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    officeId: uuid("office_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sourceSystem: text("source_system").notNull(),
    sourceWorkOrderId: text("source_work_order_id").notNull(),
    workOrderNumber: text("work_order_number").notNull(),
    serviceTypeId: uuid("service_type_id").notNull(),
    serviceType: text("service_type").notNull(),
    jobSiteName: text("job_site_name").notNull(),
    priority: workOrderPriority("priority").notNull().default("normal"),
    status: workOrderStatus("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    timeZone: text("time_zone").notNull().default("UTC"),
    dispatchInstructions: text("dispatch_instructions"),
    cancellationReason: text("cancellation_reason"),
    scheduledStartAt: timestamp("scheduled_start_at", {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    scheduledEndAt: timestamp("scheduled_end_at", {
      withTimezone: true,
      precision: 3,
    }).notNull(),
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
      name: "work_orders_office_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.serviceTypeId, table.organizationId],
      foreignColumns: [serviceTypes.id, serviceTypes.organizationId],
      name: "work_orders_service_type_organization_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.projectId, table.organizationId, table.officeId],
      foreignColumns: [projects.id, projects.organizationId, projects.officeId],
      name: "work_orders_project_organization_office_fk",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    unique("work_orders_id_organization_office_unique").on(
      table.id,
      table.organizationId,
      table.officeId,
    ),
    unique("work_orders_organization_source_unique").on(
      table.organizationId,
      table.sourceSystem,
      table.sourceWorkOrderId,
    ),
    index("work_orders_organization_office_schedule_idx").on(
      table.organizationId,
      table.officeId,
      table.scheduledStartAt,
    ),
    index("work_orders_organization_project_schedule_idx").on(
      table.organizationId,
      table.projectId,
      table.scheduledStartAt,
    ),
    index("work_orders_organization_office_active_idx").on(
      table.organizationId,
      table.officeId,
      table.isActive,
    ),
    index("work_orders_organization_service_type_idx").on(
      table.organizationId,
      table.serviceTypeId,
      table.status,
    ),
    check(
      "work_orders_source_system_not_blank_check",
      sql`${table.sourceSystem} ~ '[^[:space:]]'`,
    ),
    check(
      "work_orders_source_system_format_check",
      sql`${table.sourceSystem} = lower(trim(${table.sourceSystem})) and ${table.sourceSystem} ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'`,
    ),
    check(
      "work_orders_source_work_order_id_not_blank_check",
      sql`${table.sourceWorkOrderId} ~ '[^[:space:]]'`,
    ),
    check(
      "work_orders_number_not_blank_check",
      sql`${table.workOrderNumber} ~ '[^[:space:]]'`,
    ),
    check(
      "work_orders_service_type_not_blank_check",
      sql`${table.serviceType} ~ '[^[:space:]]'`,
    ),
    check(
      "work_orders_job_site_name_not_blank_check",
      sql`${table.jobSiteName} ~ '[^[:space:]]'`,
    ),
    check(
      "work_orders_schedule_order_check",
      sql`${table.scheduledEndAt} > ${table.scheduledStartAt}`,
    ),
    check("work_orders_version_positive_check", sql`${table.version} > 0`),
    check(
      "work_orders_time_zone_not_blank_check",
      sql`${table.timeZone} ~ '[^[:space:]]'`,
    ),
    check(
      "work_orders_dispatch_instructions_not_blank_check",
      sql`${table.dispatchInstructions} is null or ${table.dispatchInstructions} ~ '[^[:space:]]'`,
    ),
    check(
      "work_orders_cancellation_reason_check",
      sql`(${table.status} = 'cancelled' and ${table.cancellationReason} ~ '[^[:space:]]') or (${table.status} <> 'cancelled' and ${table.cancellationReason} is null)`,
    ),
  ],
);

export type WorkOrderRecord = typeof workOrders.$inferSelect;
export type WorkOrderStatus = (typeof workOrderStatusValues)[number];
export type WorkOrderPriority = (typeof workOrderPriorityValues)[number];
