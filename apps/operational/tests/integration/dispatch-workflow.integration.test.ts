import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { permissionsForRole } from "../../src/server/auth/permissions";
import type { AuthorizationContext } from "../../src/server/auth/types";
import {
  assignmentEvents,
  assignmentTechnicians,
  dispatchAssignments,
  officeAssignments,
  offices,
  organizationMemberships,
  organizations,
  technicianOfficeEligibilities,
  users,
  workOrders,
} from "../../src/server/db/schema";
import {
  closeDatabasePool,
  getDatabase,
  type OperationalDatabase,
} from "../../src/server/db/client";
import {
  getAuthorizedTestDatabaseCleanupConfig,
  runAuthorizedTestDatabaseCleanup,
  type AuthorizedTestDatabaseCleanupConfig,
} from "../../src/server/db/test-safety";
import {
  addTechnicianEligibility,
  createServiceType,
  updateServiceType,
} from "../../src/server/operational-records/catalog-service";
import {
  createDispatchAssignment,
  createProject,
  createTechnician,
  createWorkOrder,
} from "../../src/server/operational-records/service";
import {
  acknowledgeOwnAssignment,
  addSupportTechnician,
  assignPrimaryTechnician,
  listMyAssignments,
  transitionAssignment,
  transitionWorkOrder,
} from "../../src/server/dispatch/service";
import { getPostgresErrorInfo } from "../../src/server/tenancy/errors";

let db: OperationalDatabase;
let safety: AuthorizedTestDatabaseCleanupConfig;
let fixture: Awaited<ReturnType<typeof seedFixture>>;

const startAt = new Date("2026-11-01T05:30:00.000Z");
const endAt = new Date("2026-11-01T07:30:00.000Z");

beforeAll(() => {
  safety = getAuthorizedTestDatabaseCleanupConfig();
  db = getDatabase(safety.databaseUrl);
});

beforeEach(async () => {
  await cleanup(db);
  fixture = await seedFixture(db);
});

afterAll(async () => {
  await cleanup(db);
  await closeDatabasePool();
});

