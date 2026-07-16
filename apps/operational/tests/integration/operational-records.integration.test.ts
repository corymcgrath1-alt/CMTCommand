import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { createAuthorizationRepository } from "../../src/server/auth/repository";
import { resolveAuthorizationState } from "../../src/server/auth/resolver";
import type { AuthorizationContext } from "../../src/server/auth/types";
import { closeDatabasePool, getDatabase, type OperationalDatabase } from "../../src/server/db/client";
import {
  dispatchAssignments,
  externalIdentities,
  officeAssignments,
  offices,
  organizationMemberships,
  organizations,
  projects,
  serviceTypes,
  technicians,
  users,
  workOrders,
  type DispatchAssignmentRecord,
  type ProjectRecord,
  type TechnicianRecord,
  type WorkOrderRecord,
} from "../../src/server/db/schema";
import {
  getAuthorizedTestDatabaseCleanupConfig,
  runAuthorizedTestDatabaseCleanup,
  type AuthorizedTestDatabaseCleanupConfig,
} from "../../src/server/db/test-safety";
import {
  createDispatchAssignment,
  createProject,
  createTechnician,
  createWorkOrder,
  findDispatchAssignmentById,
  findProjectById,
  findTechnicianById,
  findWorkOrderById,
  listDispatchAssignments,
  listProjects,
  listTechnicians,
  listWorkOrders,
} from "../../src/server/operational-records/service";
import {
  assignPrimaryTechnician,
  transitionWorkOrder,
} from "../../src/server/dispatch/service";
import type {
  OperationalRecordCreateResult,
  OperationalRecordListResult,
  OperationalRecordLookupResult,
  OperationalRecordMutationAction,
  OperationalRecordMutationMetadata,
} from "../../src/server/operational-records/results";
import { getPostgresErrorInfo } from "../../src/server/tenancy/errors";

let db: OperationalDatabase;
let testDatabaseConfig: AuthorizedTestDatabaseCleanupConfig;

const scheduledStartAt = new Date("2026-07-17T11:30:00.000Z");
const scheduledEndAt = new Date("2026-07-17T13:30:00.000Z");
const serviceTypeByOffice = new Map<string, string>();

beforeAll(() => {
  testDatabaseConfig = getAuthorizedTestDatabaseCleanupConfig();
  db = getDatabase(testDatabaseConfig.databaseUrl);
});

beforeEach(async () => {
  await cleanupTestRows(db);
});

afterAll(async () => {
  await cleanupTestRows(db);
  await closeDatabasePool();
});

