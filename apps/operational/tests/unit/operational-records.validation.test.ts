import { describe, expect, it } from "vitest";
import {
  createDispatchAssignmentInputSchema,
  createProjectInputSchema,
  createTechnicianInputSchema,
  createWorkOrderInputSchema,
  dateTimeInputSchema,
  sourceIdInputSchema,
  sourceSystemInputSchema,
  validationIssues,
} from "../../src/server/operational-records/validation";

const officeId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";
const workOrderId = "00000000-0000-4000-8000-000000000003";
const technicianId = "00000000-0000-4000-8000-000000000004";

const workOrderInput = {
  officeId,
  projectId,
  sourceSystem: "dispatch.csv",
  sourceWorkOrderId: "wo-104",
  workOrderNumber: "TRD-104",
  serviceType: "Concrete",
  jobSiteName: "Potomac Yard",
  scheduledStartAt: "2026-07-17T08:00:00-04:00",
  scheduledEndAt: "2026-07-17T12:00:00-04:00",
};

const assignmentInput = {
  officeId,
  workOrderId,
  technicianId,
  sourceSystem: "dispatch.csv",
  sourceAssignmentId: "assignment-104",
  assignmentStartAt: "2026-07-17T08:00:00-04:00",
  assignmentEndAt: "2026-07-17T12:00:00-04:00",
};

describe("operational record validation", () => {
  it("normalizes source systems and trims project fields with an active default", () => {
    expect(sourceSystemInputSchema.parse("  Dispatch.V1_Import-2  ")).toBe(
      "dispatch.v1_import-2",
    );

    expect(
      createProjectInputSchema.parse({
        officeId,
        sourceSystem: "  Dispatch.V1  ",
        sourceProjectId: "  project-42  ",
        projectNumber: "  P-0042  ",
        name: "  Potomac Yard Expansion  ",
      }),
    ).toEqual({
      officeId,
      sourceSystem: "dispatch.v1",
      sourceProjectId: "project-42",
      projectNumber: "P-0042",
      name: "Potomac Yard Expansion",
      isActive: true,
    });
  });

  it("trims optional technician contact fields and preserves nullable values", () => {
    expect(
      createTechnicianInputSchema.parse({
        officeId,
        sourceSystem: "  HR.Roster  ",
        sourceTechnicianId: "  tech-7  ",
        displayName: "  Maria Lopez  ",
        operationalRole: null,
        workEmail: "  maria.lopez@example.com  ",
        workPhone: "  555-0107  ",
      }),
    ).toEqual({
      officeId,
      sourceSystem: "hr.roster",
      sourceTechnicianId: "tech-7",
      displayName: "Maria Lopez",
      operationalRole: null,
      workEmail: "maria.lopez@example.com",
      workPhone: "555-0107",
      isActive: true,
    });
  });

  it("accepts timezone-aware ISO strings or Date instances and outputs Date values", () => {
    const parsedWorkOrder = createWorkOrderInputSchema.parse({
      ...workOrderInput,
      workOrderNumber: "  TRD-104  ",
      serviceType: "  Concrete  ",
      jobSiteName: "  Potomac Yard  ",
    });
    const assignmentStartAt = new Date("2026-07-17T13:00:00Z");
    const assignmentEndAt = new Date("2026-07-17T15:00:00Z");
    const parsedAssignment = createDispatchAssignmentInputSchema.parse({
      ...assignmentInput,
      assignmentStartAt,
      assignmentEndAt,
    });

    expect(parsedWorkOrder.scheduledStartAt).toEqual(
      new Date("2026-07-17T08:00:00-04:00"),
    );
    expect(parsedWorkOrder.scheduledEndAt).toBeInstanceOf(Date);
    expect(parsedWorkOrder.workOrderNumber).toBe("TRD-104");
    expect(parsedWorkOrder.serviceType).toBe("Concrete");
    expect(parsedWorkOrder.jobSiteName).toBe("Potomac Yard");
    expect(parsedWorkOrder.isActive).toBe(true);
    expect(parsedAssignment.assignmentStartAt).toEqual(assignmentStartAt);
    expect(parsedAssignment.assignmentEndAt).toEqual(assignmentEndAt);
    expect(parsedAssignment.isActive).toBe(true);
  });

  it("rejects invalid identifiers, source systems, and source IDs", () => {
    expect(() =>
      createProjectInputSchema.parse({
        officeId: "not-a-uuid",
        sourceSystem: "dispatch",
        sourceProjectId: "project-42",
        projectNumber: "P-0042",
        name: "Potomac Yard Expansion",
      }),
    ).toThrow();
    expect(() => sourceSystemInputSchema.parse("x")).toThrow(/at least 2/);
    expect(() => sourceSystemInputSchema.parse("dispatch/import")).toThrow(
      /letters, numbers, dots, underscores, and hyphens/,
    );
    expect(() => sourceSystemInputSchema.parse("dispatch..import")).toThrow(
      /letters, numbers, dots, underscores, and hyphens/,
    );
    expect(() => sourceIdInputSchema.parse("   ")).toThrow(/required/);
    expect(() =>
      createWorkOrderInputSchema.parse({ ...workOrderInput, projectId: "project-42" }),
    ).toThrow();
    expect(() =>
      createDispatchAssignmentInputSchema.parse({
        ...assignmentInput,
        technicianId: "tech-7",
      }),
    ).toThrow();
  });

  it("rejects invalid or oversized technician contact fields", () => {
    const baseTechnician = {
      officeId,
      sourceSystem: "hr.roster",
      sourceTechnicianId: "tech-7",
      displayName: "Maria Lopez",
    };

    expect(() =>
      createTechnicianInputSchema.parse({
        ...baseTechnician,
        workEmail: "not-an-email",
      }),
    ).toThrow();
    expect(() =>
      createTechnicianInputSchema.parse({
        ...baseTechnician,
        workPhone: "1".repeat(41),
      }),
    ).toThrow();
    expect(() =>
      createTechnicianInputSchema.parse({
        ...baseTechnician,
        operationalRole: "r".repeat(121),
      }),
    ).toThrow();
    expect(() =>
      createTechnicianInputSchema.parse({
        ...baseTechnician,
        workPhone: "   ",
      }),
    ).toThrow();
  });

  it("requires ISO string date inputs to include a timezone", () => {
    expect(() => dateTimeInputSchema.parse("2026-07-17T08:00:00")).toThrow(
      /timezone/,
    );
  });

  it("rejects work-order intervals whose end is not after the start", () => {
    const parsed = createWorkOrderInputSchema.safeParse({
      ...workOrderInput,
      scheduledEndAt: workOrderInput.scheduledStartAt,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(validationIssues(parsed.error)).toContain(
        "scheduledEndAt: scheduled end must be after scheduled start",
      );
    }
  });

  it("rejects dispatch-assignment intervals whose end is not after the start", () => {
    const parsed = createDispatchAssignmentInputSchema.safeParse({
      ...assignmentInput,
      assignmentEndAt: "2026-07-17T07:59:59-04:00",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(validationIssues(parsed.error)).toContain(
        "assignmentEndAt: assignment end must be after assignment start",
      );
    }
  });
});