describe("Phase 5E-B dispatch workflow", () => {
  it("creates tenant-owned service types, rejects duplicate keys and cross-tenant references, and preserves historical work after archival", async () => {
    const concrete = mustCreated(
      await createServiceType(db, fixture.managerContext, {
        key: "concrete_placement",
        name: "Concrete placement inspection",
        category: "concrete",
      }),
    );
    expect(
      await createServiceType(db, fixture.managerContext, {
        key: "concrete_placement",
        name: "Duplicate concrete",
        category: "concrete",
      }),
    ).toEqual({ status: "conflict", reason: "service_type_key_already_exists" });

    const project = await makeProject("service-catalog");
    const workOrder = mustCreated(
      await createWorkOrder(db, fixture.managerContext, workOrderInput(
        project.id,
        concrete.id,
        "service-catalog",
      )),
    );
    expect(workOrder.serviceTypeId).toBe(concrete.id);

    const archived = await updateServiceType(db, fixture.managerContext, {
      serviceTypeId: concrete.id,
      expectedVersion: concrete.version,
      name: concrete.name,
      category: concrete.category,
      status: "archived",
      description: concrete.description,
    });
    expect(archived.status).toBe("ok");
    expect((await db.select().from(workOrders)).map((row) => row.id)).toContain(
      workOrder.id,
    );
    expect(
      await createWorkOrder(db, fixture.managerContext, workOrderInput(
        project.id,
        concrete.id,
        "archived-reuse",
      )),
    ).toEqual({ status: "inactive_reference", reason: "service_type_inactive" });

    const betaService = await createServiceType(db, fixture.betaAdminContext, {
      key: "beta_concrete",
      name: "Beta concrete",
      category: "concrete",
    });
    const betaServiceId = mustCreated(betaService).id;
    expect(
      await createWorkOrder(db, fixture.managerContext, workOrderInput(
        project.id,
        betaServiceId,
        "cross-tenant-service",
      )),
    ).toEqual({ status: "not_found_or_inaccessible" });
  });

  it("enforces technician office eligibility and blocks inactive technicians from new assignments", async () => {
    const technician = await makeTechnician("eligibility");
    const added = await addTechnicianEligibility(db, fixture.managerContext, {
      technicianId: technician.id,
      officeId: fixture.alphaSecondOffice.id,
    });
    expect(added.status).toBe("created");
    expect(
      await addTechnicianEligibility(db, fixture.managerContext, {
        technicianId: technician.id,
        officeId: fixture.alphaSecondOffice.id,
      }),
    ).toEqual({
      status: "conflict",
      reason: "technician_eligibility_already_exists",
    });

    const betaTechnician = await makeBetaTechnician("cross-org-eligibility");
    const error = await captureError(() =>
      db.insert(technicianOfficeEligibilities).values({
        organizationId: fixture.alphaOrganization.id,
        officeId: fixture.alphaOffice.id,
        technicianId: betaTechnician.id,
        createdByUserId: fixture.managerUser.id,
      }),
    );
    expect(getPostgresErrorInfo(error)).toMatchObject({
      code: "23503",
      constraint: "technician_eligibilities_technician_organization_fk",
    });

    const inactive = await makeTechnician("inactive", undefined, "inactive");
    const assignment = await makeUnassignedAssignment("inactive-target");
    expect(
      await assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: assignment.id,
        technicianId: inactive.id,
        expectedVersion: assignment.version,
      }),
    ).toEqual({ status: "inactive_reference", reason: "technician_inactive" });
  });

  it("enforces one primary, permits multiple support technicians, prevents duplicate active relationships, and preserves reassignment history", async () => {
    const primary = await makeTechnician("primary");
    const replacement = await makeTechnician("replacement");
    const supportOne = await makeTechnician("support-one");
    const supportTwo = await makeTechnician("support-two");
    let assignment = await makeUnassignedAssignment("relationships");

    assignment = mustOk(
      await assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: assignment.id,
        technicianId: primary.id,
        expectedVersion: assignment.version,
      }),
    );
    assignment = mustOk(
      await addSupportTechnician(db, fixture.dispatcherContext, {
        assignmentId: assignment.id,
        technicianId: supportOne.id,
        expectedVersion: assignment.version,
      }),
    );
    assignment = mustOk(
      await addSupportTechnician(db, fixture.dispatcherContext, {
        assignmentId: assignment.id,
        technicianId: supportTwo.id,
        expectedVersion: assignment.version,
      }),
    );
    expect(
      await addSupportTechnician(db, fixture.dispatcherContext, {
        assignmentId: assignment.id,
        technicianId: supportTwo.id,
        expectedVersion: assignment.version,
      }),
    ).toEqual({ status: "invalid_transition" });

    const primaryConstraintError = await captureError(() =>
      db.insert(assignmentTechnicians).values({
        organizationId: fixture.alphaOrganization.id,
        officeId: fixture.alphaOffice.id,
        dispatchAssignmentId: assignment.id,
        technicianId: replacement.id,
        role: "primary",
        assignedByUserId: fixture.managerUser.id,
      }),
    );
    expect(getPostgresErrorInfo(primaryConstraintError)).toMatchObject({
      code: "23505",
      constraint: "assignment_technicians_one_active_primary_idx",
    });

    assignment = mustOk(
      await assignPrimaryTechnician(db, fixture.dispatcherContext, {
        assignmentId: assignment.id,
        technicianId: replacement.id,
        expectedVersion: assignment.version,
      }),
    );
    const relationships = await db
      .select()
      .from(assignmentTechnicians)
      .where(eq(assignmentTechnicians.dispatchAssignmentId, assignment.id));
    expect(relationships.filter((row) => row.role === "support")).toHaveLength(2);
    expect(
      relationships.some(
        (row) => row.technicianId === primary.id && row.status === "ended",
      ),
    ).toBe(true);
    expect(
      relationships.some(
        (row) => row.technicianId === replacement.id && row.status === "active",
      ),
    ).toBe(true);
    const events = await assignmentHistory(assignment.id);
    expect(events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        "primary_assigned",
        "support_added",
        "primary_reassigned",
      ]),
    );
  });

  it("validates transitions and versions, appends history, allows only the linked primary to acknowledge, and never reopens terminal assignments", async () => {
    const linkedPrimary = await makeTechnician(
      "linked-primary",
      fixture.fieldMembership.id,
    );
    await makeTechnician("other-linked", fixture.otherFieldMembership.id);
    let assignment = await makeUnassignedAssignment("own-ack");
    expect(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "completed",
      }),
    ).toEqual({ status: "invalid_transition" });

    assignment = mustOk(
      await assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: assignment.id,
        technicianId: linkedPrimary.id,
        expectedVersion: assignment.version,
      }),
    );
    expect(
      await acknowledgeOwnAssignment(db, fixture.otherFieldContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "acknowledged",
      }),
    ).toEqual({ status: "not_found_or_inaccessible" });
    const staleVersion = assignment.version;
    assignment = mustOk(
      await acknowledgeOwnAssignment(db, fixture.fieldContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "acknowledged",
      }),
    );
    expect(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignment.id,
        expectedVersion: staleVersion,
        toStatus: "in_progress",
      }),
    ).toEqual({ status: "stale_update" });
    assignment = mustOk(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "in_progress",
      }),
    );
    assignment = mustOk(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "completed",
      }),
    );
    expect(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "in_progress",
      }),
    ).toEqual({ status: "invalid_transition" });
    expect((await assignmentHistory(assignment.id)).map((event) => event.eventType)).toEqual(
      expect.arrayContaining(["acknowledged", "started", "completed"]),
    );

    const own = await listMyAssignments(db, fixture.fieldContext);
    expect(own.status).toBe("ok");
    if (own.status === "ok") {
      expect(own.values.map((item) => item.assignment.id)).toEqual([assignment.id]);
    }
  });

  it("rolls back assignment status when history insertion fails and enforces append-only events", async () => {
    const primary = await makeTechnician("history-rollback");
    let assignment = await makeUnassignedAssignment("history-rollback");
    assignment = mustOk(
      await assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: assignment.id,
        technicianId: primary.id,
        expectedVersion: assignment.version,
      }),
    );
    const startingVersion = assignment.version;

    await db.execute(sql`
      create function fail_phase_5e_history_insert() returns trigger language plpgsql as $$
      begin raise exception 'forced history failure'; end $$
    `);
    await db.execute(sql`
      create trigger fail_phase_5e_history_insert
      before insert on assignment_events
      for each statement execute function fail_phase_5e_history_insert()
    `);
    try {
      expect(
        await transitionAssignment(db, fixture.managerContext, {
          assignmentId: assignment.id,
          expectedVersion: assignment.version,
          toStatus: "acknowledged",
        }),
      ).toEqual({ status: "persistence_error", reason: "database_error" });
    } finally {
      await db.execute(sql`drop trigger fail_phase_5e_history_insert on assignment_events`);
      await db.execute(sql`drop function fail_phase_5e_history_insert()`);
    }
    const [unchanged] = await db
      .select()
      .from(dispatchAssignments)
      .where(eq(dispatchAssignments.id, assignment.id));
    expect(unchanged).toMatchObject({ status: "assigned", version: startingVersion });

    const [event] = await db
      .select()
      .from(assignmentEvents)
      .where(eq(assignmentEvents.dispatchAssignmentId, assignment.id))
      .limit(1);
    const mutationError = await captureError(() =>
      db
        .update(assignmentEvents)
        .set({ reason: "attempted mutation" })
        .where(eq(assignmentEvents.id, event.id)),
    );
    expect(getPostgresErrorInfo(mutationError).code).toBe("55000");
  });

  it("reconciles work orders transactionally through scheduled, in-progress, completed, and cancelled policies", async () => {
    const primary = await makeTechnician("reconcile");
    let assignment = await makeUnassignedAssignment("reconcile");
    let [workOrder] = await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.id, assignment.workOrderId));
    expect(workOrder.status).toBe("scheduled");

    assignment = mustOk(
      await assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: assignment.id,
        technicianId: primary.id,
        expectedVersion: assignment.version,
      }),
    );
    assignment = mustOk(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "acknowledged",
      }),
    );
    assignment = mustOk(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "in_progress",
      }),
    );
    [workOrder] = await db.select().from(workOrders).where(eq(workOrders.id, assignment.workOrderId));
    expect(workOrder.status).toBe("in_progress");
    assignment = mustOk(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "completed",
      }),
    );
    [workOrder] = await db.select().from(workOrders).where(eq(workOrders.id, assignment.workOrderId));
    expect(workOrder.status).toBe("completed");

    const cancelledWorkOrder = await makeReadyWorkOrder("cancelled-work-order");
    const cancelled = await transitionWorkOrder(db, fixture.managerContext, {
      workOrderId: cancelledWorkOrder.id,
      expectedVersion: cancelledWorkOrder.version,
      toStatus: "cancelled",
      reason: "Customer cancelled visit",
    });
    expect(cancelled.status).toBe("ok");
    expect(
      await createDispatchAssignment(db, fixture.managerContext, assignmentInput(
        cancelledWorkOrder.id,
        "cancelled-reject",
      )),
    ).toEqual({ status: "invalid_transition" });
  });

  it("rolls back assignment transition and history when work-order reconciliation fails", async () => {
    const primary = await makeTechnician("reconciliation-rollback");
    let assignment = await makeUnassignedAssignment("reconciliation-rollback");
    assignment = mustOk(
      await assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: assignment.id,
        technicianId: primary.id,
        expectedVersion: assignment.version,
      }),
    );
    assignment = mustOk(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "acknowledged",
      }),
    );
    const historyCount = (await assignmentHistory(assignment.id)).length;

    await db.execute(sql`
      create function fail_phase_5e_reconciliation() returns trigger language plpgsql as $$
      begin raise exception 'forced reconciliation failure'; end $$
    `);
    await db.execute(sql`
      create trigger fail_phase_5e_reconciliation
      before update on work_orders
      for each statement execute function fail_phase_5e_reconciliation()
    `);
    try {
      expect(
        await transitionAssignment(db, fixture.managerContext, {
          assignmentId: assignment.id,
          expectedVersion: assignment.version,
          toStatus: "in_progress",
        }),
      ).toEqual({ status: "persistence_error", reason: "database_error" });
    } finally {
      await db.execute(sql`drop trigger fail_phase_5e_reconciliation on work_orders`);
      await db.execute(sql`drop function fail_phase_5e_reconciliation()`);
    }
    const [unchanged] = await db.select().from(dispatchAssignments).where(eq(dispatchAssignments.id, assignment.id));
    expect(unchanged).toMatchObject({ status: "acknowledged", version: assignment.version });
    expect(await assignmentHistory(assignment.id)).toHaveLength(historyCount);
  });

  it("detects real overlaps, permits adjacent boundaries, ignores cancelled assignments, and strictly controls overrides", async () => {
    const technician = await makeTechnician("conflict");
    const first = await makeUnassignedAssignment("conflict-first");
    mustOk(
      await assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: first.id,
        technicianId: technician.id,
        expectedVersion: first.version,
      }),
    );
    const overlapping = await makeUnassignedAssignment("conflict-overlap");
    const blocked = await assignPrimaryTechnician(db, fixture.dispatcherContext, {
      assignmentId: overlapping.id,
      technicianId: technician.id,
      expectedVersion: overlapping.version,
    });
    expect(blocked.status).toBe("schedule_conflict");

    const adjacent = await makeUnassignedAssignment(
      "conflict-adjacent",
      endAt,
      new Date(endAt.getTime() + 60 * 60 * 1000),
    );
    expect(
      assignPrimaryTechnician(db, fixture.dispatcherContext, {
        assignmentId: adjacent.id,
        technicianId: technician.id,
        expectedVersion: adjacent.version,
      }),
    ).resolves.toMatchObject({ status: "ok" });

    expect(
      await assignPrimaryTechnician(db, fixture.dispatcherContext, {
        assignmentId: overlapping.id,
        technicianId: technician.id,
        expectedVersion: overlapping.version,
        overrideConflicts: true,
        overrideReason: "Dispatcher override attempt",
      }),
    ).toEqual({ status: "forbidden", reason: "missing_permission" });
    expect(
      await assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: overlapping.id,
        technicianId: technician.id,
        expectedVersion: overlapping.version,
        overrideConflicts: true,
      }),
    ).toMatchObject({ status: "validation_error" });
    const overridden = await assignPrimaryTechnician(db, fixture.managerContext, {
      assignmentId: overlapping.id,
      technicianId: technician.id,
      expectedVersion: overlapping.version,
      overrideConflicts: true,
      overrideReason: "Coverage approved by operations",
    });
    expect(overridden.status).toBe("ok");
    expect((await assignmentHistory(overlapping.id)).map((event) => event.eventType)).toContain(
      "conflict_overridden",
    );

    const cancelledTechnician = await makeTechnician("cancelled-conflict");
    const cancellableAssignment = await makeUnassignedAssignment("cancelled-conflict-one");
    const assignedForCancellation = mustOk(
      await assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: cancellableAssignment.id,
        technicianId: cancelledTechnician.id,
        expectedVersion: cancellableAssignment.version,
      }),
    );
    mustOk(
      await transitionAssignment(db, fixture.managerContext, {
        assignmentId: assignedForCancellation.id,
        expectedVersion: assignedForCancellation.version,
        toStatus: "cancelled",
        reason: "Weather cancellation",
      }),
    );
    const afterCancel = await makeUnassignedAssignment("cancelled-conflict-two");
    expect(
      assignPrimaryTechnician(db, fixture.managerContext, {
        assignmentId: afterCancel.id,
        technicianId: cancelledTechnician.id,
        expectedVersion: afterCancel.version,
      }),
    ).resolves.toMatchObject({ status: "ok" });
  });

  it("enforces composite tenant guards and returns non-leaking results for cross-tenant assignment access", async () => {
    const technician = await makeTechnician("tenant-guard");
    const assignment = await makeUnassignedAssignment("tenant-guard");
    const eventError = await captureError(() =>
      db.insert(assignmentEvents).values({
        organizationId: fixture.betaOrganization.id,
        officeId: fixture.betaOffice.id,
        dispatchAssignmentId: assignment.id,
        eventType: "created",
        actedByUserId: fixture.betaAdminUser.id,
        assignmentVersion: 1,
      }),
    );
    expect(getPostgresErrorInfo(eventError)).toMatchObject({
      code: "23503",
      constraint: "assignment_events_assignment_scope_fk",
    });
    const relationshipError = await captureError(() =>
      db.insert(assignmentTechnicians).values({
        organizationId: fixture.betaOrganization.id,
        officeId: fixture.betaOffice.id,
        dispatchAssignmentId: assignment.id,
        technicianId: technician.id,
        role: "primary",
        assignedByUserId: fixture.betaAdminUser.id,
      }),
    );
    expect(getPostgresErrorInfo(relationshipError).code).toBe("23503");

    expect(
      await transitionAssignment(db, fixture.betaAdminContext, {
        assignmentId: assignment.id,
        expectedVersion: assignment.version,
        toStatus: "cancelled",
        reason: "Crafted cross-tenant request",
      }),
    ).toEqual({ status: "not_found_or_inaccessible" });
  });
});