describe("durable operational records", () => {
  it("has all four migrated operational-record tables", async () => {
    const result = await db.execute<{
      projects_exists: string | null;
      work_orders_exists: string | null;
      technicians_exists: string | null;
      dispatch_assignments_exists: string | null;
    }>(sql`
      select
        to_regclass('public.projects')::text as projects_exists,
        to_regclass('public.work_orders')::text as work_orders_exists,
        to_regclass('public.technicians')::text as technicians_exists,
        to_regclass('public.dispatch_assignments')::text as dispatch_assignments_exists
    `);

    expect(result.rows[0]).toEqual({
      projects_exists: "projects",
      work_orders_exists: "work_orders",
      technicians_exists: "technicians",
      dispatch_assignments_exists: "dispatch_assignments",
    });
  });

  it("enforces project text constraints for direct database writes", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const baseProject = {
      organizationId: fixture.organizationA.id,
      officeId: fixture.alphaOffice.id,
      sourceSystem: "direct-validation",
      sourceProjectId: "direct-project",
      projectNumber: "DIRECT-PROJECT",
      name: "Direct project",
    };

    await expectDirectCheckConstraints([
      {
        label: "project source id containing only a tab",
        constraint: "projects_source_project_id_not_blank_check",
        operation: () =>
          db.insert(projects).values({
            ...baseProject,
            sourceProjectId: "\t",
          }),
      },
      {
        label: "project number containing only a newline",
        constraint: "projects_project_number_not_blank_check",
        operation: () =>
          db.insert(projects).values({
            ...baseProject,
            sourceProjectId: "project-number-whitespace",
            projectNumber: "\n",
          }),
      },
      {
        label: "project name containing only tabs and newlines",
        constraint: "projects_name_not_blank_check",
        operation: () =>
          db.insert(projects).values({
            ...baseProject,
            sourceProjectId: "project-name-whitespace",
            name: "\t\n",
          }),
      },
      {
        label: "malformed project source system",
        constraint: "projects_source_system_format_check",
        operation: () =>
          db.insert(projects).values({
            ...baseProject,
            sourceSystem: "Malformed Source!",
            sourceProjectId: "project-malformed-source",
          }),
      },
    ]);
  });

  it("enforces required and optional technician text constraints for direct database writes", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const baseTechnician = {
      organizationId: fixture.organizationA.id,
      officeId: fixture.alphaOffice.id,
      homeOfficeId: fixture.alphaOffice.id,
      sourceSystem: "direct-validation",
      sourceTechnicianId: "direct-technician",
      displayName: "Direct technician",
    };

    await expectDirectCheckConstraints([
      {
        label: "technician source id containing only a newline",
        constraint: "technicians_source_technician_id_not_blank_check",
        operation: () =>
          db.insert(technicians).values({
            ...baseTechnician,
            sourceTechnicianId: "\n",
          }),
      },
      {
        label: "technician display name containing only a tab",
        constraint: "technicians_display_name_not_blank_check",
        operation: () =>
          db.insert(technicians).values({
            ...baseTechnician,
            sourceTechnicianId: "technician-name-whitespace",
            displayName: "\t",
          }),
      },
      {
        label: "optional operational role containing only whitespace controls",
        constraint: "technicians_operational_role_not_blank_check",
        operation: () =>
          db.insert(technicians).values({
            ...baseTechnician,
            sourceTechnicianId: "technician-role-whitespace",
            operationalRole: "\t\n",
          }),
      },
      {
        label: "optional work email containing only whitespace controls",
        constraint: "technicians_work_email_not_blank_check",
        operation: () =>
          db.insert(technicians).values({
            ...baseTechnician,
            sourceTechnicianId: "technician-email-whitespace",
            workEmail: "\n\t",
          }),
      },
      {
        label: "optional work phone containing only whitespace controls",
        constraint: "technicians_work_phone_not_blank_check",
        operation: () =>
          db.insert(technicians).values({
            ...baseTechnician,
            sourceTechnicianId: "technician-phone-whitespace",
            workPhone: "\t\n",
          }),
      },
      {
        label: "malformed technician source system",
        constraint: "technicians_source_system_format_check",
        operation: () =>
          db.insert(technicians).values({
            ...baseTechnician,
            sourceSystem: "Malformed Source!",
            sourceTechnicianId: "technician-malformed-source",
          }),
      },
    ]);
  });

  it("enforces work-order text and interval constraints for direct database writes", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const [project] = await db
      .insert(projects)
      .values({
        organizationId: fixture.organizationA.id,
        officeId: fixture.alphaOffice.id,
        sourceSystem: "direct-validation",
        sourceProjectId: "work-order-parent-project",
        projectNumber: "DIRECT-WO-PARENT",
        name: "Direct work-order parent",
      })
      .returning();
    const baseWorkOrder = {
      organizationId: fixture.organizationA.id,
      officeId: fixture.alphaOffice.id,
      projectId: project.id,
      serviceTypeId: fixture.alphaServiceType.id,
      sourceSystem: "direct-validation",
      sourceWorkOrderId: "direct-work-order",
      workOrderNumber: "DIRECT-WORK-ORDER",
      serviceType: "Concrete Testing",
      jobSiteName: "Direct job site",
      scheduledStartAt,
      scheduledEndAt,
    };

    await expectDirectCheckConstraints([
      {
        label: "work-order source id containing only a tab",
        constraint: "work_orders_source_work_order_id_not_blank_check",
        operation: () =>
          db.insert(workOrders).values({
            ...baseWorkOrder,
            sourceWorkOrderId: "\t",
          }),
      },
      {
        label: "work-order number containing only a newline",
        constraint: "work_orders_number_not_blank_check",
        operation: () =>
          db.insert(workOrders).values({
            ...baseWorkOrder,
            sourceWorkOrderId: "work-order-number-whitespace",
            workOrderNumber: "\n",
          }),
      },
      {
        label: "work-order service type containing only whitespace controls",
        constraint: "work_orders_service_type_not_blank_check",
        operation: () =>
          db.insert(workOrders).values({
            ...baseWorkOrder,
            sourceWorkOrderId: "work-order-service-whitespace",
            serviceType: "\t\n",
          }),
      },
      {
        label: "work-order job-site name containing only whitespace controls",
        constraint: "work_orders_job_site_name_not_blank_check",
        operation: () =>
          db.insert(workOrders).values({
            ...baseWorkOrder,
            sourceWorkOrderId: "work-order-site-whitespace",
            jobSiteName: "\n\t",
          }),
      },
      {
        label: "malformed work-order source system",
        constraint: "work_orders_source_system_format_check",
        operation: () =>
          db.insert(workOrders).values({
            ...baseWorkOrder,
            sourceSystem: "Malformed Source!",
            sourceWorkOrderId: "work-order-malformed-source",
          }),
      },
      {
        label: "work-order end not after start",
        constraint: "work_orders_schedule_order_check",
        operation: () =>
          db.insert(workOrders).values({
            ...baseWorkOrder,
            sourceWorkOrderId: "work-order-invalid-interval",
            scheduledEndAt: scheduledStartAt,
          }),
      },
    ]);
  });

  it("enforces dispatch-assignment text and interval constraints for direct database writes", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const [project] = await db
      .insert(projects)
      .values({
        organizationId: fixture.organizationA.id,
        officeId: fixture.alphaOffice.id,
        sourceSystem: "direct-validation",
        sourceProjectId: "assignment-parent-project",
        projectNumber: "DIRECT-ASSIGNMENT-PROJECT",
        name: "Direct assignment project",
      })
      .returning();
    const [technician] = await db
      .insert(technicians)
      .values({
        organizationId: fixture.organizationA.id,
        officeId: fixture.alphaOffice.id,
        homeOfficeId: fixture.alphaOffice.id,
        sourceSystem: "direct-validation",
        sourceTechnicianId: "assignment-parent-technician",
        displayName: "Direct assignment technician",
      })
      .returning();
    const [workOrder] = await db
      .insert(workOrders)
      .values({
        organizationId: fixture.organizationA.id,
        officeId: fixture.alphaOffice.id,
        projectId: project.id,
        serviceTypeId: fixture.alphaServiceType.id,
        sourceSystem: "direct-validation",
        sourceWorkOrderId: "assignment-parent-work-order",
        workOrderNumber: "DIRECT-ASSIGNMENT-WO",
        serviceType: "Concrete Testing",
        jobSiteName: "Direct assignment site",
        scheduledStartAt,
        scheduledEndAt,
      })
      .returning();
    const baseAssignment = {
      organizationId: fixture.organizationA.id,
      officeId: fixture.alphaOffice.id,
      sourceSystem: "direct-validation",
      sourceAssignmentId: "direct-assignment",
      workOrderId: workOrder.id,
      technicianId: technician.id,
      assignmentStartAt: scheduledStartAt,
      assignmentEndAt: scheduledEndAt,
      createdByUserId: fixture.alphaAdmin.id,
      updatedByUserId: fixture.alphaAdmin.id,
    };

    await expectDirectCheckConstraints([
      {
        label: "assignment source id containing only whitespace controls",
        constraint: "dispatch_assignments_source_assignment_id_not_blank_check",
        operation: () =>
          db.insert(dispatchAssignments).values({
            ...baseAssignment,
            sourceAssignmentId: "\t\n",
          }),
      },
      {
        label: "malformed assignment source system",
        constraint: "dispatch_assignments_source_system_format_check",
        operation: () =>
          db.insert(dispatchAssignments).values({
            ...baseAssignment,
            sourceSystem: "Malformed Source!",
            sourceAssignmentId: "assignment-malformed-source",
          }),
      },
      {
        label: "assignment end before start",
        constraint: "dispatch_assignments_schedule_order_check",
        operation: () =>
          db.insert(dispatchAssignments).values({
            ...baseAssignment,
            sourceAssignmentId: "assignment-invalid-interval",
            assignmentEndAt: new Date(
              scheduledStartAt.getTime() - 60 * 60 * 1000,
            ),
          }),
      },
    ]);
  });

  it("lets an organization admin create a durable chain with separate source and human identifiers", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );

    const chain = await createOperationalChain(
      db,
      admin,
      fixture.alphaOffice.id,
      "foundation",
      " Dispatch.Export ",
    );

    expect(chain.project.id).not.toBe(chain.project.sourceProjectId);
    expect(chain.project.sourceProjectId).toBe("source-project-foundation");
    expect(chain.project.projectNumber).toBe("PRJ-FOUNDATION");
    expect(chain.project.sourceSystem).toBe("dispatch.export");

    expect(chain.workOrder.id).not.toBe(chain.workOrder.sourceWorkOrderId);
    expect(chain.workOrder.sourceWorkOrderId).toBe(
      "source-work-order-foundation",
    );
    expect(chain.workOrder.workOrderNumber).toBe("TRD-FOUNDATION");
    expect(chain.workOrder.projectId).toBe(chain.project.id);
    expect(chain.workOrder.scheduledStartAt).toEqual(scheduledStartAt);
    expect(chain.workOrder.scheduledEndAt).toEqual(scheduledEndAt);

    expect(chain.technician.id).not.toBe(chain.technician.sourceTechnicianId);
    expect(chain.technician.sourceTechnicianId).toBe(
      "source-technician-foundation",
    );
    expect(chain.assignment.workOrderId).toBe(chain.workOrder.id);
    expect(chain.assignment.technicianId).toBe(chain.technician.id);
    expect(chain.assignment.createdByUserId).toBe(fixture.alphaAdmin.id);
    expect(chain.assignment.updatedByUserId).toBe(fixture.alphaAdmin.id);

    expectMutation(
      chain.mutations[0],
      "project.created",
      fixture.alphaAdmin.id,
      fixture.organizationA.id,
      chain.project.id,
    );
    expectMutation(
      chain.mutations[1],
      "technician.created",
      fixture.alphaAdmin.id,
      fixture.organizationA.id,
      chain.technician.id,
    );
    expectMutation(
      chain.mutations[2],
      "work_order.created",
      fixture.alphaAdmin.id,
      fixture.organizationA.id,
      chain.workOrder.id,
    );
    expectMutation(
      chain.mutations[3],
      "dispatch_assignment.created",
      fixture.alphaAdmin.id,
      fixture.organizationA.id,
      chain.assignment.id,
    );
  });

  it("normalizes source systems, permits the same source identifiers across organizations, and returns safe same-organization conflicts", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const alphaAdmin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    const betaAdmin = await authorizedContext(
      db,
      "beta-admin",
      fixture.organizationB.id,
    );
    const alpha = await createOperationalChain(
      db,
      alphaAdmin,
      fixture.alphaOffice.id,
      "shared",
      " Dispatch.Export ",
    );
    const beta = await createOperationalChain(
      db,
      betaAdmin,
      fixture.betaOffice.id,
      "shared",
      "DISPATCH.EXPORT",
    );

    expect(alpha.project.sourceSystem).toBe("dispatch.export");
    expect(beta.project.sourceSystem).toBe("dispatch.export");
    expect(alpha.project.sourceProjectId).toBe(beta.project.sourceProjectId);
    expect(alpha.technician.sourceTechnicianId).toBe(
      beta.technician.sourceTechnicianId,
    );
    expect(alpha.workOrder.sourceWorkOrderId).toBe(
      beta.workOrder.sourceWorkOrderId,
    );
    expect(alpha.assignment.sourceAssignmentId).toBe(
      beta.assignment.sourceAssignmentId,
    );
    expect(alpha.project.organizationId).not.toBe(beta.project.organizationId);

    const projectConflict = await createProject(
      db,
      alphaAdmin,
      projectInput(fixture.alphaSecondOffice.id, "shared", "DISPATCH.EXPORT"),
    );
    const technicianConflict = await createTechnician(
      db,
      alphaAdmin,
      technicianInput(
        fixture.alphaSecondOffice.id,
        "shared",
        "dispatch.export",
      ),
    );
    const workOrderConflict = await createWorkOrder(
      db,
      alphaAdmin,
      workOrderInput(
        fixture.alphaOffice.id,
        alpha.project.id,
        "shared",
        "dispatch.export",
      ),
    );
    const assignmentConflict = await createDispatchAssignment(
      db,
      alphaAdmin,
      assignmentInput(
        fixture.alphaOffice.id,
        alpha.workOrder.id,
        alpha.technician.id,
        "shared",
        "dispatch.export",
      ),
    );

    expect(projectConflict).toEqual({
      status: "conflict",
      reason: "project_source_already_exists",
    });
    expect(technicianConflict).toEqual({
      status: "conflict",
      reason: "technician_source_already_exists",
    });
    expect(workOrderConflict).toEqual({
      status: "conflict",
      reason: "work_order_source_already_exists",
    });
    expect(assignmentConflict).toEqual({
      status: "conflict",
      reason: "dispatch_assignment_source_already_exists",
    });

    for (const result of [
      projectConflict,
      technicianConflict,
      workOrderConflict,
      assignmentConflict,
    ]) {
      expectSafePublicResult(result);
    }
  });

  it("applies organization-wide, restricted-office, and empty-restricted scopes to all four record types", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const alphaAdmin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    const betaAdmin = await authorizedContext(
      db,
      "beta-admin",
      fixture.organizationB.id,
    );
    const dispatcher = await authorizedContext(
      db,
      "alpha-dispatcher",
      fixture.organizationA.id,
    );
    const emptyRestricted = emptyRestrictedContext(dispatcher);

    const alphaFirst = await createOperationalChain(
      db,
      alphaAdmin,
      fixture.alphaOffice.id,
      "alpha-first",
    );
    const alphaSecond = await createOperationalChain(
      db,
      alphaAdmin,
      fixture.alphaSecondOffice.id,
      "alpha-second",
    );
    const beta = await createOperationalChain(
      db,
      betaAdmin,
      fixture.betaOffice.id,
      "beta",
    );

    expectListIds(await listProjects(db, alphaAdmin), [
      alphaFirst.project.id,
      alphaSecond.project.id,
    ]);
    expectListIds(await listTechnicians(db, alphaAdmin), [
      alphaFirst.technician.id,
      alphaSecond.technician.id,
    ]);
    expectListIds(await listWorkOrders(db, alphaAdmin), [
      alphaFirst.workOrder.id,
      alphaSecond.workOrder.id,
    ]);
    expectListIds(await listDispatchAssignments(db, alphaAdmin), [
      alphaFirst.assignment.id,
      alphaSecond.assignment.id,
    ]);

    expectListIds(await listProjects(db, dispatcher), [alphaFirst.project.id]);
    expectListIds(await listTechnicians(db, dispatcher), [
      alphaFirst.technician.id,
    ]);
    expectListIds(await listWorkOrders(db, dispatcher), [
      alphaFirst.workOrder.id,
    ]);
    expectListIds(await listDispatchAssignments(db, dispatcher), [
      alphaFirst.assignment.id,
    ]);

    expectFoundId(
      await findProjectById(db, alphaAdmin, alphaSecond.project.id),
      alphaSecond.project.id,
    );
    expectFoundId(
      await findTechnicianById(db, alphaAdmin, alphaSecond.technician.id),
      alphaSecond.technician.id,
    );
    expectFoundId(
      await findWorkOrderById(db, alphaAdmin, alphaSecond.workOrder.id),
      alphaSecond.workOrder.id,
    );
    expectFoundId(
      await findDispatchAssignmentById(
        db,
        alphaAdmin,
        alphaSecond.assignment.id,
      ),
      alphaSecond.assignment.id,
    );

    expectFoundId(
      await findProjectById(db, dispatcher, alphaFirst.project.id),
      alphaFirst.project.id,
    );
    expectFoundId(
      await findTechnicianById(db, dispatcher, alphaFirst.technician.id),
      alphaFirst.technician.id,
    );
    expectFoundId(
      await findWorkOrderById(db, dispatcher, alphaFirst.workOrder.id),
      alphaFirst.workOrder.id,
    );
    expectFoundId(
      await findDispatchAssignmentById(
        db,
        dispatcher,
        alphaFirst.assignment.id,
      ),
      alphaFirst.assignment.id,
    );

    expectListIds(await listProjects(db, emptyRestricted), []);
    expectListIds(await listTechnicians(db, emptyRestricted), []);
    expectListIds(await listWorkOrders(db, emptyRestricted), []);
    expectListIds(await listDispatchAssignments(db, emptyRestricted), []);

    await expectInaccessibleAndNonexistentEquivalent(
      (id) => findProjectById(db, dispatcher, id),
      alphaSecond.project.id,
    );
    await expectInaccessibleAndNonexistentEquivalent(
      (id) => findTechnicianById(db, dispatcher, id),
      alphaSecond.technician.id,
    );
    await expectInaccessibleAndNonexistentEquivalent(
      (id) => findWorkOrderById(db, dispatcher, id),
      alphaSecond.workOrder.id,
    );
    await expectInaccessibleAndNonexistentEquivalent(
      (id) => findDispatchAssignmentById(db, dispatcher, id),
      alphaSecond.assignment.id,
    );

    await expectInaccessibleAndNonexistentEquivalent(
      (id) => findProjectById(db, alphaAdmin, id),
      beta.project.id,
    );
    await expectInaccessibleAndNonexistentEquivalent(
      (id) => findTechnicianById(db, alphaAdmin, id),
      beta.technician.id,
    );
    await expectInaccessibleAndNonexistentEquivalent(
      (id) => findWorkOrderById(db, alphaAdmin, id),
      beta.workOrder.id,
    );
    await expectInaccessibleAndNonexistentEquivalent(
      (id) => findDispatchAssignmentById(db, alphaAdmin, id),
      beta.assignment.id,
    );

    await expect(findProjectById(db, emptyRestricted, alphaFirst.project.id))
      .resolves.toEqual({ status: "not_found_or_inaccessible" });
    await expect(
      findTechnicianById(db, emptyRestricted, alphaFirst.technician.id),
    ).resolves.toEqual({ status: "not_found_or_inaccessible" });
    await expect(
      findWorkOrderById(db, emptyRestricted, alphaFirst.workOrder.id),
    ).resolves.toEqual({ status: "not_found_or_inaccessible" });
    await expect(
      findDispatchAssignmentById(
        db,
        emptyRestricted,
        alphaFirst.assignment.id,
      ),
    ).resolves.toEqual({ status: "not_found_or_inaccessible" });
  });

  it("rejects same-organization cross-office and cross-organization relationships through services", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const alphaAdmin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    const alphaRestrictedManager = await authorizedContext(
      db,
      "alpha-operations-manager",
      fixture.organizationA.id,
    );
    const betaAdmin = await authorizedContext(
      db,
      "beta-admin",
      fixture.organizationB.id,
    );
    const alphaFirst = await createOperationalChain(
      db,
      alphaAdmin,
      fixture.alphaOffice.id,
      "service-alpha-first",
    );
    await createOperationalChain(
      db,
      alphaAdmin,
      fixture.alphaSecondOffice.id,
      "service-alpha-second",
    );
    const beta = await createOperationalChain(
      db,
      betaAdmin,
      fixture.betaOffice.id,
      "service-beta",
    );

    const failures = [
      await createProject(
        db,
        alphaRestrictedManager,
        projectInput(fixture.alphaSecondOffice.id, "restricted-project"),
      ),
      await createTechnician(
        db,
        alphaRestrictedManager,
        technicianInput(fixture.alphaSecondOffice.id, "restricted-technician"),
      ),
      await createProject(
        db,
        alphaAdmin,
        projectInput(fixture.betaOffice.id, "cross-organization-project"),
      ),
      await createTechnician(
        db,
        alphaAdmin,
        technicianInput(
          fixture.betaOffice.id,
          "cross-organization-technician",
        ),
      ),
      await createWorkOrder(
        db,
        alphaAdmin,
        workOrderInput(
          fixture.alphaSecondOffice.id,
          alphaFirst.project.id,
          "cross-office-work-order",
        ),
      ),
      await createWorkOrder(
        db,
        alphaAdmin,
        workOrderInput(
          fixture.alphaOffice.id,
          beta.project.id,
          "cross-organization-work-order",
        ),
      ),
    ];

    for (const result of failures) {
      expect(result).toEqual({ status: "not_found_or_inaccessible" });
      expectSafePublicResult(result);
    }
  });

  it("enforces organization and office agreement with composite foreign keys", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const alphaAdmin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    const betaAdmin = await authorizedContext(
      db,
      "beta-admin",
      fixture.organizationB.id,
    );
    const alphaFirst = await createOperationalChain(
      db,
      alphaAdmin,
      fixture.alphaOffice.id,
      "fk-alpha-first",
    );
    const alphaSecond = await createOperationalChain(
      db,
      alphaAdmin,
      fixture.alphaSecondOffice.id,
      "fk-alpha-second",
    );
    const beta = await createOperationalChain(
      db,
      betaAdmin,
      fixture.betaOffice.id,
      "fk-beta",
    );

    await expectDatabaseConstraint(
      () =>
        db.insert(projects).values({
          organizationId: fixture.organizationA.id,
          officeId: fixture.betaOffice.id,
          sourceSystem: "direct",
          sourceProjectId: "cross-organization-project",
          projectNumber: "DIRECT-PROJECT",
          name: "Cross-organization project",
        }),
      "projects_office_organization_fk",
    );

    await expectDatabaseConstraint(
      () =>
        db.insert(technicians).values({
          organizationId: fixture.organizationA.id,
          officeId: fixture.betaOffice.id,
          homeOfficeId: fixture.betaOffice.id,
          sourceSystem: "direct",
          sourceTechnicianId: "cross-organization-technician",
          displayName: "Cross-organization technician",
        }),
      "technicians_office_organization_fk",
    );

    await expectDatabaseConstraint(
      () =>
        db.insert(workOrders).values({
          organizationId: fixture.organizationA.id,
          officeId: fixture.alphaSecondOffice.id,
          projectId: alphaFirst.project.id,
          serviceTypeId: fixture.alphaSecondOfficeServiceType.id,
          sourceSystem: "direct",
          sourceWorkOrderId: "cross-office-work-order",
          workOrderNumber: "DIRECT-CROSS-OFFICE",
          serviceType: "Concrete Testing",
          jobSiteName: "Cross-office site",
          scheduledStartAt,
          scheduledEndAt,
        }),
      "work_orders_project_organization_office_fk",
    );

    await expectDatabaseConstraint(
      () =>
        db.insert(workOrders).values({
          organizationId: fixture.organizationA.id,
          officeId: fixture.alphaOffice.id,
          projectId: beta.project.id,
          serviceTypeId: fixture.alphaServiceType.id,
          sourceSystem: "direct",
          sourceWorkOrderId: "cross-organization-work-order",
          workOrderNumber: "DIRECT-CROSS-ORG",
          serviceType: "Concrete Testing",
          jobSiteName: "Cross-organization site",
          scheduledStartAt,
          scheduledEndAt,
        }),
      "work_orders_project_organization_office_fk",
    );

    await expectDatabaseConstraint(
      () =>
        db.insert(dispatchAssignments).values({
          organizationId: fixture.organizationA.id,
          officeId: fixture.alphaOffice.id,
          sourceSystem: "direct",
          sourceAssignmentId: "cross-office-work-order-assignment",
          workOrderId: alphaSecond.workOrder.id,
          technicianId: alphaFirst.technician.id,
          assignmentStartAt: scheduledStartAt,
          assignmentEndAt: scheduledEndAt,
          createdByUserId: fixture.alphaAdmin.id,
          updatedByUserId: fixture.alphaAdmin.id,
        }),
      "dispatch_assignments_work_order_organization_office_fk",
    );

    await expectDatabaseConstraint(
      () =>
        db.insert(dispatchAssignments).values({
          organizationId: fixture.organizationA.id,
          officeId: fixture.alphaOffice.id,
          sourceSystem: "direct",
          sourceAssignmentId: "cross-organization-work-order-assignment",
          workOrderId: beta.workOrder.id,
          technicianId: alphaFirst.technician.id,
          assignmentStartAt: scheduledStartAt,
          assignmentEndAt: scheduledEndAt,
          createdByUserId: fixture.alphaAdmin.id,
          updatedByUserId: fixture.alphaAdmin.id,
        }),
      "dispatch_assignments_work_order_organization_office_fk",
    );

    await expectDatabaseConstraint(
      () =>
        db.insert(dispatchAssignments).values({
          organizationId: fixture.organizationA.id,
          officeId: fixture.alphaOffice.id,
          sourceSystem: "direct",
          sourceAssignmentId: "cross-organization-technician-assignment",
          workOrderId: alphaFirst.workOrder.id,
          technicianId: beta.technician.id,
          assignmentStartAt: scheduledStartAt,
          assignmentEndAt: scheduledEndAt,
          createdByUserId: fixture.alphaAdmin.id,
          updatedByUserId: fixture.alphaAdmin.id,
        }),
      "dispatch_assignments_technician_organization_fk",
    );
  });

  it("allows a dispatcher to manage work orders and assignments but not projects or technicians", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    const dispatcher = await authorizedContext(
      db,
      "alpha-dispatcher",
      fixture.organizationA.id,
    );
    const project = mustBeCreated(
      await createProject(
        db,
        admin,
        projectInput(fixture.alphaOffice.id, "dispatcher-foundation"),
      ),
    ).value;
    const technician = mustBeCreated(
      await createTechnician(
        db,
        admin,
        technicianInput(fixture.alphaOffice.id, "dispatcher-foundation"),
      ),
    ).value;
    const workOrder = mustBeCreated(
      await createWorkOrder(
        db,
        admin,
        workOrderInput(
          fixture.alphaOffice.id,
          project.id,
          "dispatcher-foundation",
        ),
      ),
    ).value;
    const readyWorkOrder = await transitionWorkOrder(db, admin, {
      workOrderId: workOrder.id,
      expectedVersion: workOrder.version,
      toStatus: "ready_for_dispatch",
    });
    expect(readyWorkOrder.status).toBe("ok");

    await expect(
      createProject(
        db,
        dispatcher,
        projectInput(fixture.alphaOffice.id, "dispatcher-project"),
      ),
    ).resolves.toEqual({ status: "forbidden", reason: "missing_permission" });
    await expect(
      createTechnician(
        db,
        dispatcher,
        technicianInput(fixture.alphaOffice.id, "dispatcher-technician"),
      ),
    ).resolves.toEqual({ status: "forbidden", reason: "missing_permission" });
    const dispatcherWorkOrder = await createWorkOrder(
        db,
        dispatcher,
        workOrderInput(
          fixture.alphaOffice.id,
          project.id,
          "dispatcher-work-order",
        ),
      );
    expect(dispatcherWorkOrder.status).toBe("created");

    const assignment = mustBeCreated(
      await createDispatchAssignment(
        db,
        dispatcher,
        assignmentInput(
          fixture.alphaOffice.id,
          workOrder.id,
          technician.id,
          "dispatcher-assignment",
        ),
      ),
    );
    expectMutation(
      assignment.mutation,
      "dispatch_assignment.created",
      fixture.alphaDispatcher.id,
      fixture.organizationA.id,
      assignment.value.id,
    );
  });

  it("denies every operational-record write to viewers", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    const viewer = await authorizedContext(
      db,
      "alpha-viewer",
      fixture.organizationA.id,
    );
    const project = mustBeCreated(
      await createProject(
        db,
        admin,
        projectInput(fixture.alphaOffice.id, "viewer-foundation"),
      ),
    ).value;
    const technician = mustBeCreated(
      await createTechnician(
        db,
        admin,
        technicianInput(fixture.alphaOffice.id, "viewer-foundation"),
      ),
    ).value;
    const workOrder = mustBeCreated(
      await createWorkOrder(
        db,
        admin,
        workOrderInput(
          fixture.alphaOffice.id,
          project.id,
          "viewer-foundation",
        ),
      ),
    ).value;

    const deniedResults = [
      await createProject(
        db,
        viewer,
        projectInput(fixture.alphaOffice.id, "viewer-project"),
      ),
      await createTechnician(
        db,
        viewer,
        technicianInput(fixture.alphaOffice.id, "viewer-technician"),
      ),
      await createWorkOrder(
        db,
        viewer,
        workOrderInput(
          fixture.alphaOffice.id,
          project.id,
          "viewer-work-order",
        ),
      ),
      await createDispatchAssignment(
        db,
        viewer,
        assignmentInput(
          fixture.alphaOffice.id,
          workOrder.id,
          technician.id,
          "viewer-assignment",
        ),
      ),
    ];

    for (const result of deniedResults) {
      expect(result).toEqual({
        status: "forbidden",
        reason: "missing_permission",
      });
    }
  });

  it("denies every operational-record read to field technicians", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    const fieldTechnician = await authorizedContext(
      db,
      "alpha-field-technician",
      fixture.organizationA.id,
    );
    const chain = await createOperationalChain(
      db,
      admin,
      fixture.alphaOffice.id,
      "field-technician-read",
    );

    const deniedResults = [
      await listProjects(db, fieldTechnician),
      await findProjectById(db, fieldTechnician, chain.project.id),
      await listTechnicians(db, fieldTechnician),
      await findTechnicianById(db, fieldTechnician, chain.technician.id),
      await listWorkOrders(db, fieldTechnician),
      await findWorkOrderById(db, fieldTechnician, chain.workOrder.id),
      await listDispatchAssignments(db, fieldTechnician),
      await findDispatchAssignmentById(
        db,
        fieldTechnician,
        chain.assignment.id,
      ),
    ];

    for (const result of deniedResults) {
      expect(result).toEqual({
        status: "forbidden",
        reason: "missing_permission",
      });
    }
  });

  it("revalidates a suspended actor inside the write transaction", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const staleAdmin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );

    await db
      .update(organizationMemberships)
      .set({ status: "suspended" })
      .where(eq(organizationMemberships.id, fixture.alphaAdminMembership.id));

    const result = await createProject(
      db,
      staleAdmin,
      projectInput(fixture.alphaOffice.id, "suspended-actor"),
    );

    expect(result).toEqual({
      status: "forbidden",
      reason: "missing_permission",
    });
    expect(await db.select().from(projects)).toEqual([]);
  });

  it("serializes a concurrent revocation before actor revalidation and record creation", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const staleAdmin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    let pendingCreate: ReturnType<typeof createProject> | undefined;
    let organizationLockWaitObserved = false;

    await db.transaction(async (revocationTransaction) => {
      await revocationTransaction.execute(sql`
        select ${organizations.id}
        from ${organizations}
        where ${organizations.id} = ${fixture.organizationA.id}
        for update
      `);

      pendingCreate = createProject(
        db,
        staleAdmin,
        projectInput(fixture.alphaOffice.id, "concurrent-revocation"),
      );
      organizationLockWaitObserved =
        await waitForBlockedOrganizationLock(db);

      await revocationTransaction
        .update(organizationMemberships)
        .set({ status: "suspended" })
        .where(
          eq(
            organizationMemberships.id,
            fixture.alphaAdminMembership.id,
          ),
        );
    });

    expect(organizationLockWaitObserved).toBe(true);
    if (!pendingCreate) {
      throw new Error("Expected the concurrent create operation to start.");
    }

    await expect(pendingCreate).resolves.toEqual({
      status: "forbidden",
      reason: "missing_permission",
    });
    expect(await db.select().from(projects)).toEqual([]);
  });

  it("rejects invalid work-order and assignment intervals without persisting rows", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    const project = mustBeCreated(
      await createProject(
        db,
        admin,
        projectInput(fixture.alphaOffice.id, "invalid-interval"),
      ),
    ).value;
    const technician = mustBeCreated(
      await createTechnician(
        db,
        admin,
        technicianInput(fixture.alphaOffice.id, "invalid-interval"),
      ),
    ).value;
    const invalidWorkOrderInput = workOrderInput(
      fixture.alphaOffice.id,
      project.id,
      "invalid-interval",
    );
    invalidWorkOrderInput.scheduledEndAt = invalidWorkOrderInput.scheduledStartAt;

    const invalidWorkOrder = await createWorkOrder(
      db,
      admin,
      invalidWorkOrderInput,
    );
    expect(invalidWorkOrder.status).toBe("validation_error");
    expect(
      invalidWorkOrder.status === "validation_error"
        ? invalidWorkOrder.issues
        : [],
    ).toContain(
      "scheduledEndAt: scheduled end must be after scheduled start",
    );
    expect(await db.select().from(workOrders)).toEqual([]);

    const workOrder = mustBeCreated(
      await createWorkOrder(
        db,
        admin,
        workOrderInput(
          fixture.alphaOffice.id,
          project.id,
          "valid-after-invalid",
        ),
      ),
    ).value;
    const invalidAssignmentInput = assignmentInput(
      fixture.alphaOffice.id,
      workOrder.id,
      technician.id,
      "invalid-interval",
    );
    invalidAssignmentInput.assignmentEndAt =
      invalidAssignmentInput.assignmentStartAt;

    const invalidAssignment = await createDispatchAssignment(
      db,
      admin,
      invalidAssignmentInput,
    );
    expect(invalidAssignment.status).toBe("validation_error");
    expect(
      invalidAssignment.status === "validation_error"
        ? invalidAssignment.issues
        : [],
    ).toContain(
      "assignmentEndAt: assignment end must be after assignment start",
    );
    expect(await db.select().from(dispatchAssignments)).toEqual([]);
  });

  it("restricts deletion of referenced work orders, projects, and technicians", async () => {
    const fixture = await seedAuthorizationFixture(db);
    const admin = await authorizedContext(
      db,
      "alpha-admin",
      fixture.organizationA.id,
    );
    const chain = await createOperationalChain(
      db,
      admin,
      fixture.alphaOffice.id,
      "restrict-delete",
    );

    await expectDatabaseConstraint(
      () =>
        db
          .delete(workOrders)
          .where(eq(workOrders.id, chain.workOrder.id)),
      "dispatch_assignments_work_order_organization_office_fk",
    );
    await expectDatabaseConstraint(
      () => db.delete(projects).where(eq(projects.id, chain.project.id)),
      "work_orders_project_organization_office_fk",
    );
    await expectDatabaseConstraint(
      () =>
        db
          .delete(technicians)
          .where(eq(technicians.id, chain.technician.id)),
      "assignment_events_technician_id_fk",
    );

    await expect(findProjectById(db, admin, chain.project.id)).resolves.toMatchObject({
      status: "found",
    });
    await expect(
      findTechnicianById(db, admin, chain.technician.id),
    ).resolves.toMatchObject({ status: "found" });
    await expect(
      findWorkOrderById(db, admin, chain.workOrder.id),
    ).resolves.toMatchObject({ status: "found" });
  });
});

