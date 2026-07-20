import { getServerEnv } from "../src/lib/env/server";
import { closeDatabasePool, getDatabase } from "../src/server/db/client";
import {
  assignmentEvents,
  assignmentTechnicians,
  dispatchAssignments,
  projects,
  serviceTypes,
  technicianOfficeEligibilities,
  technicians,
  workOrders,
} from "../src/server/db/schema";
import {
  assertDevelopmentIdentitySeedingAllowed,
  developmentIdentityFixtures,
  developmentOffices,
  developmentOrganizations,
} from "../src/server/auth/development-fixtures";

const alphaAdmin = developmentIdentityFixtures.find(
  (fixture) => fixture.subject === "alpha-admin",
)!;
const alphaTechnicianUser = developmentIdentityFixtures.find(
  (fixture) => fixture.subject === "alpha-technician",
)!;
const betaAdmin = developmentIdentityFixtures.find(
  (fixture) => fixture.subject === "beta-admin",
)!;

const ids = {
  alphaConcrete: "50000000-0000-4000-8000-000000000001",
  alphaSoils: "50000000-0000-4000-8000-000000000002",
  alphaRebar: "50000000-0000-4000-8000-000000000003",
  betaConcrete: "50000000-0000-4000-8000-000000000004",
  betaSoils: "50000000-0000-4000-8000-000000000005",
  betaRebar: "50000000-0000-4000-8000-000000000006",
  alphaProject: "60000000-0000-4000-8000-000000000001",
  betaProject: "60000000-0000-4000-8000-000000000002",
  alphaPrimary: "70000000-0000-4000-8000-000000000001",
  alphaSupport: "70000000-0000-4000-8000-000000000002",
  betaPrimary: "70000000-0000-4000-8000-000000000003",
  alphaPrimaryEligibility: "71000000-0000-4000-8000-000000000001",
  alphaSupportEligibility: "71000000-0000-4000-8000-000000000002",
  betaPrimaryEligibility: "71000000-0000-4000-8000-000000000003",
  alphaWorkOrder: "80000000-0000-4000-8000-000000000001",
  betaWorkOrder: "80000000-0000-4000-8000-000000000002",
  alphaAssignment: "90000000-0000-4000-8000-000000000001",
  betaAssignment: "90000000-0000-4000-8000-000000000002",
  alphaPrimaryRelationship: "91000000-0000-4000-8000-000000000001",
  betaPrimaryRelationship: "91000000-0000-4000-8000-000000000002",
  alphaCreatedEvent: "92000000-0000-4000-8000-000000000001",
  alphaAssignedEvent: "92000000-0000-4000-8000-000000000002",
  betaCreatedEvent: "92000000-0000-4000-8000-000000000003",
  betaAssignedEvent: "92000000-0000-4000-8000-000000000004",
} as const;