async function makeProject(key: string) {
  return mustCreated(
    await createProject(db, fixture.managerContext, {
      officeId: fixture.alphaOffice.id,
      sourceSystem: "phase5e.test",
      sourceProjectId: `project-${key}`,
      projectNumber: `P-${key}`,
      name: `Project ${key}`,
      address: "100 Test Way, Alexandria, VA",
    }),
  );
}

async function makeTechnician(
  key: string,
  organizationMembershipId?: string,
  status: "active" | "inactive" | "on_leave" = "active",
) {
  return mustCreated(
    await createTechnician(db, fixture.managerContext, {
      officeId: fixture.alphaOffice.id,
      sourceSystem: "phase5e.test",
      sourceTechnicianId: `technician-${key}`,
      displayName: `Technician ${key}`,
      operationalRole: "Field Technician",
      organizationMembershipId,
      status,
    }),
  );
}

async function makeBetaTechnician(key: string) {
  return mustCreated(
    await createTechnician(db, fixture.betaAdminContext, {
      officeId: fixture.betaOffice.id,
      sourceSystem: "phase5e.test",
      sourceTechnicianId: `technician-${key}`,
      displayName: `Technician ${key}`,
    }),
  );
}

async function makeReadyWorkOrder(
  key: string,
  scheduledStartAt = startAt,
  scheduledEndAt = endAt,
) {
  const project = await makeProject(key);
  const workOrder = mustCreated(
    await createWorkOrder(
      db,
      fixture.managerContext,
      workOrderInput(
        project.id,
        fixture.concreteServiceType.id,
        key,
        scheduledStartAt,
        scheduledEndAt,
      ),
    ),
  );
  return mustOk(
    await transitionWorkOrder(db, fixture.managerContext, {
      workOrderId: workOrder.id,
      expectedVersion: workOrder.version,
      toStatus: "ready_for_dispatch",
    }),
  );
}

