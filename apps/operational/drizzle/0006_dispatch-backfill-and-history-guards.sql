-- Preserve Phase 5E-A rows while introducing the Phase 5E-B lifecycle model.
UPDATE "projects"
SET "status" = CASE WHEN "is_active" THEN 'active'::"project_status" ELSE 'inactive'::"project_status" END;
--> statement-breakpoint
UPDATE "technicians"
SET
  "home_office_id" = "office_id",
  "status" = CASE WHEN "is_active" THEN 'active'::"technician_status" ELSE 'inactive'::"technician_status" END;
--> statement-breakpoint
UPDATE "work_orders" AS "work_order"
SET "time_zone" = "office"."time_zone"
FROM "offices" AS "office"
WHERE
  "office"."id" = "work_order"."office_id"
  AND "office"."organization_id" = "work_order"."organization_id";
--> statement-breakpoint
UPDATE "dispatch_assignments" AS "assignment"
SET "time_zone" = "office"."time_zone"
FROM "offices" AS "office"
WHERE
  "office"."id" = "assignment"."office_id"
  AND "office"."organization_id" = "assignment"."organization_id";
--> statement-breakpoint

-- Existing free-text service types receive deterministic legacy catalog entries.
INSERT INTO "service_types" (
  "organization_id",
  "key",
  "name",
  "category",
  "status",
  "description",
  "created_by_user_id",
  "updated_by_user_id"
)
SELECT DISTINCT
  "work_order"."organization_id",
  'legacy_' || substr(md5(lower(trim("work_order"."service_type"))), 1, 16),
  trim("work_order"."service_type"),
  CASE
    WHEN lower("work_order"."service_type") LIKE '%concrete%' THEN 'concrete'::"service_type_category"
    WHEN lower("work_order"."service_type") LIKE '%soil%' THEN 'soils'::"service_type_category"
    WHEN lower("work_order"."service_type") LIKE '%mason%' THEN 'masonry'::"service_type_category"
    WHEN lower("work_order"."service_type") LIKE '%reinforc%' THEN 'reinforcing_steel'::"service_type_category"
    WHEN lower("work_order"."service_type") LIKE '%structural%steel%' THEN 'structural_steel'::"service_type_category"
    WHEN lower("work_order"."service_type") LIKE '%fireproof%' THEN 'fireproofing'::"service_type_category"
    WHEN lower("work_order"."service_type") LIKE '%asphalt%' THEN 'asphalt'::"service_type_category"
    ELSE 'other'::"service_type_category"
  END,
  'active'::"service_type_status",
  'Migrated from the Phase 5E-A work-order display value.',
  "actor"."user_id",
  "actor"."user_id"
FROM "work_orders" AS "work_order"
CROSS JOIN LATERAL (
  SELECT "membership"."user_id"
  FROM "organization_memberships" AS "membership"
  WHERE "membership"."organization_id" = "work_order"."organization_id"
  ORDER BY
    CASE WHEN "membership"."status" = 'active' THEN 0 ELSE 1 END,
    "membership"."created_at",
    "membership"."id"
  LIMIT 1
) AS "actor"
ON CONFLICT ("organization_id", "key") DO NOTHING;
--> statement-breakpoint
UPDATE "work_orders" AS "work_order"
SET "service_type_id" = "service_type"."id"
FROM "service_types" AS "service_type"
WHERE
  "service_type"."organization_id" = "work_order"."organization_id"
  AND "service_type"."key" = 'legacy_' || substr(md5(lower(trim("work_order"."service_type"))), 1, 16);
--> statement-breakpoint

INSERT INTO "technician_office_eligibilities" (
  "organization_id",
  "office_id",
  "technician_id",
  "created_by_user_id"
)
SELECT
  "technician"."organization_id",
  "technician"."office_id",
  "technician"."id",
  "actor"."user_id"
FROM "technicians" AS "technician"
CROSS JOIN LATERAL (
  SELECT "membership"."user_id"
  FROM "organization_memberships" AS "membership"
  WHERE "membership"."organization_id" = "technician"."organization_id"
  ORDER BY
    CASE WHEN "membership"."status" = 'active' THEN 0 ELSE 1 END,
    "membership"."created_at",
    "membership"."id"
  LIMIT 1
) AS "actor"
ON CONFLICT ("technician_id", "office_id") DO NOTHING;
--> statement-breakpoint

UPDATE "dispatch_assignments"
SET
  "status" = CASE
    WHEN "is_active" THEN 'assigned'::"dispatch_assignment_status"
    ELSE 'cancelled'::"dispatch_assignment_status"
  END,
  "cancellation_reason" = CASE
    WHEN "is_active" THEN NULL
    ELSE 'Migrated inactive Phase 5E-A assignment'
  END;
