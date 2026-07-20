import { describe, expect, it } from "vitest";
import {
  canTransitionAssignment,
  canTransitionWorkOrder,
  hasConflictOverrideReason,
  intervalsOverlap,
  reconcileWorkOrderStatus,
} from "../../src/server/dispatch/domain";
import {
  formatOperationalDateTime,
  occursOnOperationalDate,
  operationalDateKey,
} from "../../src/server/dispatch/time";

describe("dispatch lifecycle policy", () => {
  it("allows the guarded assignment path and rejects terminal reopening", () => {
    expect(canTransitionAssignment("draft", "unassigned")).toBe(true);
    expect(canTransitionAssignment("unassigned", "assigned")).toBe(true);
    expect(canTransitionAssignment("assigned", "acknowledged")).toBe(true);
    expect(canTransitionAssignment("assigned", "in_progress")).toBe(false);
    expect(canTransitionAssignment("acknowledged", "in_progress")).toBe(true);
    expect(canTransitionAssignment("in_progress", "completed")).toBe(true);
    expect(canTransitionAssignment("completed", "in_progress")).toBe(false);
    expect(canTransitionAssignment("cancelled", "assigned")).toBe(false);
  });

  it("keeps work-order transitions explicit and reconciles assignment state", () => {
    expect(canTransitionWorkOrder("draft", "ready_for_dispatch")).toBe(true);
    expect(canTransitionWorkOrder("draft", "completed")).toBe(false);
    expect(reconcileWorkOrderStatus("ready_for_dispatch", ["unassigned"])).toBe(
      "scheduled",
    );
    expect(reconcileWorkOrderStatus("scheduled", ["assigned", "in_progress"])).toBe(
      "in_progress",
    );
    expect(reconcileWorkOrderStatus("in_progress", ["completed", "cancelled"])).toBe(
      "completed",
    );
    expect(reconcileWorkOrderStatus("scheduled", ["cancelled"])).toBe(
      "ready_for_dispatch",
    );
  });
});

describe("schedule conflicts", () => {
  it("uses half-open interval semantics", () => {
    const start = new Date("2026-07-17T12:00:00Z");
    const end = new Date("2026-07-17T14:00:00Z");
    expect(
      intervalsOverlap(start, end, new Date("2026-07-17T13:59:59Z"), new Date("2026-07-17T15:00:00Z")),
    ).toBe(true);
    expect(
      intervalsOverlap(start, end, new Date("2026-07-17T14:00:00Z"), new Date("2026-07-17T15:00:00Z")),
    ).toBe(false);
  });

  it("requires a meaningful reason for an authorized override", () => {
    expect(hasConflictOverrideReason(" short ")).toBe(false);
    expect(hasConflictOverrideReason("Customer-approved coverage exception")).toBe(true);
  });
});

describe("operational time", () => {
  it("keeps dispatch dates in the stored IANA timezone across DST", () => {
    const beforeSpringForward = new Date("2026-03-08T06:30:00Z");
    const afterSpringForward = new Date("2026-03-08T07:30:00Z");
    expect(operationalDateKey(beforeSpringForward, "America/New_York")).toBe(
      "2026-03-08",
    );
    expect(operationalDateKey(afterSpringForward, "America/New_York")).toBe(
      "2026-03-08",
    );
    expect(occursOnOperationalDate(afterSpringForward, "2026-03-08", "America/New_York")).toBe(true);
    expect(formatOperationalDateTime(afterSpringForward, "America/New_York")).toMatch(
      /Mar 8, 2026.*3:30 AM EDT/,
    );
  });
});