async function makeUnassignedAssignment(
  key: string,
  assignmentStartAt = startAt,
  assignmentEndAt = endAt,
) {
  const workOrder = await makeReadyWorkOrder(key, assignmentStartAt, assignmentEndAt);
  return mustCreated(
    await createDispatchAssignment(
      db,
      fixture.managerContext,
      assignmentInput(workOrder.id, key, assignmentStartAt, assignmentEndAt),
    ),
  );
}

function workOrderInput(
  projectId: string,
  serviceTypeId: string,
  key: string,
  scheduledStartAt = startAt,
  scheduledEndAt = endAt,
) {
  return {
    officeId: fixture.alphaOffice.id,
    projectId,
    serviceTypeId,
    sourceSystem: "phase5e.test",
    sourceWorkOrderId: `work-order-${key}`,
    workOrderNumber: `WO-${key}`,
    jobSiteName: `Site ${key}`,
    priority: "normal",
    dispatchInstructions: "Check in with the site superintendent.",
    scheduledStartAt,
    scheduledEndAt,
  };
}

function assignmentInput(
  workOrderId: string,
  key: string,
  assignmentStartAt = startAt,
  assignmentEndAt = endAt,
) {
  return {
    officeId: fixture.alphaOffice.id,
    workOrderId,
    sourceSystem: "phase5e.test",
    sourceAssignmentId: `assignment-${key}`,
    assignmentStartAt,
    assignmentEndAt,
  };
}