--> statement-breakpoint
INSERT INTO "assignment_technicians" (
  "organization_id",
  "office_id",
  "dispatch_assignment_id",
  "technician_id",
  "role",
  "status",
  "assigned_by_user_id",
  "assigned_at",
  "ended_by_user_id",
  "ended_at",
  "end_reason"
)
SELECT
  "organization_id",
  "office_id",
  "id",
  "technician_id",
  'primary'::"assignment_technician_role",
  CASE WHEN "is_active" THEN 'active'::"assignment_technician_status" ELSE 'ended'::"assignment_technician_status" END,
  "created_by_user_id",
  "created_at",
  CASE WHEN "is_active" THEN NULL ELSE "updated_by_user_id" END,
  CASE WHEN "is_active" THEN NULL ELSE "updated_at" END,
  CASE WHEN "is_active" THEN NULL ELSE 'Migrated inactive Phase 5E-A assignment' END
FROM "dispatch_assignments"
WHERE "technician_id" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "assignment_events" (
  "organization_id",
  "office_id",
  "dispatch_assignment_id",
  "event_type",
  "from_status",
  "to_status",
  "technician_id",
  "reason",
  "acted_by_user_id",
  "assignment_version",
  "occurred_at"
)
SELECT
  "organization_id",
  "office_id",
  "id",
  CASE WHEN "is_active" THEN 'primary_assigned'::"assignment_event_type" ELSE 'cancelled'::"assignment_event_type" END,
  'unassigned'::"dispatch_assignment_status",
  "status",
  "technician_id",
  CASE WHEN "is_active" THEN 'Migrated from Phase 5E-A' ELSE "cancellation_reason" END,
  "created_by_user_id",
  "version",
  "created_at"
FROM "dispatch_assignments";
--> statement-breakpoint

UPDATE "work_orders" AS "work_order"
SET
  "status" = CASE
    WHEN NOT "work_order"."is_active" THEN 'cancelled'::"work_order_status"
    WHEN EXISTS (
      SELECT 1
      FROM "dispatch_assignments" AS "assignment"
      WHERE
        "assignment"."organization_id" = "work_order"."organization_id"
        AND "assignment"."work_order_id" = "work_order"."id"
        AND "assignment"."status" <> 'cancelled'
    ) THEN 'scheduled'::"work_order_status"
    ELSE 'draft'::"work_order_status"
  END,
  "cancellation_reason" = CASE
    WHEN "work_order"."is_active" THEN NULL
    ELSE 'Migrated inactive Phase 5E-A work order'
  END;
--> statement-breakpoint

-- Composite guards make tenant and office scope inseparable from the assignment ID.
ALTER TABLE "assignment_events"
ADD CONSTRAINT "assignment_events_assignment_scope_fk"
FOREIGN KEY ("dispatch_assignment_id", "organization_id", "office_id")
REFERENCES "dispatch_assignments" ("id", "organization_id", "office_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "assignment_technicians"
ADD CONSTRAINT "assignment_technicians_assignment_scope_fk"
FOREIGN KEY ("dispatch_assignment_id", "organization_id", "office_id")
REFERENCES "dispatch_assignments" ("id", "organization_id", "office_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "dispatch_assignments"
ADD CONSTRAINT "dispatch_assignments_technician_organization_fk"
FOREIGN KEY ("technician_id", "organization_id")
REFERENCES "technicians" ("id", "organization_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "assignment_technicians"
ADD CONSTRAINT "assignment_technicians_technician_organization_fk"
FOREIGN KEY ("technician_id", "organization_id")
REFERENCES "technicians" ("id", "organization_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "assignment_events"
ADD CONSTRAINT "assignment_events_technician_organization_fk"
FOREIGN KEY ("technician_id", "organization_id")
REFERENCES "technicians" ("id", "organization_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "assignment_events"
ADD CONSTRAINT "assignment_events_previous_technician_organization_fk"
FOREIGN KEY ("previous_technician_id", "organization_id")
REFERENCES "technicians" ("id", "organization_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "technician_office_eligibilities"
ADD CONSTRAINT "technician_eligibilities_technician_organization_fk"
FOREIGN KEY ("technician_id", "organization_id")
REFERENCES "technicians" ("id", "organization_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint

-- Domain history is immutable; administrative test cleanup may still truncate it.
CREATE OR REPLACE FUNCTION "prevent_assignment_event_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'assignment_events are append-only' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "assignment_events_append_only"
BEFORE UPDATE OR DELETE ON "assignment_events"
FOR EACH STATEMENT
EXECUTE FUNCTION "prevent_assignment_event_mutation"();