async function main(): Promise<void> {
  const env = getServerEnv();
  assertDevelopmentIdentitySeedingAllowed(env);
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed dispatch fixtures.");
  }

  const db = getDatabase(env.DATABASE_URL);
  const alphaOrganization = developmentOrganizations[0];
  const betaOrganization = developmentOrganizations[1];
  const alphaOffice = developmentOffices[0];
  const betaOffice = developmentOffices[2];
  const alphaFieldMembership = alphaTechnicianUser.memberships[0];

  await db.transaction(async (transaction) => {
    await transaction
      .insert(serviceTypes)
      .values([
        serviceType(ids.alphaConcrete, alphaOrganization.id, "concrete_placement_inspection", "Concrete placement inspection", "concrete", alphaAdmin.id),
        serviceType(ids.alphaSoils, alphaOrganization.id, "soil_compaction_testing", "Soil compaction testing", "soils", alphaAdmin.id),
        serviceType(ids.alphaRebar, alphaOrganization.id, "reinforcing_steel_inspection", "Reinforcing-steel inspection", "reinforcing_steel", alphaAdmin.id),
        serviceType(ids.betaConcrete, betaOrganization.id, "concrete_placement_inspection", "Concrete placement inspection", "concrete", betaAdmin.id),
        serviceType(ids.betaSoils, betaOrganization.id, "soil_compaction_testing", "Soil compaction testing", "soils", betaAdmin.id),
        serviceType(ids.betaRebar, betaOrganization.id, "reinforcing_steel_inspection", "Reinforcing-steel inspection", "reinforcing_steel", betaAdmin.id),
      ])
      .onConflictDoNothing();

    await transaction
      .insert(projects)
      .values([
        {
          id: ids.alphaProject,
          organizationId: alphaOrganization.id,
          officeId: alphaOffice.id,
          sourceSystem: "cmtcommand.fixture",
          sourceProjectId: "alpha-waterfront-renovation",
          projectNumber: "ALPHA-1001",
          name: "Alpha Waterfront Renovation",
          address: "100 Waterfront Drive, Alexandria, VA",
        },
        {
          id: ids.betaProject,
          organizationId: betaOrganization.id,
          officeId: betaOffice.id,
          sourceSystem: "cmtcommand.fixture",
          sourceProjectId: "beta-lab-expansion",
          projectNumber: "BETA-2001",
          name: "Beta Laboratory Expansion",
          address: "200 Laboratory Lane, Fairfax, VA",
        },
      ])
      .onConflictDoNothing();

    await transaction
      .insert(technicians)
      .values([
        {
          id: ids.alphaPrimary,
          organizationId: alphaOrganization.id,
          officeId: alphaOffice.id,
          homeOfficeId: alphaOffice.id,
          sourceSystem: "cmtcommand.fixture",
          sourceTechnicianId: "alpha-linked-technician",
          displayName: "Alex Morgan",
          operationalRole: "Field Technician",
          workEmail: "alpha-technician@example.test",
          organizationMembershipId: alphaFieldMembership.id,
        },
        {
          id: ids.alphaSupport,
          organizationId: alphaOrganization.id,
          officeId: alphaOffice.id,
          homeOfficeId: alphaOffice.id,
          sourceSystem: "cmtcommand.fixture",
          sourceTechnicianId: "alpha-support-technician",
          displayName: "Jordan Rivera",
          operationalRole: "Field Technician",
          workEmail: "jordan.rivera@example.test",
        },
        {
          id: ids.betaPrimary,
          organizationId: betaOrganization.id,
          officeId: betaOffice.id,
          homeOfficeId: betaOffice.id,
          sourceSystem: "cmtcommand.fixture",
          sourceTechnicianId: "beta-technician",
          displayName: "Taylor Chen",
          operationalRole: "Field Technician",
          workEmail: "taylor.chen@example.test",
        },
      ])
      .onConflictDoNothing();

    await transaction
      .insert(technicianOfficeEligibilities)
      .values([
        eligibility(ids.alphaPrimaryEligibility, alphaOrganization.id, alphaOffice.id, ids.alphaPrimary, alphaAdmin.id),
        eligibility(ids.alphaSupportEligibility, alphaOrganization.id, alphaOffice.id, ids.alphaSupport, alphaAdmin.id),
        eligibility(ids.betaPrimaryEligibility, betaOrganization.id, betaOffice.id, ids.betaPrimary, betaAdmin.id),
      ])
      .onConflictDoNothing();

    const assignmentStartAt = new Date("2026-07-20T12:00:00.000Z");
    const assignmentEndAt = new Date("2026-07-20T16:00:00.000Z");
    await transaction
      .insert(workOrders)
      .values([
        {
          id: ids.alphaWorkOrder,
          organizationId: alphaOrganization.id,
          officeId: alphaOffice.id,
          projectId: ids.alphaProject,
          serviceTypeId: ids.alphaConcrete,
          sourceSystem: "cmtcommand.fixture",
          sourceWorkOrderId: "alpha-concrete-placement-001",
          workOrderNumber: "WO-ALPHA-001",
          serviceType: "Concrete placement inspection",
          jobSiteName: "Alpha Waterfront - Building A",
          priority: "high",
          status: "scheduled",
          timeZone: alphaOffice.timeZone,
          dispatchInstructions: "Check in at the north gate and call the superintendent.",
          scheduledStartAt: assignmentStartAt,
          scheduledEndAt: assignmentEndAt,
        },
        {
          id: ids.betaWorkOrder,
          organizationId: betaOrganization.id,
          officeId: betaOffice.id,
          projectId: ids.betaProject,
          serviceTypeId: ids.betaSoils,
          sourceSystem: "cmtcommand.fixture",
          sourceWorkOrderId: "beta-soil-compaction-001",
          workOrderNumber: "WO-BETA-001",
          serviceType: "Soil compaction testing",
          jobSiteName: "Beta Laboratory - East Pad",
          status: "scheduled",
          timeZone: betaOffice.timeZone,
          scheduledStartAt: assignmentStartAt,
          scheduledEndAt: assignmentEndAt,
        },
      ])
      .onConflictDoNothing();

    await transaction
      .insert(dispatchAssignments)
      .values([
        assignment(ids.alphaAssignment, alphaOrganization.id, alphaOffice.id, ids.alphaWorkOrder, ids.alphaPrimary, alphaAdmin.id, alphaOffice.timeZone, assignmentStartAt, assignmentEndAt, "alpha-assignment-001"),
        assignment(ids.betaAssignment, betaOrganization.id, betaOffice.id, ids.betaWorkOrder, ids.betaPrimary, betaAdmin.id, betaOffice.timeZone, assignmentStartAt, assignmentEndAt, "beta-assignment-001"),
      ])
      .onConflictDoNothing();

    await transaction
      .insert(assignmentTechnicians)
      .values([
        relationship(ids.alphaPrimaryRelationship, alphaOrganization.id, alphaOffice.id, ids.alphaAssignment, ids.alphaPrimary, alphaAdmin.id),
        relationship(ids.betaPrimaryRelationship, betaOrganization.id, betaOffice.id, ids.betaAssignment, ids.betaPrimary, betaAdmin.id),
      ])
      .onConflictDoNothing();

    await transaction
      .insert(assignmentEvents)
      .values([
        event(ids.alphaCreatedEvent, alphaOrganization.id, alphaOffice.id, ids.alphaAssignment, "created", null, "unassigned", null, alphaAdmin.id, 1, assignmentStartAt),
        event(ids.alphaAssignedEvent, alphaOrganization.id, alphaOffice.id, ids.alphaAssignment, "primary_assigned", "unassigned", "assigned", ids.alphaPrimary, alphaAdmin.id, 1, assignmentStartAt),
        event(ids.betaCreatedEvent, betaOrganization.id, betaOffice.id, ids.betaAssignment, "created", null, "unassigned", null, betaAdmin.id, 1, assignmentStartAt),
        event(ids.betaAssignedEvent, betaOrganization.id, betaOffice.id, ids.betaAssignment, "primary_assigned", "unassigned", "assigned", ids.betaPrimary, betaAdmin.id, 1, assignmentStartAt),
      ])
      .onConflictDoNothing();
  });

  process.stdout.write("Seeded deterministic Phase 5E dispatch fixtures.\n");
}