async function assignmentHistory(assignmentId: string) {
  return db
    .select()
    .from(assignmentEvents)
    .where(eq(assignmentEvents.dispatchAssignmentId, assignmentId))
    .orderBy(assignmentEvents.occurredAt, assignmentEvents.assignmentVersion);
}

function mustCreated<T>(result: { status: string; value?: T }): T {
  if (result.status !== "created" || result.value === undefined) {
    throw new Error(`Expected created result, received ${JSON.stringify(result)}`);
  }
  return result.value;
}

function mustOk<T>(result: { status: string; value?: T }): T {
  if (result.status !== "ok" || result.value === undefined) {
    throw new Error(`Expected ok result, received ${JSON.stringify(result)}`);
  }
  return result.value;
}

async function captureError(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  throw new Error("Expected database operation to fail.");
}

async function seedFixture(database: OperationalDatabase) {
  const [alphaOrganization, betaOrganization] = await database
    .insert(organizations)
    .values([
      { slug: "phase5e-alpha", name: "Alpha Engineering" },
      { slug: "phase5e-beta", name: "Beta Testing" },
    ])
    .returning();
  const [alphaOffice, alphaSecondOffice, betaOffice] = await database
    .insert(offices)
    .values([
      {
        organizationId: alphaOrganization.id,
        code: "ALX",
        name: "Alexandria",
        timeZone: "America/New_York",
      },
      {
        organizationId: alphaOrganization.id,
        code: "RCH",
        name: "Richmond",
        timeZone: "America/New_York",
      },
      {
        organizationId: betaOrganization.id,
        code: "BET",
        name: "Beta Office",
        timeZone: "America/Chicago",
      },
    ])
    .returning();
  const [
    managerUser,
    dispatcherUser,
    viewerUser,
    reviewerUser,
    fieldUser,
    otherFieldUser,
    betaAdminUser,
  ] = await database
    .insert(users)
    .values([
      user("manager@alpha.example", "Alpha Operations Manager"),
      user("dispatcher@alpha.example", "Alpha Dispatcher"),
      user("viewer@alpha.example", "Alpha Viewer"),
      user("reviewer@alpha.example", "Alpha Reviewer"),
      user("field@alpha.example", "Alpha Field Technician"),
      user("other-field@alpha.example", "Other Field Technician"),
      user("admin@beta.example", "Beta Admin"),
    ])
    .returning();
  const [
    managerMembership,
    dispatcherMembership,
    ,
    ,
    fieldMembership,
    otherFieldMembership,
    betaAdminMembership,
  ] = await database
    .insert(organizationMemberships)
    .values([
      membership(alphaOrganization.id, managerUser.id, "operations_manager", "all", managerUser.id),
      membership(alphaOrganization.id, dispatcherUser.id, "dispatcher", "restricted", managerUser.id),
      membership(alphaOrganization.id, viewerUser.id, "viewer", "all", managerUser.id),
      membership(alphaOrganization.id, reviewerUser.id, "technical_reviewer", "all", managerUser.id),
      membership(alphaOrganization.id, fieldUser.id, "field_technician", "restricted", managerUser.id),
      membership(alphaOrganization.id, otherFieldUser.id, "field_technician", "restricted", managerUser.id),
      membership(betaOrganization.id, betaAdminUser.id, "organization_admin", "all", betaAdminUser.id),
    ])
    .returning();
  await database.insert(officeAssignments).values(
    [dispatcherMembership, fieldMembership, otherFieldMembership].map((membershipRow) => ({
      organizationId: alphaOrganization.id,
      organizationMembershipId: membershipRow.id,
      officeId: alphaOffice.id,
      createdByUserId: managerUser.id,
    })),
  );

  const managerContext = authorizationContext(
    managerUser,
    managerMembership,
    alphaOrganization,
    "all",
    [alphaOffice.id, alphaSecondOffice.id],
  );
  const dispatcherContext = authorizationContext(
    dispatcherUser,
    dispatcherMembership,
    alphaOrganization,
    "restricted",
    [alphaOffice.id],
  );
  const fieldContext = authorizationContext(
    fieldUser,
    fieldMembership,
    alphaOrganization,
    "restricted",
    [alphaOffice.id],
  );
  const otherFieldContext = authorizationContext(
    otherFieldUser,
    otherFieldMembership,
    alphaOrganization,
    "restricted",
    [alphaOffice.id],
  );
  const betaAdminContext = authorizationContext(
    betaAdminUser,
    betaAdminMembership,
    betaOrganization,
    "all",
    [betaOffice.id],
  );
  const concreteServiceType = mustCreated(
    await createServiceType(database, managerContext, {
      key: "concrete_placement_inspection",
      name: "Concrete placement inspection",
      category: "concrete",
    }),
  );

  return {
    alphaOrganization,
    betaOrganization,
    alphaOffice,
    alphaSecondOffice,
    betaOffice,
    managerUser,
    betaAdminUser,
    fieldMembership,
    otherFieldMembership,
    managerContext,
    dispatcherContext,
    fieldContext,
    otherFieldContext,
    betaAdminContext,
    concreteServiceType,
  };
}