function projectInput(
  officeId: string,
  key: string,
  sourceSystem = "dispatch.export",
) {
  return {
    officeId,
    sourceSystem,
    sourceProjectId: "source-project-" + key,
    projectNumber: "PRJ-" + key.toUpperCase(),
    name: "Project " + key,
    isActive: true,
  };
}

function technicianInput(
  officeId: string,
  key: string,
  sourceSystem = "dispatch.export",
) {
  return {
    officeId,
    sourceSystem,
    sourceTechnicianId: "source-technician-" + key,
    displayName: "Technician " + key,
    operationalRole: "Field Technician",
    workEmail: key + "@example.test",
    workPhone: "555-0100",
    isActive: true,
  };
}

function workOrderInput(
  officeId: string,
  projectId: string,
  key: string,
  sourceSystem = "dispatch.export",
) {
  return {
    officeId,
    projectId,
    serviceTypeId: serviceTypeByOffice.get(officeId),
    sourceSystem,
    sourceWorkOrderId: "source-work-order-" + key,
    workOrderNumber: "TRD-" + key.toUpperCase(),
    serviceType: "Concrete Testing",
    jobSiteName: "Job site " + key,
    scheduledStartAt,
    scheduledEndAt,
    isActive: true,
  };
}

function assignmentInput(
  officeId: string,
  workOrderId: string,
  technicianId: string,
  key: string,
  sourceSystem = "dispatch.export",
) {
  return {
    officeId,
    workOrderId,
    technicianId,
    sourceSystem,
    sourceAssignmentId: "source-assignment-" + key,
    assignmentStartAt: scheduledStartAt,
    assignmentEndAt: scheduledEndAt,
    isActive: true,
  };
}

