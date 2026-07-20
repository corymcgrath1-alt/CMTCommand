CREATE TYPE "public"."media_asset_status" AS ENUM('ready', 'processing_failed', 'deleted_under_policy');--> statement-breakpoint
CREATE TYPE "public"."media_derivative_type" AS ENUM('preview', 'thumbnail');--> statement-breakpoint
CREATE TYPE "public"."media_asset_category" AS ENUM('general_photo', 'truck_ticket', 'test_result', 'observation', 'voice_note', 'video_summary', 'other');--> statement-breakpoint
CREATE TYPE "public"."media_upload_status" AS ENUM('pending_upload', 'completed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'media_upload.initiated' BEFORE 'authorization.cross_office_mutation_denied';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'media_upload.completed' BEFORE 'authorization.cross_office_mutation_denied';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'media_upload.failed' BEFORE 'authorization.cross_office_mutation_denied';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'media_access.granted' BEFORE 'authorization.cross_office_mutation_denied';--> statement-breakpoint
ALTER TYPE "public"."audit_category" ADD VALUE 'media_asset' BEFORE 'system';--> statement-breakpoint
ALTER TYPE "public"."audit_target_type" ADD VALUE 'media_upload_session';--> statement-breakpoint
ALTER TYPE "public"."audit_target_type" ADD VALUE 'media_asset';--> statement-breakpoint
ALTER TYPE "public"."audit_target_type" ADD VALUE 'media_derivative';--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"dispatch_assignment_id" uuid NOT NULL,
	"upload_session_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"uploaded_by_membership_id" uuid NOT NULL,
	"category" "media_asset_category" NOT NULL,
	"original_filename" text NOT NULL,
	"detected_media_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_key" text NOT NULL,
	"status" "media_asset_status" DEFAULT 'ready' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_upload_session_unique" UNIQUE("upload_session_id"),
	CONSTRAINT "media_assets_assignment_hash_size_unique" UNIQUE("organization_id","dispatch_assignment_id","sha256","byte_size"),
	CONSTRAINT "media_assets_storage_key_unique" UNIQUE("storage_provider","storage_bucket","storage_key"),
	CONSTRAINT "media_assets_id_organization_office_unique" UNIQUE("id","organization_id","office_id"),
	CONSTRAINT "media_assets_filename_check" CHECK ("media_assets"."original_filename" ~ '[^[:space:]]' and char_length("media_assets"."original_filename") <= 180),
	CONSTRAINT "media_assets_detected_type_check" CHECK ("media_assets"."detected_media_type" ~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$' and char_length("media_assets"."detected_media_type") <= 120),
	CONSTRAINT "media_assets_size_check" CHECK ("media_assets"."byte_size" > 0 and "media_assets"."byte_size" <= 52428800),
	CONSTRAINT "media_assets_sha256_check" CHECK ("media_assets"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "media_assets_storage_reference_check" CHECK ("media_assets"."storage_provider" = 'local-test' and "media_assets"."storage_bucket" ~ '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' and "media_assets"."storage_key" ~ '^[a-z0-9][a-z0-9._/-]{0,511}$' and position('..' in "media_assets"."storage_key") = 0)
);
--> statement-breakpoint
CREATE TABLE "media_derivatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"derivative_type" "media_derivative_type" NOT NULL,
	"media_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_key" text NOT NULL,
	"processor_name" text NOT NULL,
	"processor_version" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_derivatives_asset_type_unique" UNIQUE("media_asset_id","derivative_type"),
	CONSTRAINT "media_derivatives_storage_key_unique" UNIQUE("storage_provider","storage_bucket","storage_key"),
	CONSTRAINT "media_derivatives_media_type_check" CHECK ("media_derivatives"."media_type" ~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$' and char_length("media_derivatives"."media_type") <= 120),
	CONSTRAINT "media_derivatives_size_check" CHECK ("media_derivatives"."byte_size" > 0 and "media_derivatives"."byte_size" <= 52428800),
	CONSTRAINT "media_derivatives_sha256_check" CHECK ("media_derivatives"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "media_derivatives_storage_reference_check" CHECK ("media_derivatives"."storage_provider" = 'local-test' and "media_derivatives"."storage_bucket" ~ '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' and "media_derivatives"."storage_key" ~ '^[a-z0-9][a-z0-9._/-]{0,511}$' and position('..' in "media_derivatives"."storage_key") = 0),
	CONSTRAINT "media_derivatives_processor_name_check" CHECK ("media_derivatives"."processor_name" ~ '[^[:space:]]' and char_length("media_derivatives"."processor_name") <= 80),
	CONSTRAINT "media_derivatives_processor_version_check" CHECK ("media_derivatives"."processor_version" ~ '[^[:space:]]' and char_length("media_derivatives"."processor_version") <= 40)
);
--> statement-breakpoint
CREATE TABLE "media_upload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"dispatch_assignment_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_by_membership_id" uuid NOT NULL,
	"category" "media_asset_category" NOT NULL,
	"original_filename" text NOT NULL,
	"declared_media_type" text NOT NULL,
	"expected_byte_size" integer NOT NULL,
	"expected_sha256" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_key" text NOT NULL,
	"status" "media_upload_status" DEFAULT 'pending_upload' NOT NULL,
	"completed_media_asset_id" uuid,
	"duplicate_of_media_asset_id" uuid,
	"failure_reason" text,
	"upload_expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_upload_sessions_actor_idempotency_unique" UNIQUE("organization_id","dispatch_assignment_id","created_by_user_id","idempotency_key"),
	CONSTRAINT "media_upload_sessions_storage_key_unique" UNIQUE("storage_provider","storage_bucket","storage_key"),
	CONSTRAINT "media_upload_sessions_filename_check" CHECK ("media_upload_sessions"."original_filename" ~ '[^[:space:]]' and char_length("media_upload_sessions"."original_filename") <= 180),
	CONSTRAINT "media_upload_sessions_declared_type_check" CHECK ("media_upload_sessions"."declared_media_type" ~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$' and char_length("media_upload_sessions"."declared_media_type") <= 120),
	CONSTRAINT "media_upload_sessions_expected_size_check" CHECK ("media_upload_sessions"."expected_byte_size" > 0 and "media_upload_sessions"."expected_byte_size" <= 52428800),
	CONSTRAINT "media_upload_sessions_expected_sha256_check" CHECK ("media_upload_sessions"."expected_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "media_upload_sessions_idempotency_key_check" CHECK ("media_upload_sessions"."idempotency_key" ~ '^[A-Za-z0-9._:-]{8,120}$'),
	CONSTRAINT "media_upload_sessions_storage_reference_check" CHECK ("media_upload_sessions"."storage_provider" = 'local-test' and "media_upload_sessions"."storage_bucket" ~ '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' and "media_upload_sessions"."storage_key" ~ '^[a-z0-9][a-z0-9._/-]{0,511}$' and position('..' in "media_upload_sessions"."storage_key") = 0),
	CONSTRAINT "media_upload_sessions_status_completion_check" CHECK (("media_upload_sessions"."status" = 'completed' and "media_upload_sessions"."completed_media_asset_id" is not null and "media_upload_sessions"."failure_reason" is null) or ("media_upload_sessions"."status" = 'failed' and "media_upload_sessions"."completed_media_asset_id" is null and "media_upload_sessions"."failure_reason" ~ '[^[:space:]]') or ("media_upload_sessions"."status" = 'pending_upload' and "media_upload_sessions"."completed_media_asset_id" is null and "media_upload_sessions"."duplicate_of_media_asset_id" is null and "media_upload_sessions"."failure_reason" is null))
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_assignment_scope_fk" FOREIGN KEY ("dispatch_assignment_id","organization_id","office_id") REFERENCES "public"."dispatch_assignments"("id","organization_id","office_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_upload_session_fk" FOREIGN KEY ("upload_session_id") REFERENCES "public"."media_upload_sessions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_membership_scope_fk" FOREIGN KEY ("uploaded_by_membership_id","organization_id","uploaded_by_user_id") REFERENCES "public"."organization_memberships"("id","organization_id","user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "media_derivatives" ADD CONSTRAINT "media_derivatives_asset_scope_fk" FOREIGN KEY ("media_asset_id","organization_id","office_id") REFERENCES "public"."media_assets"("id","organization_id","office_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "media_upload_sessions" ADD CONSTRAINT "media_upload_sessions_assignment_scope_fk" FOREIGN KEY ("dispatch_assignment_id","organization_id","office_id") REFERENCES "public"."dispatch_assignments"("id","organization_id","office_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "media_upload_sessions" ADD CONSTRAINT "media_upload_sessions_created_by_user_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "media_upload_sessions" ADD CONSTRAINT "media_upload_sessions_membership_scope_fk" FOREIGN KEY ("created_by_membership_id","organization_id","created_by_user_id") REFERENCES "public"."organization_memberships"("id","organization_id","user_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "media_assets_assignment_created_idx" ON "media_assets" USING btree ("organization_id","office_id","dispatch_assignment_id","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_uploader_idx" ON "media_assets" USING btree ("organization_id","uploaded_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "media_derivatives_asset_idx" ON "media_derivatives" USING btree ("organization_id","office_id","media_asset_id");--> statement-breakpoint
CREATE INDEX "media_upload_sessions_assignment_idx" ON "media_upload_sessions" USING btree ("organization_id","office_id","dispatch_assignment_id","created_at");--> statement-breakpoint
CREATE INDEX "media_upload_sessions_actor_idx" ON "media_upload_sessions" USING btree ("organization_id","created_by_user_id","created_at");