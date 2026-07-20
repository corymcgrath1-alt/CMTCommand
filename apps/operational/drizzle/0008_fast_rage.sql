CREATE TYPE "public"."audit_action" AS ENUM('membership.prepared', 'membership.role_changed', 'membership.status_changed', 'membership.suspended', 'membership.revoked', 'membership.office_policy_changed', 'office_access.assigned', 'office_access.removed', 'project.created', 'project.updated', 'project.status_changed', 'project.archived', 'service_type.created', 'service_type.updated', 'service_type.status_changed', 'technician.created', 'technician.updated', 'technician.status_changed', 'technician.membership_linked', 'technician.membership_unlinked', 'technician.office_eligibility_added', 'technician.office_eligibility_removed', 'work_order.created', 'work_order.updated', 'work_order.status_changed', 'work_order.cancelled', 'dispatch_assignment.created', 'dispatch_assignment.schedule_changed', 'dispatch_assignment.primary_assigned', 'dispatch_assignment.primary_reassigned', 'dispatch_assignment.primary_removed', 'dispatch_assignment.support_added', 'dispatch_assignment.support_removed', 'dispatch_assignment.acknowledged', 'dispatch_assignment.started', 'dispatch_assignment.completed', 'dispatch_assignment.cancelled', 'dispatch_assignment.conflict_overridden', 'authorization.cross_office_mutation_denied', 'authorization.conflict_override_denied', 'authorization.membership_administration_denied', 'authorization.own_assignment_access_denied');--> statement-breakpoint
CREATE TYPE "public"."audit_category" AS ENUM('authentication', 'membership', 'authorization', 'organization', 'office', 'project', 'service_type', 'technician', 'work_order', 'dispatch_assignment', 'system');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('succeeded', 'denied', 'failed');--> statement-breakpoint
CREATE TYPE "public"."audit_target_type" AS ENUM('organization', 'office', 'user', 'membership', 'project', 'service_type', 'technician', 'technician_office_eligibility', 'work_order', 'dispatch_assignment', 'assignment_technician');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"actor_membership_id" uuid,
	"actor_role" "organization_role" NOT NULL,
	"category" "audit_category" NOT NULL,
	"action" "audit_action" NOT NULL,
	"outcome" "audit_outcome" NOT NULL,
	"target_type" "audit_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"secondary_target_type" "audit_target_type",
	"secondary_target_id" uuid,
	"request_id" uuid,
	"correlation_id" uuid,
	"transaction_id" uuid,
	"reason" text,
	"previous_state" jsonb,
	"resulting_state" jsonb,
	"metadata" jsonb,
	"occurred_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_secondary_target_pair_check" CHECK (("audit_events"."secondary_target_type" is null and "audit_events"."secondary_target_id" is null) or ("audit_events"."secondary_target_type" is not null and "audit_events"."secondary_target_id" is not null)),
	CONSTRAINT "audit_events_reason_check" CHECK ("audit_events"."reason" is null or ("audit_events"."reason" ~ '[^[:space:]]' and char_length("audit_events"."reason") <= 1000)),
	CONSTRAINT "audit_events_previous_state_shape_size_check" CHECK ("audit_events"."previous_state" is null or (jsonb_typeof("audit_events"."previous_state") = 'object' and octet_length("audit_events"."previous_state"::text) <= 4096)),
	CONSTRAINT "audit_events_resulting_state_shape_size_check" CHECK ("audit_events"."resulting_state" is null or (jsonb_typeof("audit_events"."resulting_state") = 'object' and octet_length("audit_events"."resulting_state"::text) <= 4096)),
	CONSTRAINT "audit_events_metadata_shape_size_check" CHECK ("audit_events"."metadata" is null or (jsonb_typeof("audit_events"."metadata") = 'object' and octet_length("audit_events"."metadata"::text) <= 8192 and not ("audit_events"."metadata" ?| array['password','passphrase','secret','token','cookie','authorization','credential','transcript','file_content','media_content'])))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_office_organization_fk" FOREIGN KEY ("office_id","organization_id") REFERENCES "public"."offices"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_id_organization_user_unique" UNIQUE("id","organization_id","user_id");--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_membership_organization_user_fk" FOREIGN KEY ("actor_membership_id","organization_id","actor_user_id") REFERENCES "public"."organization_memberships"("id","organization_id","user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "audit_events_organization_occurred_id_idx" ON "audit_events" USING btree ("organization_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_events_organization_office_occurred_idx" ON "audit_events" USING btree ("organization_id","office_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_organization_actor_occurred_idx" ON "audit_events" USING btree ("organization_id","actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_organization_target_occurred_idx" ON "audit_events" USING btree ("organization_id","target_type","target_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_organization_taxonomy_occurred_idx" ON "audit_events" USING btree ("organization_id","category","action","outcome","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_organization_request_idx" ON "audit_events" USING btree ("organization_id","request_id");--> statement-breakpoint
CREATE INDEX "audit_events_organization_correlation_idx" ON "audit_events" USING btree ("organization_id","correlation_id");