async function createOperationalChain(
  database: OperationalDatabase,
  context: AuthorizationContext,
  officeId: string,
  key: string,
  sourceSystem = "dispatch.export",
): Promise<{
  project: ProjectRecord;
  technician: TechnicianRecord;
  workOrder: WorkOrderRecord;
  assignment: DispatchAssignmentRecord;
  mutations: OperationalRecordMutationMetadata[];
}> {
  const project = mustBeCreated(
    await createProject(
      database,
      context,
      projectInput(officeId, key, sourceSystem),
    ),
  );
  const technician = mustBeCreated(
    await createTechnician(
      database,
      context,
      technicianInput(officeId, key, sourceSystem),
    ),
  );
  const workOrder = mustBeCreated(
    await createWorkOrder(
      database,
      context,
      workOrderInput(officeId, project.value.id, key, sourceSystem),
    ),
  );
  const ready = await transitionWorkOrder(database, context, {
    workOrderId: workOrder.value.id,
    expectedVersion: workOrder.value.version,
    toStatus: "ready_for_dispatch",
  });
  if (ready.status !== "ok") {
    throw new Error("Expected work order to become ready: " + JSON.stringify(ready));
  }
  const assignment = mustBeCreated(
    await createDispatchAssignment(
      database,
      context,
      assignmentInput(
        officeId,
        workOrder.value.id,
        technician.value.id,
        key,
        sourceSystem,
      ),
    ),
  );
  const assigned = await assignPrimaryTechnician(database, context, {
    assignmentId: assignment.value.id,
    technicianId: technician.value.id,
    expectedVersion: assignment.value.version,
  });
  if (assigned.status !== "ok") {
    throw new Error("Expected primary assignment: " + JSON.stringify(assigned));
  }

  return {
    project: project.value,
    technician: technician.value,
    workOrder: workOrder.value,
    assignment: assigned.value,
    mutations: [
      project.mutation,
      technician.mutation,
      workOrder.mutation,
      assignment.mutation,
    ],
  };
}

