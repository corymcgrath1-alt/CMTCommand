CREATE TABLE "dispatch_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"source_system" text NOT NULL,
	"source_assignment_id" text NOT NULL,
	"work_order_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"assignment_start_at" timestamp (3) with time zone NOT NULL,
	"assignment_end_at" timestamp (3) with time zone NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispatch_assignments_organization_source_unique" UNIQUE("organization_id","source_system","source_assignment_id"),
	CONSTRAINT "dispatch_assignments_source_system_not_blank_check" CHECK (length(trim("dispatch_assignments"."source_system")) > 0),
	CONSTRAINT "dispatch_assignments_source_system_format_check" CHECK ("dispatch_assignments"."source_system" = lower(trim("dispatch_assignments"."source_system")) and "dispatch_assignments"."source_system" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
	CONSTRAINT "dispatch_assignments_source_assignment_id_not_blank_check" CHECK (length(trim("dispatch_assignments"."source_assignment_id")) > 0),
	CONSTRAINT "dispatch_assignments_schedule_order_check" CHECK ("dispatch_assignments"."assignment_end_at" > "dispatch_assignments"."assignment_start_at")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"source_system" text NOT NULL,
	"source_project_id" text NOT NULL,
	"project_number" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_id_organization_office_unique" UNIQUE("id","organization_id","office_id"),
	CONSTRAINT "projects_organization_source_unique" UNIQUE("organization_id","source_system","source_project_id"),
	CONSTRAINT "projects_source_system_not_blank_check" CHECK (length(trim("projects"."source_system")) > 0),
	CONSTRAINT "projects_source_system_format_check" CHECK ("projects"."source_system" = lower(trim("projects"."source_system")) and "projects"."source_system" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
	CONSTRAINT "projects_source_project_id_not_blank_check" CHECK (length(trim("projects"."source_project_id")) > 0),
	CONSTRAINT "projects_project_number_not_blank_check" CHECK (length(trim("projects"."project_number")) > 0),
	CONSTRAINT "projects_name_not_blank_check" CHECK (length(trim("projects"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"source_system" text NOT NULL,
	"source_technician_id" text NOT NULL,
	"display_name" text NOT NULL,
	"operational_role" text,
	"work_email" text,
	"work_phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "technicians_id_organization_office_unique" UNIQUE("id","organization_id","office_id"),
	CONSTRAINT "technicians_organization_source_unique" UNIQUE("organization_id","source_system","source_technician_id"),
	CONSTRAINT "technicians_source_system_not_blank_check" CHECK (length(trim("technicians"."source_system")) > 0),
	CONSTRAINT "technicians_source_system_format_check" CHECK ("technicians"."source_system" = lower(trim("technicians"."source_system")) and "technicians"."source_system" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
	CONSTRAINT "technicians_source_technician_id_not_blank_check" CHECK (length(trim("technicians"."source_technician_id")) > 0),
	CONSTRAINT "technicians_display_name_not_blank_check" CHECK (length(trim("technicians"."display_name")) > 0),
	CONSTRAINT "technicians_operational_role_not_blank_check" CHECK ("technicians"."operational_role" is null or length(trim("technicians"."operational_role")) > 0),
	CONSTRAINT "technicians_work_email_not_blank_check" CHECK ("technicians"."work_email" is null or length(trim("technicians"."work_email")) > 0),
	CONSTRAINT "technicians_work_phone_not_blank_check" CHECK ("technicians"."work_phone" is null or length(trim("technicians"."work_phone")) > 0)
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"source_system" text NOT NULL,
	"source_work_order_id" text NOT NULL,
	"work_order_number" text NOT NULL,
	"service_type" text NOT NULL,
	"job_site_name" text NOT NULL,
	"scheduled_start_at" timestamp (3) with time zone NOT NULL,
	"scheduled_end_at" timestamp (3) with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_orders_id_organization_office_unique" UNIQUE("id","organization_id","office_id"),
	CONSTRAINT "work_orders_organization_source_unique" UNIQUE("organization_id","source_system","source_work_order_id"),
	CONSTRAINT "work_orders_source_system_not_blank_check" CHECK (length(trim("work_orders"."source_system")) > 0),
	CONSTRAINT "work_orders_source_system_format_check" CHECK ("work_orders"."source_system" = lower(trim("work_orders"."source_system")) and "work_orders"."source_system" ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
	CONSTRAINT "work_orders_source_work_order_id_not_blank_check" CHECK (length(trim("work_orders"."source_work_order_id")) > 0),
	CONSTRAINT "work_orders_number_not_blank_check" CHECK (length(trim("work_orders"."work_order_number")) > 0),
	CONSTRAINT "work_orders_service_type_not_blank_check" CHECK (length(trim("work_orders"."service_type")) > 0),
	CONSTRAINT "work_orders_job_site_name_not_blank_check" CHECK (length(trim("work_orders"."job_site_name")) > 0),
	CONSTRAINT "work_orders_schedule_order_check" CHECK ("work_orders"."scheduled_end_at" > "work_orders"."scheduled_start_at")
);
--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_work_order_organization_office_fk" FOREIGN KEY ("work_order_id","organization_id","office_id") REFERENCES "public"."work_orders"("id","organization_id","office_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_technician_organization_office_fk" FOREIGN KEY ("technician_id","organization_id","office_id") REFERENCES "public"."technicians"("id","organization_id","office_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_updated_by_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_office_organization_fk" FOREIGN KEY ("office_id","organization_id") REFERENCES "public"."offices"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_office_organization_fk" FOREIGN KEY ("office_id","organization_id") REFERENCES "public"."offices"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_office_organization_fk" FOREIGN KEY ("office_id","organization_id") REFERENCES "public"."offices"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_project_organization_office_fk" FOREIGN KEY ("project_id","organization_id","office_id") REFERENCES "public"."projects"("id","organization_id","office_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "dispatch_assignments_organization_office_schedule_idx" ON "dispatch_assignments" USING btree ("organization_id","office_id","assignment_start_at");--> statement-breakpoint
CREATE INDEX "dispatch_assignments_work_order_idx" ON "dispatch_assignments" USING btree ("organization_id","office_id","work_order_id");--> statement-breakpoint
CREATE INDEX "dispatch_assignments_technician_schedule_idx" ON "dispatch_assignments" USING btree ("organization_id","office_id","technician_id","assignment_start_at");--> statement-breakpoint
CREATE INDEX "projects_organization_office_active_idx" ON "projects" USING btree ("organization_id","office_id","is_active");--> statement-breakpoint
CREATE INDEX "projects_organization_office_number_idx" ON "projects" USING btree ("organization_id","office_id","project_number");--> statement-breakpoint
CREATE INDEX "technicians_organization_office_active_idx" ON "technicians" USING btree ("organization_id","office_id","is_active");--> statement-breakpoint
CREATE INDEX "technicians_organization_office_name_idx" ON "technicians" USING btree ("organization_id","office_id","display_name");--> statement-breakpoint
CREATE INDEX "work_orders_organization_office_schedule_idx" ON "work_orders" USING btree ("organization_id","office_id","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "work_orders_organization_project_schedule_idx" ON "work_orders" USING btree ("organization_id","project_id","scheduled_start_at");--> statement-breakpoint
CREATE INDEX "work_orders_organization_office_active_idx" ON "work_orders" USING btree ("organization_id","office_id","is_active");