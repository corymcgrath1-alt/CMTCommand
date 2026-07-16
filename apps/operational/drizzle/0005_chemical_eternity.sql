CREATE TYPE "public"."assignment_event_type" AS ENUM('created', 'scheduled', 'primary_assigned', 'primary_reassigned', 'primary_removed', 'support_added', 'support_removed', 'acknowledged', 'started', 'completed', 'cancelled', 'schedule_changed', 'conflict_overridden');--> statement-breakpoint
CREATE TYPE "public"."assignment_technician_role" AS ENUM('primary', 'support');--> statement-breakpoint
CREATE TYPE "public"."assignment_technician_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."dispatch_assignment_status" AS ENUM('draft', 'unassigned', 'assigned', 'acknowledged', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."service_type_category" AS ENUM('concrete', 'soils', 'masonry', 'reinforcing_steel', 'structural_steel', 'fireproofing', 'asphalt', 'other');--> statement-breakpoint
CREATE TYPE "public"."service_type_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."technician_status" AS ENUM('active', 'inactive', 'on_leave');--> statement-breakpoint
CREATE TYPE "public"."work_order_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."work_order_status" AS ENUM('draft', 'ready_for_dispatch', 'scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "assignment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"dispatch_assignment_id" uuid NOT NULL,
	"event_type" "assignment_event_type" NOT NULL,
	"from_status" "dispatch_assignment_status",
	"to_status" "dispatch_assignment_status",
	"technician_id" uuid,
	"previous_technician_id" uuid,
	"reason" text,
	"acted_by_user_id" uuid NOT NULL,
	"assignment_version" integer NOT NULL,
	"occurred_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_events_version_positive_check" CHECK ("assignment_events"."assignment_version" > 0),
	CONSTRAINT "assignment_events_reason_not_blank_check" CHECK ("assignment_events"."reason" is null or "assignment_events"."reason" ~ '[^[:space:]]')
);
--> statement-breakpoint
CREATE TABLE "assignment_technicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"dispatch_assignment_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"role" "assignment_technician_role" NOT NULL,
	"status" "assignment_technician_status" DEFAULT 'active' NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	"assigned_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"ended_by_user_id" uuid,
	"ended_at" timestamp (3) with time zone,
	"end_reason" text,
	CONSTRAINT "assignment_technicians_end_state_check" CHECK (("assignment_technicians"."status" = 'active' and "assignment_technicians"."ended_at" is null and "assignment_technicians"."ended_by_user_id" is null and "assignment_technicians"."end_reason" is null) or ("assignment_technicians"."status" = 'ended' and "assignment_technicians"."ended_at" is not null and "assignment_technicians"."ended_by_user_id" is not null and "assignment_technicians"."end_reason" ~ '[^[:space:]]'))
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"category" "service_type_category" NOT NULL,
	"status" "service_type_status" DEFAULT 'active' NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_types_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "service_types_organization_key_unique" UNIQUE("organization_id","key"),
	CONSTRAINT "service_types_key_format_check" CHECK ("service_types"."key" = lower(trim("service_types"."key")) and "service_types"."key" ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'),
	CONSTRAINT "service_types_name_not_blank_check" CHECK ("service_types"."name" ~ '[^[:space:]]'),
	CONSTRAINT "service_types_description_not_blank_check" CHECK ("service_types"."description" is null or "service_types"."description" ~ '[^[:space:]]'),
	CONSTRAINT "service_types_version_positive_check" CHECK ("service_types"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "technician_office_eligibilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "technician_eligibilities_technician_office_unique" UNIQUE("technician_id","office_id"),
	CONSTRAINT "technician_eligibilities_scope_unique" UNIQUE("technician_id","organization_id","office_id")
);
--> statement-breakpoint
ALTER TABLE "dispatch_assignments" DROP CONSTRAINT "dispatch_assignments_technician_organization_office_fk";
--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ALTER COLUMN "technician_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD COLUMN "status" "dispatch_assignment_status" DEFAULT 'unassigned' NOT NULL;--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD COLUMN "time_zone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status" "project_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "organization_membership_id" uuid;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "home_office_id" uuid;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "status" "technician_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "technicians" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "service_type_id" uuid;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "priority" "work_order_priority" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "status" "work_order_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "time_zone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "dispatch_instructions" text;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "assignment_events" ADD CONSTRAINT "assignment_events_assignment_id_fk" FOREIGN KEY ("dispatch_assignment_id") REFERENCES "public"."dispatch_assignments"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assignment_events" ADD CONSTRAINT "assignment_events_technician_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assignment_events" ADD CONSTRAINT "assignment_events_previous_technician_id_fk" FOREIGN KEY ("previous_technician_id") REFERENCES "public"."technicians"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assignment_events" ADD CONSTRAINT "assignment_events_acted_by_user_id_fk" FOREIGN KEY ("acted_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assignment_technicians" ADD CONSTRAINT "assignment_technicians_assignment_id_fk" FOREIGN KEY ("dispatch_assignment_id") REFERENCES "public"."dispatch_assignments"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assignment_technicians" ADD CONSTRAINT "assignment_technicians_technician_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assignment_technicians" ADD CONSTRAINT "assignment_technicians_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assignment_technicians" ADD CONSTRAINT "assignment_technicians_ended_by_user_id_fk" FOREIGN KEY ("ended_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_office_organization_fk" FOREIGN KEY ("office_id","organization_id") REFERENCES "public"."offices"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_updated_by_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "technician_office_eligibilities" ADD CONSTRAINT "technician_eligibilities_office_organization_fk" FOREIGN KEY ("office_id","organization_id") REFERENCES "public"."offices"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "technician_office_eligibilities" ADD CONSTRAINT "technician_eligibilities_technician_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "technician_office_eligibilities" ADD CONSTRAINT "technician_eligibilities_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "assignment_events_assignment_version_idx" ON "assignment_events" USING btree ("organization_id","dispatch_assignment_id","assignment_version");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_technicians_one_active_primary_idx" ON "assignment_technicians" USING btree ("dispatch_assignment_id") WHERE "assignment_technicians"."status" = 'active' and "assignment_technicians"."role" = 'primary';--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_technicians_active_relationship_unique_idx" ON "assignment_technicians" USING btree ("dispatch_assignment_id","technician_id") WHERE "assignment_technicians"."status" = 'active';--> statement-breakpoint
CREATE INDEX "assignment_technicians_active_technician_idx" ON "assignment_technicians" USING btree ("organization_id","technician_id","status");--> statement-breakpoint
CREATE INDEX "service_types_organization_status_name_idx" ON "service_types" USING btree ("organization_id","status","name");--> statement-breakpoint
CREATE INDEX "technician_eligibilities_organization_office_idx" ON "technician_office_eligibilities" USING btree ("organization_id","office_id","technician_id");--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_technician_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_membership_organization_fk" FOREIGN KEY ("organization_membership_id","organization_id") REFERENCES "public"."organization_memberships"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_home_office_organization_fk" FOREIGN KEY ("home_office_id","organization_id") REFERENCES "public"."offices"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_service_type_organization_fk" FOREIGN KEY ("service_type_id","organization_id") REFERENCES "public"."service_types"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "technicians_organization_home_office_status_idx" ON "technicians" USING btree ("organization_id","home_office_id","status");--> statement-breakpoint
CREATE INDEX "work_orders_organization_service_type_idx" ON "work_orders" USING btree ("organization_id","service_type_id","status");--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_id_organization_office_unique" UNIQUE("id","organization_id","office_id");--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_id_organization_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_organization_membership_unique" UNIQUE("organization_id","organization_membership_id");--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_version_positive_check" CHECK ("dispatch_assignments"."version" > 0);--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_time_zone_not_blank_check" CHECK ("dispatch_assignments"."time_zone" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_primary_pointer_check" CHECK (("dispatch_assignments"."status" in ('assigned', 'acknowledged', 'in_progress', 'completed') and "dispatch_assignments"."technician_id" is not null) or ("dispatch_assignments"."status" in ('draft', 'unassigned', 'cancelled')));--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_cancellation_reason_check" CHECK (("dispatch_assignments"."status" = 'cancelled' and "dispatch_assignments"."cancellation_reason" ~ '[^[:space:]]') or ("dispatch_assignments"."status" <> 'cancelled' and "dispatch_assignments"."cancellation_reason" is null));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_address_not_blank_check" CHECK ("projects"."address" is null or "projects"."address" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_version_positive_check" CHECK ("projects"."version" > 0);--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_version_positive_check" CHECK ("technicians"."version" > 0);--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_version_positive_check" CHECK ("work_orders"."version" > 0);--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_time_zone_not_blank_check" CHECK ("work_orders"."time_zone" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_dispatch_instructions_not_blank_check" CHECK ("work_orders"."dispatch_instructions" is null or "work_orders"."dispatch_instructions" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_cancellation_reason_check" CHECK (("work_orders"."status" = 'cancelled' and "work_orders"."cancellation_reason" ~ '[^[:space:]]') or ("work_orders"."status" <> 'cancelled' and "work_orders"."cancellation_reason" is null));