function mustBeCreated<T>(
  result: OperationalRecordCreateResult<T>,
): Extract<OperationalRecordCreateResult<T>, { status: "created" }> {
  if (result.status !== "created") {
    throw new Error(
      "Expected operational record creation to succeed: " +
        JSON.stringify(result),
    );
  }

  return result;
}

function expectMutation(
  mutation: OperationalRecordMutationMetadata,
  action: OperationalRecordMutationAction,
  actorUserId: string,
  organizationId: string,
  subjectId: string,
): void {
  expect(mutation).toMatchObject({
    action,
    actorUserId,
    organizationId,
    subjectId,
  });
  expect(mutation.mutationId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(Number.isNaN(Date.parse(mutation.occurredAt))).toBe(false);
}

function expectSafePublicResult(result: unknown): void {
  const serialized = JSON.stringify(result);

  expect(serialized).not.toMatch(/duplicate key|foreign key|failed query|insert into/i);
  expect(serialized).not.toMatch(
    /projects_organization_source_unique|technicians_organization_source_unique|work_orders_organization_source_unique|dispatch_assignments_organization_source_unique/i,
  );
}

function expectListIds<T extends { id: string }>(
  result: OperationalRecordListResult<T>,
  expectedIds: string[],
): void {
  expect(result.status).toBe("ok");
  if (result.status === "ok") {
    expect(result.values.map((value) => value.id).sort()).toEqual(
      [...expectedIds].sort(),
    );
  }
}

function expectFoundId<T extends { id: string }>(
  result: OperationalRecordLookupResult<T>,
  expectedId: string,
): void {
  expect(result.status).toBe("found");
  if (result.status === "found") {
    expect(result.value.id).toBe(expectedId);
  }
}

async function expectInaccessibleAndNonexistentEquivalent<
  T extends { id: string },
>(
  lookup: (id: string) => Promise<OperationalRecordLookupResult<T>>,
  inaccessibleId: string,
): Promise<void> {
  const inaccessible = await lookup(inaccessibleId);
  const nonexistent = await lookup(randomUUID());

  expect(inaccessible).toEqual(nonexistent);
  expect(inaccessible).toEqual({ status: "not_found_or_inaccessible" });
  expectSafePublicResult(inaccessible);
}

function emptyRestrictedContext(
  context: AuthorizationContext,
): AuthorizationContext {
  return {
    ...context,
    membership: {
      ...context.membership,
      officeIds: [],
    },
    tenantScope: {
      organizationId: context.membership.organizationId,
      officeAccess: "restricted",
      officeIds: [],
    },
  };
}

async function expectDatabaseConstraint(
  operation: () => Promise<unknown>,
  constraint: string,
): Promise<void> {
  const error = await captureDatabaseError(operation);

  expect(getPostgresErrorInfo(error)).toMatchObject({
    code: "23503",
    constraint,
  });
}

type DirectCheckConstraintCase = {
  label: string;
  constraint: string;
  operation: () => Promise<unknown>;
};

async function expectDirectCheckConstraints(
  cases: DirectCheckConstraintCase[],
): Promise<void> {
  const actual = [];

  for (const checkCase of cases) {
    actual.push({
      label: checkCase.label,
      ...(await captureDatabaseErrorInfo(checkCase.operation)),
    });
  }

  expect(actual).toEqual(
    cases.map((checkCase) => ({
      label: checkCase.label,
      code: "23514",
      constraint: checkCase.constraint,
    })),
  );
}

async function captureDatabaseErrorInfo(
  operation: () => Promise<unknown>,
): Promise<ReturnType<typeof getPostgresErrorInfo>> {
  try {
    await operation();
    return {};
  } catch (error) {
    return getPostgresErrorInfo(error);
  }
}

async function waitForBlockedOrganizationLock(
  database: OperationalDatabase,
): Promise<boolean> {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    const result = await database.execute<{ blocked: boolean }>(sql`
      select exists (
        select 1
        from pg_stat_activity
        where datname = current_database()
          and usename = current_user
          and pid <> pg_backend_pid()
          and wait_event_type = 'Lock'
          and query ~* 'select.*organizations.*for update'
      ) as blocked
    `);

    if (result.rows[0]?.blocked === true) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return false;
}

async function captureDatabaseError(
  operation: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await operation();
  } catch (error) {
    return error;
  }

  throw new Error("Expected database operation to fail.");
}