function user(email: string, displayName: string) {
  return {
    email,
    normalizedEmail: email,
    displayName,
    status: "active" as const,
  };
}

function membership(
  organizationId: string,
  userId: string,
  role:
    | "organization_admin"
    | "operations_manager"
    | "dispatcher"
    | "technical_reviewer"
    | "field_technician"
    | "viewer",
  officeAccess: "all" | "restricted",
  actorUserId: string,
) {
  return {
    organizationId,
    userId,
    role,
    status: "active" as const,
    officeAccess,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
  };
}

function authorizationContext(
  userRecord: typeof users.$inferSelect,
  membershipRecord: typeof organizationMemberships.$inferSelect,
  organization: typeof organizations.$inferSelect,
  officeAccess: "all" | "restricted",
  officeIds: string[],
): AuthorizationContext {
  return {
    user: {
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.displayName,
      status: "active",
    },
    membership: {
      id: membershipRecord.id,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationStatus: "active",
      role: membershipRecord.role,
      status: "active",
      officeAccess,
      officeIds,
    },
    permissions: permissionsForRole(membershipRecord.role),
    tenantScope: {
      organizationId: organization.id,
      officeAccess,
      officeIds,
    },
  };
}

async function cleanup(database: OperationalDatabase) {
  await database.transaction(async (transaction) => {
    await runAuthorizedTestDatabaseCleanup(
      safety,
      async () => {
        const result = await transaction.execute<{ database_name: string }>(sql`
          select current_database()::text as database_name
        `);
        return result.rows[0]?.database_name;
      },
      async () => {
        await transaction.execute(sql`truncate table
          "assignment_events",
          "assignment_technicians",
          "dispatch_assignments",
          "work_orders",
          "technician_office_eligibilities",
          "technicians",
          "projects",
          "service_types",
          "office_assignments",
          "external_identities",
          "organization_memberships",
          "users",
          "offices",
          "organizations"
          restart identity restrict`);
      },
    );
  });
}
