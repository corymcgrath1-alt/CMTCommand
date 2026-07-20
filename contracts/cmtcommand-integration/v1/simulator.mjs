import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA_VERSION = "cmtcommand.integration.event.v1";

export const EVENT_TYPES = [
  "WorkOrderCreated",
  "AssignmentPublished",
  "AssignmentAccepted",
  "FieldVisitStarted",
  "FieldVisitCompleted",
  "ConcreteFreshPropertiesRecorded",
  "SpecimenCreated",
  "SpecimenCustodyTransferred",
  "SpecimenReceivedByLab",
  "BreakScheduled",
  "BreakResultRecorded",
  "LabResultReviewed",
  "LabResultApproved",
  "LabResultAmended",
  "NonconformanceRaised",
  "OperationalStatusChanged",
  "WorkOrderClosed",
];

const REQUIRED_ENVELOPE_FIELDS = [
  "eventId",
  "schemaVersion",
  "eventType",
  "sourceSystem",
  "tenantId",
  "branchId",
  "occurredAt",
  "producedAt",
  "correlationId",
  "workOrderId",
  "actorId",
  "actorRole",
  "revision",
  "idempotencyKey",
  "payload",
];

const PAYLOAD_REQUIRED_FIELDS = {
  WorkOrderCreated: ["projectName", "serviceType", "placementLocation", "readinessRequirements"],
  AssignmentPublished: ["technicianId", "scheduledStart", "requiredServiceType", "requiredEquipment"],
  AssignmentAccepted: ["acceptedAt", "deviceId"],
  FieldVisitStarted: ["startedAt", "deviceId"],
  FieldVisitCompleted: ["completedAt", "completionStatus"],
  ConcreteFreshPropertiesRecorded: ["sampledAt", "supplier", "truckTicket", "mixDesignId", "freshProperties", "methodReferences", "calibrationReferences"],
  SpecimenCreated: ["specimenLabel", "specimenCount", "dimensions", "curingMethod", "createdAt"],
  SpecimenCustodyTransferred: ["transferredAt", "fromActorId", "toActorId", "condition"],
  SpecimenReceivedByLab: ["receivedAt", "receivedBy", "condition"],
  BreakScheduled: ["breakAgeDays", "scheduledFor", "methodReferences"],
  BreakResultRecorded: ["testedAt", "breakAgeDays", "measuredDimensions", "crossSectionalArea", "maximumLoad", "compressiveStrength", "fractureType", "testingTechnician", "testingMachine", "methodReferences", "validationStatus", "evidenceReferences"],
  LabResultReviewed: ["reviewedAt", "reviewerId", "reviewDecision"],
  LabResultApproved: ["approvedAt", "approverId", "approvalStatement"],
  LabResultAmended: ["amendedAt", "amendedBy", "amendmentReason", "correctedFields"],
  NonconformanceRaised: ["nonconformanceId", "raisedAt", "category", "description", "advisoryOnly"],
  OperationalStatusChanged: ["status", "reason"],
  WorkOrderClosed: ["closedAt", "closureReason"],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function isDateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function result(status, event, code, message) {
  return {
    status,
    code,
    message,
    eventId: event && event.eventId,
    eventType: event && event.eventType,
  };
}

export function createSimulatorState() {
  return {
    accepted: [],
    duplicateEvents: [],
    rejected: [],
    deadLettered: [],
    seenEventIds: new Map(),
    seenIdempotencyKeys: new Map(),
    revisions: new Map(),
    workOrders: new Map(),
    assignments: new Map(),
    fieldVisits: new Map(),
    testSets: new Map(),
    specimens: new Map(),
    labResults: new Map(),
    nonconformances: [],
  };
}

export function aggregateKeyFor(event) {
  if (["AssignmentPublished", "AssignmentAccepted"].includes(event.eventType)) {
    return `assignment:${event.assignmentId}`;
  }

  if (["FieldVisitStarted", "FieldVisitCompleted", "ConcreteFreshPropertiesRecorded"].includes(event.eventType)) {
    return `fieldVisit:${event.fieldVisitId}`;
  }

  if (["SpecimenCreated", "SpecimenCustodyTransferred", "SpecimenReceivedByLab"].includes(event.eventType)) {
    return `specimen:${event.specimenId}`;
  }

  if (["BreakScheduled", "BreakResultRecorded", "LabResultReviewed", "LabResultApproved", "LabResultAmended"].includes(event.eventType)) {
    return `testSet:${event.testSetId}`;
  }

  if (event.eventType === "NonconformanceRaised") {
    return `nonconformance:${event.payload.nonconformanceId}`;
  }

  return `workOrder:${event.workOrderId}`;
}

export function validateEnvelope(event) {
  const errors = [];

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return ["event must be an object"];
  }

  for (const field of REQUIRED_ENVELOPE_FIELDS) {
    if (!(field in event)) {
      errors.push(`missing envelope field: ${field}`);
    }
  }

  if (event.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  }

  if (!EVENT_TYPES.includes(event.eventType)) {
    errors.push(`unsupported eventType: ${event.eventType}`);
  }

  if (!hasText(event.eventId)) {
    errors.push("eventId must be present");
  }

  if (!hasText(event.tenantId) || !hasText(event.branchId)) {
    errors.push("tenantId and branchId are required");
  }

  if (!isDateTime(event.occurredAt) || !isDateTime(event.producedAt)) {
    errors.push("occurredAt and producedAt must be date-time strings");
  }

  if (!Number.isInteger(event.revision) || event.revision < 1) {
    errors.push("revision must be a positive integer");
  }

  if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
    errors.push("payload must be an object");
  }

  const requiredPayloadFields = PAYLOAD_REQUIRED_FIELDS[event.eventType] || [];
  for (const field of requiredPayloadFields) {
    if (!event.payload || !(field in event.payload)) {
      errors.push(`missing payload field: ${field}`);
    }
  }

  if (event.eventType === "LabResultAmended" && !hasText(event.supersedesEventId)) {
    errors.push("LabResultAmended requires supersedesEventId");
  }

  return errors;
}

