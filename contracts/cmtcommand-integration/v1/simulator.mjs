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
  "AgeGroupAverageDerived",
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
  "organizationId",
  "officeId",
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
  AssignmentPublished: ["technicianId", "scheduledStart", "scheduledEnd", "requiredServiceType", "requiredEquipment"],
  AssignmentAccepted: ["acceptedAt", "deviceId"],
  FieldVisitStarted: ["startedAt", "deviceId"],
  FieldVisitCompleted: ["completedAt", "completionStatus"],
  ConcreteFreshPropertiesRecorded: ["sampledAt", "supplier", "truckTicket", "mixDesignId", "freshProperties", "methodReferences", "calibrationReferences"],
  SpecimenCreated: ["specimenLabel", "specimenKind", "dimensions", "curingMethod", "moldedAt", "createdAt"],
  SpecimenCustodyTransferred: ["transferredAt", "fromActorId", "toActorId", "condition"],
  SpecimenReceivedByLab: ["receivedAt", "receivedBy", "condition"],
  BreakScheduled: ["breakAgeDays", "scheduledFor", "destructiveTest", "methodReferences"],
  BreakResultRecorded: ["resultKind", "testedAt", "breakAgeDays", "measuredDimensions", "crossSectionalArea", "maximumLoad", "compressiveStrength", "fractureType", "testingTechnician", "testingMachine", "methodReferences", "validationStatus", "evidenceReferences"],
  AgeGroupAverageDerived: ["breakAgeDays", "resultEventIds", "averageCompressiveStrength", "calculatedAt", "calculationMethod"],
  LabResultReviewed: ["resultEventId", "reviewedAt", "reviewerId", "reviewDecision"],
  LabResultApproved: ["resultEventId", "approvedAt", "approverId", "approvalStatement"],
  LabResultAmended: ["resultEventId", "approvedEventId", "amendedAt", "amendedBy", "amendmentReason", "correctedFields"],
  NonconformanceRaised: ["nonconformanceId", "raisedAt", "category", "description", "advisoryOnly"],
  OperationalStatusChanged: ["status", "reason"],
  WorkOrderClosed: ["closedAt", "closureReason"],
};

