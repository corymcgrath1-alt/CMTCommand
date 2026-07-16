import { describe, expect, it } from "vitest";
import type { TechnicianRecord } from "../../src/server/db/schema";
import { createAuditRequestContext } from "../../src/server/audit/request-context";
import { auditQueryInputSchema } from "../../src/server/audit/query-service";
import { technicianAuditState } from "../../src/server/audit/serializers";
import {
  auditActionCategory,
  auditActionValues,
  securityAuditCategories,
} from "../../src/server/audit/taxonomy";
import {
  auditEventDetailsSchema,
  auditRequestContextSchema,
  safeAuditMetadataSchema,
  safeAuditStateSchema,
} from "../../src/server/audit/validation";

const id = "10000000-0000-4000-8000-000000000001";
const otherId = "10000000-0000-4000-8000-000000000002";

describe("audit contracts", () => {
  it("maps every audit action to a category", () => {
    expect(Object.keys(auditActionCategory).sort()).toEqual(
      [...auditActionValues].sort(),
    );
  });

  it("classifies membership, authorization, and system history as security history", () => {
    expect(securityAuditCategories).toEqual(
      expect.arrayContaining(["membership", "authorization", "system"]),
    );
  });

  it("creates three distinct server UUID identifiers", () => {
    const context = createAuditRequestContext();
    expect(auditRequestContextSchema.parse(context)).toEqual(context);
    expect(new Set(Object.values(context))).toHaveLength(3);
  });

  it("accepts a bounded allow-listed state object", () => {
    expect(
      safeAuditStateSchema.parse({ status: "scheduled", version: 3 }),
    ).toEqual({ status: "scheduled", version: 3 });
  });

  it.each(["password", "accessToken", "authorization", "workEmail", "phone"])(
    "rejects the prohibited state field %s",
    (key) => {
      expect(safeAuditStateSchema.safeParse({ [key]: "sensitive" }).success).toBe(
        false,
      );
    },
  );

  it("rejects oversized state strings", () => {
    expect(
      safeAuditStateSchema.safeParse({ status: "x".repeat(601) }).success,
    ).toBe(false);
  });

  it("rejects deeply nested metadata", () => {
    expect(
      safeAuditMetadataSchema.safeParse({ a: { b: { c: { d: { e: 1 } } } } })
        .success,
    ).toBe(false);
  });

  it("rejects unsafe audit details before persistence", () => {
    const requestContext = createAuditRequestContext();
    const parsed = auditEventDetailsSchema.safeParse({
      action: "project.created",
      outcome: "succeeded",
      target: { type: "project", id },
      requestContext,
      resultingState: { contactEmail: "private@example.test" },
    });
    expect(parsed.success).toBe(false);
  });

  it("serializes technician state without contact details", () => {
    const state = technicianAuditState({
      id,
      organizationId: otherId,
      officeId: id,
      homeOfficeId: id,
      organizationMembershipId: null,
      sourceSystem: "test",
      sourceTechnicianId: "tech-1",
      displayName: "A Technician",
      operationalRole: null,
      workEmail: "private@example.test",
      workPhone: "555-0101",
      status: "active",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TechnicianRecord);

    expect(state).not.toHaveProperty("workEmail");
    expect(state).not.toHaveProperty("workPhone");
    expect(state).not.toHaveProperty("displayName");
  });

  it("defaults audit queries to a bounded page size", () => {
    expect(auditQueryInputSchema.parse({}).pageSize).toBe(25);
  });

  it("rejects page sizes above the hard limit", () => {
    expect(auditQueryInputSchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });

  it("rejects date ranges longer than 90 days", () => {
    expect(
      auditQueryInputSchema.safeParse({
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-04-02T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("requires complete stable cursors", () => {
    expect(
      auditQueryInputSchema.safeParse({
        cursorOccurredAt: "2026-07-16T12:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("requires target type and identifier together", () => {
    expect(auditQueryInputSchema.safeParse({ targetId: id }).success).toBe(false);
    expect(
      auditQueryInputSchema.safeParse({ targetType: "project", targetId: id })
        .success,
    ).toBe(true);
  });
});