async function seedAuthorizationFixture(database: OperationalDatabase) {
  const [organizationA, organizationB] = await database
    .insert(organizations)
    .values([
      { slug: "operational-alpha", name: "Operational Alpha" },
      { slug: "operational-beta", name: "Operational Beta" },
    ])
    .returning();
  const [alphaOffice, alphaSecondOffice, betaOffice] = await database
    .insert(offices)
    .values([
      {
        organizationId: organizationA.id,
        code: "ALX",
        name: "Alexandria",
        timeZone: "America/New_York",
      },
      {
        organizationId: organizationA.id,
        code: "RCH",
        name: "Richmond",
        timeZone: "America/New_York",
      },
      {
        organizationId: organizationB.id,
        code: "FFX",
        name: "Fairfax",
        timeZone: "America/New_York",
      },
    ])
    .returning();
  const [
    alphaAdmin,
    alphaOperationsManager,
    alphaDispatcher,
    alphaViewer,
    alphaFieldTechnician,
    betaAdmin,
  ] = await database
    .insert(users)
    .values([
      userValues("alpha-admin@example.test", "Alpha Admin"),
      userValues(
        "alpha-operations-manager@example.test",
        "Alpha Operations Manager",
      ),
      userValues("alpha-dispatcher@example.test", "Alpha Dispatcher"),
      userValues("alpha-viewer@example.test", "Alpha Viewer"),
      userValues(
        "alpha-field-technician@example.test",
        "Alpha Field Technician",
      ),
      userValues("beta-admin@example.test", "Beta Admin"),
    ])
    .returning();

  const [alphaServiceType, alphaSecondOfficeServiceType, betaServiceType] =
    await database
      .insert(serviceTypes)
      .values([
        {
          organizationId: organizationA.id,
          officeId: alphaOffice.id,
          key: "concrete_testing_alexandria",
          name: "Concrete Testing",
          category: "concrete",
          createdByUserId: alphaAdmin.id,
          updatedByUserId: alphaAdmin.id,
        },
        {
          organizationId: organizationA.id,
          officeId: alphaSecondOffice.id,
          key: "concrete_testing_richmond",
          name: "Concrete Testing",
          category: "concrete",
          createdByUserId: alphaAdmin.id,
          updatedByUserId: alphaAdmin.id,
        },
        {
          organizationId: organizationB.id,
          officeId: betaOffice.id,
          key: "concrete_testing_fairfax",
          name: "Concrete Testing",
          category: "concrete",
          createdByUserId: betaAdmin.id,
          updatedByUserId: betaAdmin.id,
        },
      ])
      .returning();
  serviceTypeByOffice.set(alphaOffice.id, alphaServiceType.id);
  serviceTypeByOffice.set(alphaSecondOffice.id, alphaSecondOfficeServiceType.id);
  serviceTypeByOffice.set(betaOffice.id, betaServiceType.id);
  const [
    alphaAdminMembership,
    alphaOperationsManagerMembership,
    alphaDispatcherMembership,
    alphaViewerMembership,
    alphaFieldTechnicianMembership,
    betaAdminMembership,
  ] = await database
    .insert(organizationMemberships)
    .values([
      membershipValues(
        organizationA.id,
        alphaAdmin.id,
        "organization_admin",
        "all",
        alphaAdmin.id,
      ),
      membershipValues(
        organizationA.id,
        alphaOperationsManager.id,
        "operations_manager",
        "restricted",
        alphaAdmin.id,
      ),
      membershipValues(
        organizationA.id,
        alphaDispatcher.id,
        "dispatcher",
        "restricted",
        alphaAdmin.id,
      ),
      membershipValues(
        organizationA.id,
        alphaViewer.id,
        "viewer",
        "all",
        alphaAdmin.id,
      ),
      membershipValues(
        organizationA.id,
        alphaFieldTechnician.id,
        "field_technician",
        "restricted",
        alphaAdmin.id,
      ),
      membershipValues(
        organizationB.id,
        betaAdmin.id,
        "organization_admin",
        "all",
        betaAdmin.id,
      ),
    ])
    .returning();

  await database.insert(externalIdentities).values([
    identityValues(alphaAdmin.id, "alpha-admin"),
    identityValues(
      alphaOperationsManager.id,
      "alpha-operations-manager",
    ),
    identityValues(alphaDispatcher.id, "alpha-dispatcher"),
    identityValues(alphaViewer.id, "alpha-viewer"),
    identityValues(alphaFieldTechnician.id, "alpha-field-technician"),
    identityValues(betaAdmin.id, "beta-admin"),
  ]);
  await database.insert(officeAssignments).values([
    {
      organizationId: organizationA.id,
      organizationMembershipId: alphaOperationsManagerMembership.id,
      officeId: alphaOffice.id,
      createdByUserId: alphaAdmin.id,
    },
    {
      organizationId: organizationA.id,
      organizationMembershipId: alphaDispatcherMembership.id,
      officeId: alphaOffice.id,
      createdByUserId: alphaAdmin.id,
    },
    {
      organizationId: organizationA.id,
      organizationMembershipId: alphaFieldTechnicianMembership.id,
      officeId: alphaOffice.id,
      createdByUserId: alphaAdmin.id,
    },
  ]);

  return {
    organizationA,
    organizationB,
    alphaOffice,
    alphaSecondOffice,
    betaOffice,
    alphaAdmin,
    alphaOperationsManager,
    alphaDispatcher,
    alphaViewer,
    alphaFieldTechnician,
    betaAdmin,
    alphaAdminMembership,
    alphaOperationsManagerMembership,
    alphaDispatcherMembership,
    alphaViewerMembership,
    alphaFieldTechnicianMembership,
    betaAdminMembership,
    alphaServiceType,
    alphaSecondOfficeServiceType,
    betaServiceType,
  };
}

