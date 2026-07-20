CREATE TYPE "public"."office_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"time_zone" text NOT NULL,
	"status" "office_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offices_organization_code_unique" UNIQUE("organization_id","code"),
	CONSTRAINT "offices_code_format_check" CHECK ("offices"."code" ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$'),
	CONSTRAINT "offices_name_not_blank_check" CHECK (length(trim("offices"."name")) > 0),
	CONSTRAINT "offices_time_zone_not_blank_check" CHECK (length(trim("offices"."time_zone")) > 0)
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" "organization_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_slug_format_check" CHECK ("organizations"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "organizations_name_not_blank_check" CHECK (length(trim("organizations"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "offices" ADD CONSTRAINT "offices_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE cascade;