function applyRevision(state, event) {
  const aggregateKey = aggregateKeyFor(event);
  const currentRevision = state.revisions.get(aggregateKey) || 0;

  if (event.revision <= currentRevision) {
    return result("rejected", event, "stale-revision", `revision ${event.revision} is not newer than ${currentRevision}`);
  }

  state.revisions.set(aggregateKey, event.revision);
  return null;
}

function rememberIdempotency(state, event) {
  const digest = stableStringify(event);
  const eventDigest = state.seenEventIds.get(event.eventId);
  const idempotencyDigest = state.seenIdempotencyKeys.get(event.idempotencyKey);

  if (eventDigest || idempotencyDigest) {
    if (eventDigest === digest && idempotencyDigest === digest) {
      const duplicate = result("duplicate", event, "duplicate-event", "event already accepted");
      state.duplicateEvents.push(duplicate);
      return duplicate;
    }

    const conflict = result("rejected", event, "idempotency-conflict", "event id or idempotency key was reused for a different event");
    state.rejected.push(conflict);
    return conflict;
  }

  state.seenEventIds.set(event.eventId, digest);
  state.seenIdempotencyKeys.set(event.idempotencyKey, digest);
  return null;
}

function requireWorkOrder(state, event) {
  if (!state.workOrders.has(event.workOrderId)) {
    return result("rejected", event, "missing-work-order", "work order must exist first");
  }
  return null;
}

function requireCalibration(event) {
  if (event.eventType === "ConcreteFreshPropertiesRecorded") {
    const references = event.payload.calibrationReferences || [];
    return references.length > 0 && references.every((item) => hasText(item.calibrationReference) && item.calibrationStatus === "current");
  }

  if (event.eventType === "BreakResultRecorded") {
    const machine = event.payload.testingMachine || {};
    return hasText(machine.calibrationReference) && machine.calibrationStatus === "current";
  }

  return true;
}