const LAB_RESULT_WRITER_ROLES = new Set(["lab_technician"]);
const LAB_REVIEWER_ROLES = new Set(["lab_reviewer", "technical_reviewer"]);
const LAB_APPROVER_ROLES = new Set(["lab_approver"]);
const LAB_RECEIVER_ROLES = new Set(["lab_receiver", "lab_technician"]);
const DISPATCH_WRITER_ROLES = new Set(["organization_admin", "operations_manager", "dispatcher", "system"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isUtcDateTime(value) {
  return typeof value === "string" && value.endsWith("Z") && !Number.isNaN(Date.parse(value));
}

function isCurrentCalibration(reference, measuredAt) {
  if (!reference || typeof reference !== "object") {
    return false;
  }

  if (!hasText(reference.equipmentId) || !hasText(reference.calibrationReference)) {
    return false;
  }

  if (reference.calibrationStatus !== "current") {
    return false;
  }

  if (!isUtcDateTime(reference.calibratedAt) || !isUtcDateTime(reference.expiresAt)) {
    return false;
  }

  return Date.parse(reference.calibratedAt) <= Date.parse(measuredAt)
    && Date.parse(reference.expiresAt) >= Date.parse(measuredAt);
}

function makeResult(status, event, code, message) {
  return {
    status,
    code,
    message,
    eventId: event && event.eventId,
    eventType: event && event.eventType,
  };
}

function reject(state, event, code, message) {
  const rejected = makeResult("rejected", event, code, message);
  state.rejected.push(rejected);
  return rejected;
}

function duplicate(state, event) {
  const duplicated = makeResult("duplicate", event, "duplicate-event", "event already accepted");
  state.duplicateEvents.push(duplicated);
  return duplicated;
}

function accept(state, event) {
  const digest = stableStringify(event);
  const aggregateKey = aggregateKeyFor(event);
  state.seenEventIds.set(event.eventId, digest);
  state.seenIdempotencyKeys.set(event.idempotencyKey, digest);
  state.revisions.set(aggregateKey, event.revision);
  state.accepted.push(makeResult("accepted", event, "accepted", "event accepted"));
  state.feed.push(clone(event));
  return state.accepted[state.accepted.length - 1];
}

export function createSimulatorState() {
  return {
    accepted: [],
    duplicateEvents: [],
    rejected: [],
    deadLettered: [],
    feed: [],
    seenEventIds: new Map(),
    seenIdempotencyKeys: new Map(),
    revisions: new Map(),
    workOrders: new Map(),
    assignments: new Map(),
    fieldVisits: new Map(),
    testSets: new Map(),
    specimens: new Map(),
    specimenLabelsByTestSet: new Map(),
    breakResults: new Map(),
    reviews: new Map(),
    approvals: new Map(),
    ageGroupAverages: new Map(),
    amendments: [],
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

  if ([
    "SpecimenCreated",
    "SpecimenCustodyTransferred",
    "SpecimenReceivedByLab",
    "BreakScheduled",
    "BreakResultRecorded",
    "LabResultReviewed",
    "LabResultApproved",
    "LabResultAmended",
  ].includes(event.eventType)) {
    return `specimen:${event.specimenId}`;
  }

  if (event.eventType === "AgeGroupAverageDerived") {
    return `testSet:${event.testSetId}:age:${event.payload.breakAgeDays}`;
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

  if ("tenantId" in event || "branchId" in event) {
    errors.push("tenantId and branchId are not valid v1 fields; use organizationId and officeId");
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

  if (!hasText(event.eventId) || !UUID_PATTERN.test(event.eventId)) {
    errors.push("eventId must be a UUID");
  }

  if (!hasText(event.organizationId) || !hasText(event.officeId)) {
    errors.push("organizationId and officeId are required");
  }

  if (!isUtcDateTime(event.occurredAt) || !isUtcDateTime(event.producedAt)) {
    errors.push("occurredAt and producedAt must be UTC date-time strings");
  }

  if (isUtcDateTime(event.occurredAt) && isUtcDateTime(event.producedAt) && Date.parse(event.occurredAt) > Date.parse(event.producedAt)) {
    errors.push("occurredAt must not be after producedAt");
  }

  if ("serverReceivedAt" in event) {
    if (!isUtcDateTime(event.serverReceivedAt)) {
      errors.push("serverReceivedAt must be a UTC date-time string when present");
    } else if (isUtcDateTime(event.producedAt) && Date.parse(event.producedAt) > Date.parse(event.serverReceivedAt)) {
      errors.push("producedAt must not be after serverReceivedAt");
    }
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

  if (event.eventType === "SpecimenCreated" && event.payload && "specimenCount" in event.payload) {
    errors.push("SpecimenCreated represents one physical specimen; specimenCount is not allowed");
  }

  if (event.eventType === "LabResultAmended" && !hasText(event.supersedesEventId)) {
    errors.push("LabResultAmended requires supersedesEventId");
  }

  return errors;
}

function checkDuplicateOrConflict(state, event) {
  const digest = stableStringify(event);
  const eventDigest = state.seenEventIds.get(event.eventId);
  const idempotencyDigest = state.seenIdempotencyKeys.get(event.idempotencyKey);

  if (eventDigest || idempotencyDigest) {
    if (eventDigest === digest && idempotencyDigest === digest) {
      return duplicate(state, event);
    }

    return reject(state, event, "idempotency-conflict", "event id or idempotency key was reused for a different event");
  }

  return null;
}

function checkRevision(state, event) {
  const aggregateKey = aggregateKeyFor(event);
  const currentRevision = state.revisions.get(aggregateKey) || 0;

  if (event.revision <= currentRevision) {
    return reject(state, event, "stale-revision", `revision ${event.revision} is not newer than ${currentRevision}`);
  }

  return null;
}

function checkScope(record, event) {
  if (record.organizationId !== event.organizationId) {
    return "cross-organization-access";
  }

  if (record.officeId !== event.officeId) {
    return "cross-office-access";
  }

  return null;
}

function requireWorkOrder(state, event) {
  const workOrder = state.workOrders.get(event.workOrderId);
  if (!workOrder) {
    return { error: "missing-work-order", message: "work order must exist first" };
  }

  const scopeError = checkScope(workOrder, event);
  if (scopeError) {
    return { error: scopeError, message: "event scope does not match work order scope" };
  }

  return { workOrder };
}

function requireAssignment(state, event) {
  const assignment = state.assignments.get(event.assignmentId);
  if (!assignment) {
    return { error: "missing-assignment", message: "assignment must be published first" };
  }

  const scopeError = checkScope(assignment, event);
  if (scopeError) {
    return { error: scopeError, message: "event scope does not match assignment scope" };
  }

  return { assignment };
}

function requireFieldVisit(state, event) {
  const fieldVisit = state.fieldVisits.get(event.fieldVisitId);
  if (!fieldVisit) {
    return { error: "missing-field-visit", message: "field visit must exist first" };
  }

  const scopeError = checkScope(fieldVisit, event);
  if (scopeError) {
    return { error: scopeError, message: "event scope does not match field visit scope" };
  }

  return { fieldVisit };
}

function requireTestSet(state, event) {
  const testSet = state.testSets.get(event.testSetId);
  if (!testSet) {
    return { error: "missing-test-set", message: "test set must exist first" };
  }

  const scopeError = checkScope(testSet, event);
  if (scopeError) {
    return { error: scopeError, message: "event scope does not match test set scope" };
  }

  return { testSet };
}

function requireSpecimen(state, event) {
  const specimen = state.specimens.get(event.specimenId);
  if (!specimen) {
    return { error: "unknown-specimen", message: "specimen must exist first" };
  }

  const scopeError = checkScope(specimen, event);
  if (scopeError) {
    return { error: scopeError, message: "event scope does not match specimen scope" };
  }

  if (event.testSetId && specimen.testSetId !== event.testSetId) {
    return { error: "specimen-test-set-mismatch", message: "specimen does not belong to the event test set" };
  }

  return { specimen };
}

function requireRole(event, allowedRoles, code, message) {
  if (!allowedRoles.has(event.actorRole)) {
    return { error: code, message };
  }

  return null;
}

function requireSource(event, allowedSources, code, message) {
  if (!allowedSources.has(event.sourceSystem)) {
    return { error: code, message };
  }

  return null;
}

function rejectIfPreconditionFailed(state, event, precondition) {
  if (precondition && precondition.error) {
    return reject(state, event, precondition.error, precondition.message);
  }

  return null;
}

function requireCalibrationForEvent(event) {
  if (event.eventType === "ConcreteFreshPropertiesRecorded") {
    const references = event.payload.calibrationReferences || [];
    return references.length > 0 && references.every((item) => isCurrentCalibration(item, event.payload.sampledAt));
  }

  if (event.eventType === "BreakResultRecorded") {
    return isCurrentCalibration(event.payload.testingMachine, event.payload.testedAt);
  }

  return true;
}

function applyDomainEvent(state, event) {
  if (!requireCalibrationForEvent(event)) {
    return reject(state, event, "missing-or-expired-calibration", "required calibration metadata is missing, expired, or not current");
  }

  if (event.eventType !== "WorkOrderCreated") {
    const workOrderPrecondition = requireWorkOrder(state, event);
    const workOrderFailure = rejectIfPreconditionFailed(state, event, workOrderPrecondition);
    if (workOrderFailure) {
      return workOrderFailure;
    }
  }

  switch (event.eventType) {
    case "WorkOrderCreated": {
      const existing = state.workOrders.get(event.workOrderId);
      if (existing) {
        const scopeError = checkScope(existing, event);
        return reject(state, event, scopeError || "work-order-already-exists", "work order already exists");
      }

      const roleError = requireRole(event, DISPATCH_WRITER_ROLES, "forbidden-dispatch-writer", "actor cannot create work orders");
      const sourceError = requireSource(event, new Set(["CMTCommandOperational", "CMTCommandDispatch"]), "forbidden-source-system", "work order must come from operational dispatch");
      const failure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (failure) {
        return failure;
      }

      state.workOrders.set(event.workOrderId, {
        organizationId: event.organizationId,
        officeId: event.officeId,
        workOrderId: event.workOrderId,
        projectId: event.projectId,
        status: "created",
        sourceEventIds: [event.eventId],
      });
      break;
    }

    case "AssignmentPublished": {
      const roleError = requireRole(event, DISPATCH_WRITER_ROLES, "forbidden-dispatch-writer", "actor cannot publish assignments");
      const sourceError = requireSource(event, new Set(["CMTCommandOperational", "CMTCommandDispatch"]), "forbidden-source-system", "assignment publish must come from operational dispatch");
      const failure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (failure) {
        return failure;
      }

      state.assignments.set(event.assignmentId, {
        organizationId: event.organizationId,
        officeId: event.officeId,
        assignmentId: event.assignmentId,
        workOrderId: event.workOrderId,
        technicianId: event.payload.technicianId,
        status: "published",
      });
      state.workOrders.get(event.workOrderId).status = "assignment-published";
      break;
    }

    case "AssignmentAccepted": {
      const { assignment, error, message } = requireAssignment(state, event);
      const failure = rejectIfPreconditionFailed(state, event, { error, message });
      if (failure) {
        return failure;
      }

      if (assignment.status !== "published") {
        return reject(state, event, "assignment-not-published", "assignment must be published before acceptance");
      }

      assignment.status = "accepted";
      state.workOrders.get(event.workOrderId).status = "field-accepted";
      break;
    }

    case "FieldVisitStarted": {
      const { assignment, error, message } = requireAssignment(state, event);
      const failure = rejectIfPreconditionFailed(state, event, { error, message });
      if (failure) {
        return failure;
      }

      if (assignment.status !== "accepted") {
        return reject(state, event, "assignment-not-accepted", "field visit requires an accepted assignment");
      }

      state.fieldVisits.set(event.fieldVisitId, {
        organizationId: event.organizationId,
        officeId: event.officeId,
        fieldVisitId: event.fieldVisitId,
        assignmentId: event.assignmentId,
        workOrderId: event.workOrderId,
        status: "started",
      });
      state.workOrders.get(event.workOrderId).status = "field-in-progress";
      break;
    }

    case "ConcreteFreshPropertiesRecorded": {
      const failure = rejectIfPreconditionFailed(state, event, requireFieldVisit(state, event));
      if (failure) {
        return failure;
      }

      state.testSets.set(event.testSetId, {
        organizationId: event.organizationId,
        officeId: event.officeId,
        testSetId: event.testSetId,
        fieldVisitId: event.fieldVisitId,
        workOrderId: event.workOrderId,
        freshProperties: clone(event.payload),
        status: "field-properties-recorded",
        specimenIds: [],
      });
      state.specimenLabelsByTestSet.set(event.testSetId, new Set());
      break;
    }

    case "SpecimenCreated": {
      const fieldVisitFailure = rejectIfPreconditionFailed(state, event, requireFieldVisit(state, event));
      if (fieldVisitFailure) {
        return fieldVisitFailure;
      }

      const { testSet, error, message } = requireTestSet(state, event);
      const testSetFailure = rejectIfPreconditionFailed(state, event, { error, message });
      if (testSetFailure) {
        return testSetFailure;
      }

      if (state.specimens.has(event.specimenId)) {
        return reject(state, event, "specimen-already-exists", "specimen id already exists");
      }

      const labels = state.specimenLabelsByTestSet.get(event.testSetId);
      if (labels.has(event.payload.specimenLabel)) {
        return reject(state, event, "specimen-label-conflict", "specimen label already exists in this test set");
      }

      labels.add(event.payload.specimenLabel);
      testSet.specimenIds.push(event.specimenId);
      state.specimens.set(event.specimenId, {
        organizationId: event.organizationId,
        officeId: event.officeId,
        specimenId: event.specimenId,
        specimenLabel: event.payload.specimenLabel,
        testSetId: event.testSetId,
        workOrderId: event.workOrderId,
        status: "field-created",
        custody: ["field-created"],
        events: [event.eventId],
        breakSchedule: null,
        resultEventId: null,
        approvedEventId: null,
        amendments: [],
      });
      break;
    }

    case "FieldVisitCompleted": {
      const { fieldVisit, error, message } = requireFieldVisit(state, event);
      const failure = rejectIfPreconditionFailed(state, event, { error, message });
      if (failure) {
        return failure;
      }

      fieldVisit.status = "completed";
      state.workOrders.get(event.workOrderId).status = "field-completed";
      break;
    }

    case "OperationalStatusChanged": {
      if (event.payload.attemptedLabResultMutation) {
        return reject(state, event, "dispatch-lab-result-mutation", "dispatch cannot mutate laboratory-owned technical results");
      }

      const roleError = requireRole(event, DISPATCH_WRITER_ROLES, "forbidden-dispatch-writer", "actor cannot change operational status");
      const sourceError = requireSource(event, new Set(["CMTCommandOperational", "CMTCommandDispatch", "CMTReadinessDashboard"]), "forbidden-source-system", "operational status must come from operational dispatch or readiness");
      const failure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (failure) {
        return failure;
      }

      state.workOrders.get(event.workOrderId).status = event.payload.status;
      break;
    }

    case "SpecimenCustodyTransferred": {
      const { specimen, error, message } = requireSpecimen(state, event);
      const failure = rejectIfPreconditionFailed(state, event, { error, message });
      if (failure) {
        return failure;
      }

      if (["received-by-lab", "scheduled-for-break", "broken", "reviewed", "approved"].includes(specimen.status)) {
        return reject(state, event, "custody-already-received", "received, scheduled, or tested specimen cannot move back to transfer state");
      }

      specimen.status = "transferred-to-lab";
      specimen.custody.push("transferred-to-lab");
      specimen.events.push(event.eventId);
      state.workOrders.get(event.workOrderId).status = "specimens-in-custody";
      break;
    }

    case "SpecimenReceivedByLab": {
      const receiverRoleError = requireRole(event, LAB_RECEIVER_ROLES, "forbidden-lab-receiver", "actor cannot receive specimens for lab");
      const sourceError = requireSource(event, new Set(["CMTLabSystem"]), "forbidden-source-system", "lab receipt must come from lab system");
      const roleFailure = rejectIfPreconditionFailed(state, event, receiverRoleError || sourceError);
      if (roleFailure) {
        return roleFailure;
      }

      const { specimen, error, message } = requireSpecimen(state, event);
      const failure = rejectIfPreconditionFailed(state, event, { error, message });
      if (failure) {
        return failure;
      }

      if (specimen.status !== "transferred-to-lab") {
        return reject(state, event, "out-of-order-custody", "lab receipt requires prior custody transfer");
      }

      specimen.status = "received-by-lab";
      specimen.receivedAt = event.payload.receivedAt;
      specimen.custody.push("received-by-lab");
      specimen.events.push(event.eventId);
      state.workOrders.get(event.workOrderId).status = "lab-received";
      break;
    }

    case "BreakScheduled": {
      const roleError = requireRole(event, LAB_RESULT_WRITER_ROLES, "forbidden-lab-result-writer", "actor cannot schedule destructive breaks");
      const sourceError = requireSource(event, new Set(["CMTLabSystem"]), "forbidden-source-system", "break schedule must come from lab system");
      const roleFailure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (roleFailure) {
        return roleFailure;
      }

      const { specimen, error, message } = requireSpecimen(state, event);
      const failure = rejectIfPreconditionFailed(state, event, { error, message });
      if (failure) {
        return failure;
      }

      if (specimen.breakSchedule) {
        return reject(state, event, "specimen-break-already-scheduled", "a specimen may have only one planned destructive break assignment");
      }

      if (specimen.status !== "received-by-lab") {
        return reject(state, event, "specimen-not-received", "break scheduling requires lab receipt");
      }

      if (event.payload.destructiveTest !== true) {
        return reject(state, event, "break-must-be-destructive", "compression break schedule must be marked destructive");
      }

      specimen.breakSchedule = {
        eventId: event.eventId,
        breakAgeDays: event.payload.breakAgeDays,
        scheduledFor: event.payload.scheduledFor,
      };
      specimen.status = "scheduled-for-break";
      specimen.events.push(event.eventId);
      state.workOrders.get(event.workOrderId).status = "break-scheduled";
      break;
    }

    case "BreakResultRecorded": {
      const roleError = requireRole(event, LAB_RESULT_WRITER_ROLES, "forbidden-lab-result-writer", "actor cannot record lab results");
      const sourceError = requireSource(event, new Set(["CMTLabSystem"]), "forbidden-source-system", "break result must come from lab system");
      const roleFailure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (roleFailure) {
        return roleFailure;
      }

      const { specimen, error, message } = requireSpecimen(state, event);
      const failure = rejectIfPreconditionFailed(state, event, { error, message });
      if (failure) {
        return failure;
      }

      if (!specimen.receivedAt || Date.parse(event.payload.testedAt) < Date.parse(specimen.receivedAt)) {
        return reject(state, event, "result-before-lab-receipt", "break result cannot occur before lab receipt");
      }

      if (!specimen.breakSchedule) {
        return reject(state, event, "break-not-scheduled", "break result requires a planned break schedule");
      }

      if (specimen.resultEventId) {
        return reject(state, event, "specimen-already-tested", "a destructive specimen may have no more than one original break result");
      }

      if (event.payload.breakAgeDays !== specimen.breakSchedule.breakAgeDays) {
        return reject(state, event, "break-age-mismatch", "break result age must match the planned break assignment");
      }

      specimen.status = "broken";
      specimen.resultEventId = event.eventId;
      specimen.events.push(event.eventId);
      state.breakResults.set(event.eventId, {
        organizationId: event.organizationId,
        officeId: event.officeId,
        resultEventId: event.eventId,
        specimenId: event.specimenId,
        testSetId: event.testSetId,
        breakAgeDays: event.payload.breakAgeDays,
        payload: clone(event.payload),
      });
      state.workOrders.get(event.workOrderId).status = "result-recorded";
      break;
    }

    case "AgeGroupAverageDerived": {
      const roleError = requireRole(event, LAB_RESULT_WRITER_ROLES, "forbidden-lab-result-writer", "actor cannot derive lab averages");
      const sourceError = requireSource(event, new Set(["CMTLabSystem"]), "forbidden-source-system", "age group average must come from lab system");
      const roleFailure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (roleFailure) {
        return roleFailure;
      }

      const testSetFailure = rejectIfPreconditionFailed(state, event, requireTestSet(state, event));
      if (testSetFailure) {
        return testSetFailure;
      }

      const seen = new Set();
      for (const resultEventId of event.payload.resultEventIds || []) {
        if (seen.has(resultEventId)) {
          return reject(state, event, "duplicate-average-source", "average source result ids must be unique");
        }
        seen.add(resultEventId);

        const resultRecord = state.breakResults.get(resultEventId);
        if (!resultRecord) {
          return reject(state, event, "missing-average-source", "age-group average references an unknown break result");
        }

        const scopeError = checkScope(resultRecord, event);
        if (scopeError) {
          return reject(state, event, scopeError, "average source result is outside event scope");
        }

        if (resultRecord.testSetId !== event.testSetId || resultRecord.breakAgeDays !== event.payload.breakAgeDays) {
          return reject(state, event, "average-source-mismatch", "average sources must belong to the same test set and break age");
        }
      }

      state.ageGroupAverages.set(event.eventId, {
        organizationId: event.organizationId,
        officeId: event.officeId,
        testSetId: event.testSetId,
        breakAgeDays: event.payload.breakAgeDays,
        resultEventIds: clone(event.payload.resultEventIds),
        payload: clone(event.payload),
      });
      break;
    }

    case "LabResultReviewed": {
      const roleError = requireRole(event, LAB_REVIEWER_ROLES, "forbidden-lab-reviewer", "actor cannot review lab results");
      const sourceError = requireSource(event, new Set(["CMTLabSystem"]), "forbidden-source-system", "lab review must come from lab system");
      const roleFailure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (roleFailure) {
        return roleFailure;
      }

      const { specimen, error, message } = requireSpecimen(state, event);
      const specimenFailure = rejectIfPreconditionFailed(state, event, { error, message });
      if (specimenFailure) {
        return specimenFailure;
      }

      const resultRecord = state.breakResults.get(event.payload.resultEventId);
      if (!resultRecord || resultRecord.specimenId !== event.specimenId || specimen.resultEventId !== event.payload.resultEventId) {
        return reject(state, event, "missing-break-result", "review requires the specimen's recorded break result");
      }

      specimen.status = "reviewed";
      specimen.events.push(event.eventId);
      state.reviews.set(event.payload.resultEventId, {
        eventId: event.eventId,
        resultEventId: event.payload.resultEventId,
        decision: event.payload.reviewDecision,
        payload: clone(event.payload),
      });
      state.workOrders.get(event.workOrderId).status = "result-reviewed";
      break;
    }

    case "LabResultApproved": {
      const roleError = requireRole(event, LAB_APPROVER_ROLES, "forbidden-lab-approver", "actor cannot approve lab results");
      const sourceError = requireSource(event, new Set(["CMTLabSystem"]), "forbidden-source-system", "lab approval must come from lab system");
      const roleFailure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (roleFailure) {
        return roleFailure;
      }

      const { specimen, error, message } = requireSpecimen(state, event);
      const specimenFailure = rejectIfPreconditionFailed(state, event, { error, message });
      if (specimenFailure) {
        return specimenFailure;
      }

      const resultRecord = state.breakResults.get(event.payload.resultEventId);
      const review = state.reviews.get(event.payload.resultEventId);
      if (!resultRecord || resultRecord.specimenId !== event.specimenId || !review || review.decision !== "ready_for_approval") {
        return reject(state, event, "result-not-reviewed", "approval requires a ready-for-approval review on this specimen result");
      }

      if (state.approvals.has(event.payload.resultEventId)) {
        return reject(state, event, "approved-result-immutable", "approved result cannot be overwritten");
      }

      specimen.status = "approved";
      specimen.approvedEventId = event.eventId;
      specimen.events.push(event.eventId);
      state.approvals.set(event.payload.resultEventId, {
        approvedEventId: event.eventId,
        resultEventId: event.payload.resultEventId,
        approvedPayload: clone(event.payload),
        immutableResult: clone(resultRecord.payload),
      });
      state.workOrders.get(event.workOrderId).status = "result-approved";
      break;
    }

    case "LabResultAmended": {
      const roleError = requireRole(event, LAB_APPROVER_ROLES, "forbidden-lab-approver", "actor cannot amend approved lab results");
      const sourceError = requireSource(event, new Set(["CMTLabSystem"]), "forbidden-source-system", "lab amendment must come from lab system");
      const roleFailure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (roleFailure) {
        return roleFailure;
      }

      const { specimen, error, message } = requireSpecimen(state, event);
      const specimenFailure = rejectIfPreconditionFailed(state, event, { error, message });
      if (specimenFailure) {
        return specimenFailure;
      }

      const approval = state.approvals.get(event.payload.resultEventId);
      if (!approval) {
        return reject(state, event, "approved-result-required", "amendment requires an approved result");
      }

      if (event.supersedesEventId !== approval.approvedEventId || event.payload.approvedEventId !== approval.approvedEventId) {
        return reject(state, event, "superseded-event-mismatch", "amendment must supersede the approved result event");
      }

      specimen.status = "amended";
      specimen.amendments.push(event.eventId);
      specimen.events.push(event.eventId);
      state.amendments.push({
        eventId: event.eventId,
        resultEventId: event.payload.resultEventId,
        supersedesEventId: event.supersedesEventId,
        payload: clone(event.payload),
      });
      state.workOrders.get(event.workOrderId).status = "amended-result-present";
      break;
    }

    case "NonconformanceRaised":
      if (event.payload.advisoryOnly !== true) {
        return reject(state, event, "nonconformance-must-be-advisory", "nonconformance flags are advisory until reviewed");
      }
      state.nonconformances.push(clone(event.payload));
      break;

    case "WorkOrderClosed": {
      const roleError = requireRole(event, DISPATCH_WRITER_ROLES, "forbidden-dispatch-writer", "actor cannot close work orders");
      const sourceError = requireSource(event, new Set(["CMTCommandOperational", "CMTCommandDispatch"]), "forbidden-source-system", "work order close must come from operational dispatch");
      const failure = rejectIfPreconditionFailed(state, event, roleError || sourceError);
      if (failure) {
        return failure;
      }

      state.workOrders.get(event.workOrderId).status = "closed";
      break;
    }

    default:
      return reject(state, event, "unhandled-event-type", `unhandled event type ${event.eventType}`);
  }

  return accept(state, event);
}

export function applyEvent(state, event) {
  const validationErrors = validateEnvelope(event);
  if (validationErrors.length > 0) {
    return reject(state, event, "schema-validation", validationErrors.join("; "));
  }

  const duplicateOrConflict = checkDuplicateOrConflict(state, event);
  if (duplicateOrConflict) {
    return duplicateOrConflict;
  }

  const revisionError = checkRevision(state, event);
  if (revisionError) {
    return revisionError;
  }

  return applyDomainEvent(state, event);
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
    testSets: state.testSets.size,
    specimens: state.specimens.size,
    breakResults: state.breakResults.size,
    ageGroupAverages: state.ageGroupAverages.size,
    amendments: state.amendments.length,
  };
}

export function traceSpecimen(state, specimenId) {
  const specimen = state.specimens.get(specimenId);
  if (!specimen) {
    return null;
  }

  const result = specimen.resultEventId ? state.breakResults.get(specimen.resultEventId) : null;
  const approval = specimen.resultEventId ? state.approvals.get(specimen.resultEventId) : null;

  return {
    specimenId,
    specimenLabel: specimen.specimenLabel,
    testSetId: specimen.testSetId,
    custody: clone(specimen.custody),
    status: specimen.status,
    breakAgeDays: result ? result.breakAgeDays : null,
    approvedStrength: approval ? clone(approval.immutableResult.compressiveStrength) : null,
    amendments: clone(specimen.amendments),
  };
}

export function readEventFeed(state, cursor = "", limit = 100) {
  const startIndex = cursor ? Number.parseInt(cursor, 10) : 0;
  const safeStart = Number.isInteger(startIndex) && startIndex >= 0 ? startIndex : 0;
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const events = state.feed.slice(safeStart, safeStart + safeLimit);
  const nextIndex = safeStart + events.length;

  return {
    events,
    nextCursor: String(nextIndex),
    hasMore: nextIndex < state.feed.length,
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
      breakResults: Array.from(state.breakResults.keys()),
      ageGroupAverages: Array.from(state.ageGroupAverages.keys()),
      rejected: state.rejected,
      deadLettered: state.deadLettered,
    };
    console.log(JSON.stringify(output, null, 2));
    process.exitCode = summary.rejected === 0 && summary.deadLettered === 0 ? 0 : 1;
  }
}
