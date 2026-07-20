ALTER TABLE "dispatch_assignments" DROP CONSTRAINT "dispatch_assignments_source_system_not_blank_check";--> statement-breakpoint
ALTER TABLE "dispatch_assignments" DROP CONSTRAINT "dispatch_assignments_source_assignment_id_not_blank_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_source_system_not_blank_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_source_project_id_not_blank_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_project_number_not_blank_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_name_not_blank_check";--> statement-breakpoint
ALTER TABLE "technicians" DROP CONSTRAINT "technicians_source_system_not_blank_check";--> statement-breakpoint
ALTER TABLE "technicians" DROP CONSTRAINT "technicians_source_technician_id_not_blank_check";--> statement-breakpoint
ALTER TABLE "technicians" DROP CONSTRAINT "technicians_display_name_not_blank_check";--> statement-breakpoint
ALTER TABLE "technicians" DROP CONSTRAINT "technicians_operational_role_not_blank_check";--> statement-breakpoint
ALTER TABLE "technicians" DROP CONSTRAINT "technicians_work_email_not_blank_check";--> statement-breakpoint
ALTER TABLE "technicians" DROP CONSTRAINT "technicians_work_phone_not_blank_check";--> statement-breakpoint
ALTER TABLE "work_orders" DROP CONSTRAINT "work_orders_source_system_not_blank_check";--> statement-breakpoint
ALTER TABLE "work_orders" DROP CONSTRAINT "work_orders_source_work_order_id_not_blank_check";--> statement-breakpoint
ALTER TABLE "work_orders" DROP CONSTRAINT "work_orders_number_not_blank_check";--> statement-breakpoint
ALTER TABLE "work_orders" DROP CONSTRAINT "work_orders_service_type_not_blank_check";--> statement-breakpoint
ALTER TABLE "work_orders" DROP CONSTRAINT "work_orders_job_site_name_not_blank_check";--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_source_system_not_blank_check" CHECK ("dispatch_assignments"."source_system" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_source_assignment_id_not_blank_check" CHECK ("dispatch_assignments"."source_assignment_id" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_source_system_not_blank_check" CHECK ("projects"."source_system" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_source_project_id_not_blank_check" CHECK ("projects"."source_project_id" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_number_not_blank_check" CHECK ("projects"."project_number" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_name_not_blank_check" CHECK ("projects"."name" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_source_system_not_blank_check" CHECK ("technicians"."source_system" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_source_technician_id_not_blank_check" CHECK ("technicians"."source_technician_id" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_display_name_not_blank_check" CHECK ("technicians"."display_name" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_operational_role_not_blank_check" CHECK ("technicians"."operational_role" is null or "technicians"."operational_role" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_work_email_not_blank_check" CHECK ("technicians"."work_email" is null or "technicians"."work_email" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_work_phone_not_blank_check" CHECK ("technicians"."work_phone" is null or "technicians"."work_phone" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_source_system_not_blank_check" CHECK ("work_orders"."source_system" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_source_work_order_id_not_blank_check" CHECK ("work_orders"."source_work_order_id" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_number_not_blank_check" CHECK ("work_orders"."work_order_number" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_service_type_not_blank_check" CHECK ("work_orders"."service_type" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_job_site_name_not_blank_check" CHECK ("work_orders"."job_site_name" ~ '[^[:space:]]');