function deadLetter(state, event, code, message) {
  const deadLettered = result("dead-lettered", event, code, message);
  state.deadLettered.push(deadLettered);
  return deadLettered;
}

export function applyEvent(state, event) {
  const validationErrors = validateEnvelope(event);
  if (validationErrors.length > 0) {
    const rejected = result("rejected", event, "schema-validation", validationErrors.join("; "));
    state.rejected.push(rejected);
    return rejected;
  }

  const duplicate = rememberIdempotency(state, event);
  if (duplicate) {
    return duplicate;
  }

  const revisionError = applyRevision(state, event);
  if (revisionError) {
    state.rejected.push(revisionError);
    return revisionError;
  }

  if (event.eventType !== "WorkOrderCreated") {
    const missingWorkOrder = requireWorkOrder(state, event);
    if (missingWorkOrder) {
      state.rejected.push(missingWorkOrder);
      return missingWorkOrder;
    }
  }

  if (!requireCalibration(event)) {
    return deadLetter(state, event, "missing-calibration-reference", "required calibration metadata is missing or not current");
  }

  switch (event.eventType) {
    case "WorkOrderCreated":
      state.workOrders.set(event.workOrderId, {
        workOrderId: event.workOrderId,
        projectId: event.projectId,
        status: "created",
        sourceEventIds: [event.eventId],
      });
      break;

    case "AssignmentPublished":
      state.assignments.set(event.assignmentId, {
        assignmentId: event.assignmentId,
        workOrderId: event.workOrderId,
        status: "published",
      });
      state.workOrders.get(event.workOrderId).status = "assignment-published";
      break;

    case "AssignmentAccepted": {
      const assignment = state.assignments.get(event.assignmentId);
      if (!assignment) {
        return deadLetter(state, event, "missing-assignment", "assignment must be published before it is accepted");
      }
      assignment.status = "accepted";
      state.workOrders.get(event.workOrderId).status = "field-accepted";
      break;
    }

    case "FieldVisitStarted": {
      const assignment = state.assignments.get(event.assignmentId);
      if (!assignment || assignment.status !== "accepted") {
        return deadLetter(state, event, "assignment-not-accepted", "field visit requires an accepted assignment");
      }
      state.fieldVisits.set(event.fieldVisitId, {
        fieldVisitId: event.fieldVisitId,
        assignmentId: event.assignmentId,
        workOrderId: event.workOrderId,
        status: "started",
      });
      state.workOrders.get(event.workOrderId).status = "field-in-progress";
      break;
    }

    case "ConcreteFreshPropertiesRecorded": {
      const fieldVisit = state.fieldVisits.get(event.fieldVisitId);
      if (!fieldVisit) {
        return deadLetter(state, event, "missing-field-visit", "fresh properties require a field visit");
      }
      state.testSets.set(event.testSetId, {
        testSetId: event.testSetId,
        fieldVisitId: event.fieldVisitId,
        workOrderId: event.workOrderId,
        freshProperties: clone(event.payload),
        status: "field-properties-recorded",
      });
      break;
    }

    case "FieldVisitCompleted": {
      const fieldVisit = state.fieldVisits.get(event.fieldVisitId);
      if (!fieldVisit) {
        return deadLetter(state, event, "missing-field-visit", "field visit must exist before completion");
      }
      fieldVisit.status = "completed";
      state.workOrders.get(event.workOrderId).status = "field-completed";
      break;
    }

    case "SpecimenCreated":
      state.specimens.set(event.specimenId, {
        specimenId: event.specimenId,
        testSetId: event.testSetId,
        workOrderId: event.workOrderId,
        status: "field-created",
        custody: ["field-created"],
        events: [event.eventId],
      });
      break;

    case "SpecimenCustodyTransferred": {
      const specimen = state.specimens.get(event.specimenId);
      if (!specimen) {
        return deadLetter(state, event, "missing-specimen", "specimen must exist before custody transfer");
      }
      if (specimen.status === "received-by-lab") {
        return deadLetter(state, event, "custody-already-received", "received specimen cannot move back to transfer state");
      }
      specimen.status = "transferred-to-lab";
      specimen.custody.push("transferred-to-lab");
      specimen.events.push(event.eventId);
      state.workOrders.get(event.workOrderId).status = "specimens-in-custody";
      break;
    }

    case "SpecimenReceivedByLab": {
      const specimen = state.specimens.get(event.specimenId);
      if (!specimen || specimen.status !== "transferred-to-lab") {
        return deadLetter(state, event, "out-of-order-custody", "lab receipt requires prior custody transfer");
      }
      specimen.status = "received-by-lab";
      specimen.custody.push("received-by-lab");
      specimen.events.push(event.eventId);
      state.workOrders.get(event.workOrderId).status = "lab-received";
      break;
    }

    case "BreakScheduled": {
      const specimen = state.specimens.get(event.specimenId);
      if (!specimen || specimen.status !== "received-by-lab") {
        return deadLetter(state, event, "specimen-not-received", "break scheduling requires lab receipt");
      }
      const labResult = state.labResults.get(event.testSetId) || {
        testSetId: event.testSetId,
        schedules: [],
        results: [],
        amendments: [],
        status: "pending",
      };
      labResult.schedules.push(clone(event.payload));
      labResult.status = "break-scheduled";
      state.labResults.set(event.testSetId, labResult);
      state.workOrders.get(event.workOrderId).status = "break-scheduled";
      break;
    }

    case "BreakResultRecorded": {
      const labResult = state.labResults.get(event.testSetId);
      if (!labResult || labResult.schedules.length === 0) {
        return deadLetter(state, event, "break-not-scheduled", "break result requires a break schedule");
      }
      labResult.results.push({ eventId: event.eventId, payload: clone(event.payload) });
      labResult.status = "result-recorded";
      state.workOrders.get(event.workOrderId).status = "result-recorded";
      break;
    }

    case "LabResultReviewed": {
      const labResult = state.labResults.get(event.testSetId);
      if (!labResult || labResult.results.length === 0) {
        return deadLetter(state, event, "missing-break-result", "review requires a recorded break result");
      }
      labResult.review = { eventId: event.eventId, payload: clone(event.payload) };
      labResult.status = "result-reviewed";
      state.workOrders.get(event.workOrderId).status = "result-reviewed";
      break;
    }

    case "LabResultApproved": {
      const labResult = state.labResults.get(event.testSetId);
      if (!labResult || !labResult.review || labResult.review.payload.reviewDecision !== "ready_for_approval") {
        return deadLetter(state, event, "result-not-reviewed", "approval requires ready-for-approval review");
      }
      const latestResult = labResult.results[labResult.results.length - 1];
      labResult.approved = {
        approvedEventId: event.eventId,
        approvedPayload: clone(event.payload),
        immutableResult: clone(latestResult.payload),
      };
      labResult.status = "result-approved";
      state.workOrders.get(event.workOrderId).status = "result-approved";
      break;
    }

    case "LabResultAmended": {
      const labResult = state.labResults.get(event.testSetId);
      if (!labResult || !labResult.approved) {
        return deadLetter(state, event, "approved-result-required", "amendment requires an approved result");
      }
      if (event.supersedesEventId !== labResult.approved.approvedEventId) {
        return deadLetter(state, event, "superseded-event-mismatch", "amendment must supersede the approved result event");
      }
      labResult.amendments.push({
        eventId: event.eventId,
        supersedesEventId: event.supersedesEventId,
        payload: clone(event.payload),
      });
      labResult.status = "amended-result-present";
      state.workOrders.get(event.workOrderId).status = "amended-result-present";
      break;
    }

    case "NonconformanceRaised":
      if (event.payload.advisoryOnly !== true) {
        return deadLetter(state, event, "nonconformance-must-be-advisory", "nonconformance flags are advisory until reviewed");
      }
      state.nonconformances.push(clone(event.payload));
      break;

    case "OperationalStatusChanged":
      if (event.payload.attemptedLabResultMutation) {
        const rejected = result("rejected", event, "dispatch-lab-result-mutation", "dispatch cannot mutate approved laboratory results");
        state.rejected.push(rejected);
        return rejected;
      }
      state.workOrders.get(event.workOrderId).status = event.payload.status;
      break;

    case "WorkOrderClosed":
      state.workOrders.get(event.workOrderId).status = "closed";
      break;

    default:
      throw new Error(`unhandled event type ${event.eventType}`);
  }

  const accepted = result("accepted", event, "accepted", "event accepted");
  state.accepted.push(accepted);
  return accepted;
}

