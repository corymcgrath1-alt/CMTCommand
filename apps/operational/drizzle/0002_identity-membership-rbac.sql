CREATE TYPE "public"."organization_membership_status" AS ENUM('invited', 'active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."office_access_policy" AS ENUM('all', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('organization_admin', 'operations_manager', 'dispatcher', 'technical_reviewer', 'field_technician', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'invited', 'suspended', 'disabled');--> statement-breakpoint
CREATE TABLE "external_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_subject" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"last_authenticated_at" timestamp (3) with time zone,
	CONSTRAINT "external_identities_provider_subject_unique" UNIQUE("provider","provider_subject"),
	CONSTRAINT "external_identities_provider_not_blank_check" CHECK (length(trim("external_identities"."provider")) > 0),
	CONSTRAINT "external_identities_subject_not_blank_check" CHECK (length(trim("external_identities"."provider_subject")) > 0)
);
--> statement-breakpoint
CREATE TABLE "office_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"organization_membership_id" uuid NOT NULL,
	"office_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "office_assignments_membership_office_unique" UNIQUE("organization_membership_id","office_id")
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_role" NOT NULL,
	"status" "organization_membership_status" DEFAULT 'invited' NOT NULL,
	"office_access" "office_access_policy" DEFAULT 'restricted' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_memberships_organization_user_unique" UNIQUE("organization_id","user_id"),
	CONSTRAINT "organization_memberships_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"last_authenticated_at" timestamp (3) with time zone,
	CONSTRAINT "users_normalized_email_unique" UNIQUE("normalized_email"),
	CONSTRAINT "users_email_not_blank_check" CHECK (length(trim("users"."email")) > 0),
	CONSTRAINT "users_normalized_email_format_check" CHECK ("users"."normalized_email" = lower(trim("users"."normalized_email")) and length("users"."normalized_email") > 2),
	CONSTRAINT "users_display_name_not_blank_check" CHECK (length(trim("users"."display_name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "office_assignments" ADD CONSTRAINT "office_assignments_membership_organization_fk" FOREIGN KEY ("organization_membership_id","organization_id") REFERENCES "public"."organization_memberships"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "office_assignments" ADD CONSTRAINT "office_assignments_office_organization_fk" FOREIGN KEY ("office_id","organization_id") REFERENCES "public"."offices"("id","organization_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "office_assignments" ADD CONSTRAINT "office_assignments_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_updated_by_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "external_identities_user_idx" ON "external_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "office_assignments_membership_idx" ON "office_assignments" USING btree ("organization_membership_id");--> statement-breakpoint
CREATE INDEX "office_assignments_organization_office_idx" ON "office_assignments" USING btree ("organization_id","office_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_user_status_idx" ON "organization_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "organization_memberships_organization_status_role_idx" ON "organization_memberships" USING btree ("organization_id","status","role");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");