function userValues(email: string, displayName: string) {
  return {
    email,
    normalizedEmail: email,
    displayName,
    status: "active" as const,
  };
}

function membershipValues(
  organizationId: string,
  userId: string,
  role:
    | "organization_admin"
    | "operations_manager"
    | "dispatcher"
    | "viewer"
    | "field_technician",
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

function identityValues(userId: string, providerSubject: string) {
  return {
    userId,
    provider: "cmtcommand-development",
    providerSubject,
  };
}

async function authorizedContext(
  database: OperationalDatabase,
  subject: string,
  organizationId: string,
): Promise<AuthorizationContext> {
  const state = await resolveAuthorizationState(
    createAuthorizationRepository(database),
    {
      identity: {
        provider: "cmtcommand-development",
        providerSubject: subject,
      },
      activeOrganizationId: organizationId,
    },
  );

  if (state.status !== "authorized") {
    throw new Error("Expected authorized fixture, received " + state.status + ".");
  }

  return state.context;
}

async function cleanupTestRows(database: OperationalDatabase): Promise<void> {
  await database.transaction(async (transaction) => {
    await runAuthorizedTestDatabaseCleanup(
      testDatabaseConfig,
      async () => {
        const result = await transaction.execute<{ database_name: string }>(sql`
          select current_database()::text as database_name
        `);

        return result.rows[0]?.database_name;
      },
      async () => {
        await transaction.execute(
          sql`truncate table
            "assignment_events",
            "assignment_technicians",
            "dispatch_assignments",
            "work_orders",
            "technician_office_eligibilities",
            "service_types",
            "technicians",
            "projects",
            "office_assignments",
            "external_identities",
            "organization_memberships",
            "users",
            "offices",
            "organizations"
            restart identity restrict`,
        );
      },
    );
  });
}