export function runEvents(events, initialState = createSimulatorState()) {
  const state = initialState;
  const results = [];

  for (const event of events) {
    results.push(applyEvent(state, event));
  }

  return { state, results, summary: summarize(state) };
}

export function summarize(state) {
  return {
    accepted: state.accepted.length,
    duplicates: state.duplicateEvents.length,
    rejected: state.rejected.length,
    deadLettered: state.deadLettered.length,
    workOrders: state.workOrders.size,
    specimens: state.specimens.size,
    labResults: state.labResults.size,
  };
}

export function traceSpecimen(state, specimenId) {
  const specimen = state.specimens.get(specimenId);
  if (!specimen) {
    return null;
  }

  const labResult = state.labResults.get(specimen.testSetId);

  return {
    specimenId,
    testSetId: specimen.testSetId,
    custody: clone(specimen.custody),
    labResultStatus: labResult ? labResult.status : "none",
    approvedStrength: labResult && labResult.approved
      ? clone(labResult.approved.immutableResult.compressiveStrength)
      : null,
    amendments: labResult ? clone(labResult.amendments) : [],
  };
}

export function simulateOutbox(outbox, initialState = createSimulatorState()) {
  const state = initialState;
  const attempts = [];

  outbox.networkPlan.forEach((networkState, index) => {
    if (networkState !== "online") {
      attempts.push({
        attempt: index + 1,
        networkState,
        syncState: "queued",
      });
      return;
    }

    const intake = applyEvent(state, outbox.event);
    attempts.push({
      attempt: index + 1,
      networkState,
      syncState: intake.status === "accepted" || intake.status === "duplicate" ? "acknowledged" : "failed",
      code: intake.code,
    });
  });

  return { state, attempts, summary: summarize(state) };
}

export function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveCliFixture(rawPath) {
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }

  return path.resolve(process.cwd(), rawPath);
}

export function runFixtureFile(filePath) {
  const fixture = loadJson(filePath);
  return runEvents(fixture.events || []);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixtureArgIndex = process.argv.indexOf("--fixture");
  if (fixtureArgIndex === -1 || !process.argv[fixtureArgIndex + 1]) {
    console.error("Usage: node simulator.mjs --fixture <fixture.json>");
    process.exitCode = 2;
  } else {
    const fixturePath = resolveCliFixture(process.argv[fixtureArgIndex + 1]);
    const { state, results, summary } = runFixtureFile(fixturePath);
    const output = {
      fixture: path.relative(process.cwd(), fixturePath),
      summary,
      lastResult: results[results.length - 1] || null,
      specimens: Array.from(state.specimens.keys()),
      labResults: Array.from(state.labResults.keys()),
      rejected: state.rejected,
      deadLettered: state.deadLettered,
    };
    console.log(JSON.stringify(output, null, 2));
    process.exitCode = summary.rejected === 0 && summary.deadLettered === 0 ? 0 : 1;
  }
}