function serviceType(id: string, organizationId: string, key: string, name: string, category: "concrete" | "soils" | "reinforcing_steel", actorUserId: string) {
  return { id, organizationId, key, name, category, createdByUserId: actorUserId, updatedByUserId: actorUserId };
}

function eligibility(id: string, organizationId: string, officeId: string, technicianId: string, actorUserId: string) {
  return { id, organizationId, officeId, technicianId, createdByUserId: actorUserId };
}

function assignment(id: string, organizationId: string, officeId: string, workOrderId: string, technicianId: string, actorUserId: string, timeZone: string, assignmentStartAt: Date, assignmentEndAt: Date, sourceAssignmentId: string) {
  return { id, organizationId, officeId, workOrderId, technicianId, sourceSystem: "cmtcommand.fixture", sourceAssignmentId, assignmentStartAt, assignmentEndAt, createdByUserId: actorUserId, updatedByUserId: actorUserId, status: "assigned" as const, timeZone };
}

function relationship(id: string, organizationId: string, officeId: string, dispatchAssignmentId: string, technicianId: string, actorUserId: string) {
  return { id, organizationId, officeId, dispatchAssignmentId, technicianId, role: "primary" as const, assignedByUserId: actorUserId };
}

function event(id: string, organizationId: string, officeId: string, dispatchAssignmentId: string, eventType: "created" | "primary_assigned", fromStatus: "unassigned" | null, toStatus: "unassigned" | "assigned", technicianId: string | null, actorUserId: string, assignmentVersion: number, occurredAt: Date) {
  return { id, organizationId, officeId, dispatchAssignmentId, eventType, fromStatus, toStatus, technicianId, actedByUserId: actorUserId, assignmentVersion, occurredAt };
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown seed failure";
    process.stderr.write(`Dispatch fixture seed failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabasePool();
  });
