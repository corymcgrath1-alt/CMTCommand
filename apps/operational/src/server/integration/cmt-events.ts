import { z } from "zod";

import eventEnvelopeSchemaJson from "../../../../../contracts/cmtcommand-integration/v1/schemas/event-envelope.schema.json";

type ContractStringEnumProperty = {
  enum?: string[];
  const?: string;
};

type ContractEnvelopeSchema = {
  required?: string[];
  properties?: Record<string, ContractStringEnumProperty>;
};

const eventEnvelopeSchema = eventEnvelopeSchemaJson as ContractEnvelopeSchema;

function readRequiredStringEnum(propertyName: string): [string, ...string[]] {
  const values = eventEnvelopeSchema.properties?.[propertyName]?.enum;
  if (!values || values.length === 0 || values.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new Error(`CMT integration contract is missing ${propertyName} enum values.`);
  }

  return values as [string, ...string[]];
}

function readRequiredConst(propertyName: string): string {
  const value = eventEnvelopeSchema.properties?.[propertyName]?.const;
  if (!value) {
    throw new Error(`CMT integration contract is missing ${propertyName} const value.`);
  }

  return value;
}

export const CMT_INTEGRATION_SCHEMA_VERSION = readRequiredConst("schemaVersion");
export const cmtIntegrationEventTypes = readRequiredStringEnum("eventType");
export const cmtIntegrationSourceSystems = readRequiredStringEnum("sourceSystem");
export const cmtIntegrationActorRoles = readRequiredStringEnum("actorRole");

export const cmtIntegrationEventTypeSchema = z.enum(cmtIntegrationEventTypes);
export const cmtIntegrationSourceSystemSchema = z.enum(cmtIntegrationSourceSystems);
export const cmtIntegrationActorRoleSchema = z.enum(cmtIntegrationActorRoles);

const utcDateTimeSchema = z.string().refine((value) => value.endsWith("Z") && !Number.isNaN(Date.parse(value)), {
  message: "Expected a UTC date-time string.",
});

const measurementSchema = z.object({
  value: z.number(),
  unit: z.string().min(1),
  method: z.string().min(1).optional(),
}).strict();

const methodReferenceSchema = z.object({
  identifier: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1).optional(),
}).strict();

const calibrationReferenceSchema = z.object({
  equipmentId: z.string().min(1),
  calibrationReference: z.string().min(1),
  calibrationStatus: z.literal("current"),
  calibratedAt: utcDateTimeSchema,
  expiresAt: utcDateTimeSchema,
}).strict();

const evidenceReferenceSchema = z.object({
  evidenceId: z.string().min(1),
  evidenceType: z.enum([
    "field_entry",
    "custody_log",
    "lab_machine_reading",
    "review_note",
    "attachment_metadata",
    "system_status",
  ]),
  provenance: z.string().min(1),
  capturedAt: utcDateTimeSchema,
  attachmentMetadata: z.object({
    fileName: z.string().min(1).optional(),
    contentType: z.string().min(1).optional(),
    byteSize: z.number().int().min(0).optional(),
    digest: z.string().min(1).optional(),
  }).strict().optional(),
}).strict();

const specimenDimensionsSchema = z.object({
  diameter: measurementSchema,
  height: measurementSchema,
}).strict();

const freshPropertiesSchema = z.object({
  slump: measurementSchema,
  airContent: measurementSchema,
  concreteTemperature: measurementSchema,
  ambientTemperature: measurementSchema,
  unitWeight: measurementSchema.optional(),
  yield: measurementSchema.optional(),
  waterAdded: measurementSchema.optional(),
}).strict();

export const cmtIntegrationPayloadSchemas = {
  WorkOrderCreated: z.object({
    projectName: z.string().min(1),
    serviceType: z.string().min(1),
    placementLocation: z.string().min(1),
    readinessRequirements: z.array(z.string().min(1)),
  }).strict(),
  AssignmentPublished: z.object({
    technicianId: z.string().min(1),
    scheduledStart: utcDateTimeSchema,
    scheduledEnd: utcDateTimeSchema,
    requiredServiceType: z.string().min(1),
    requiredEquipment: z.array(z.string().min(1)),
  }).strict(),
  AssignmentAccepted: z.object({
    acceptedAt: utcDateTimeSchema,
    deviceId: z.string().min(1),
  }).strict(),
  FieldVisitStarted: z.object({
    startedAt: utcDateTimeSchema,
    deviceId: z.string().min(1),
    offlineCaptured: z.boolean().optional(),
  }).strict(),
  FieldVisitCompleted: z.object({
    completedAt: utcDateTimeSchema,
    completionStatus: z.string().min(1),
    remarks: z.string().optional(),
  }).strict(),
  ConcreteFreshPropertiesRecorded: z.object({
    sampledAt: utcDateTimeSchema,
    supplier: z.string().min(1),
    truckTicket: z.string().min(1),
    batchTicket: z.string().min(1).optional(),
    mixDesignId: z.string().min(1),
    freshProperties: freshPropertiesSchema,
    methodReferences: z.array(methodReferenceSchema).min(1),
    calibrationReferences: z.array(calibrationReferenceSchema).min(1),
    remarks: z.string().optional(),
  }).strict(),
  SpecimenCreated: z.object({
    specimenLabel: z.string().min(1),
    specimenKind: z.literal("concrete_cylinder"),
    dimensions: specimenDimensionsSchema,
    curingMethod: z.string().min(1),
    moldedAt: utcDateTimeSchema,
    createdAt: utcDateTimeSchema,
    remarks: z.string().optional(),
  }).strict(),
  SpecimenCustodyTransferred: z.object({
    transferredAt: utcDateTimeSchema,
    fromActorId: z.string().min(1),
    toActorId: z.string().min(1),
    condition: z.string().min(1),
    custodyRemarks: z.string().optional(),
  }).strict(),
  SpecimenReceivedByLab: z.object({
    receivedAt: utcDateTimeSchema,
    receivedBy: z.string().min(1),
    condition: z.string().min(1),
  }).strict(),
  BreakScheduled: z.object({
    breakAgeDays: z.number().int().min(1),
    scheduledFor: utcDateTimeSchema,
    destructiveTest: z.literal(true),
    methodReferences: z.array(methodReferenceSchema).min(1),
  }).strict(),
  BreakResultRecorded: z.object({
    resultKind: z.literal("original_destructive"),
    testedAt: utcDateTimeSchema,
    breakAgeDays: z.number().int().min(1),
    measuredDimensions: specimenDimensionsSchema,
    crossSectionalArea: measurementSchema,
    maximumLoad: measurementSchema,
    compressiveStrength: measurementSchema,
    fractureType: z.string().min(1),
    testingTechnician: z.string().min(1),
    testingMachine: calibrationReferenceSchema,
    methodReferences: z.array(methodReferenceSchema).min(1),
    validationStatus: z.literal("recorded"),
    evidenceReferences: z.array(evidenceReferenceSchema).min(1),
  }).strict(),
  AgeGroupAverageDerived: z.object({
    breakAgeDays: z.number().int().min(1),
    resultEventIds: z.array(z.string().uuid()).min(1),
    averageCompressiveStrength: measurementSchema,
    calculatedAt: utcDateTimeSchema,
    calculationMethod: z.string().min(1),
  }).strict(),
  LabResultReviewed: z.object({
    resultEventId: z.string().uuid(),
    reviewedAt: utcDateTimeSchema,
    reviewerId: z.string().min(1),
    reviewDecision: z.enum(["ready_for_approval", "needs_correction"]),
    reviewNotes: z.string().optional(),
  }).strict(),
  LabResultApproved: z.object({
    resultEventId: z.string().uuid(),
    approvedAt: utcDateTimeSchema,
    approverId: z.string().min(1),
    approvalStatement: z.string().min(1),
    reportNumber: z.string().min(1).optional(),
  }).strict(),
  LabResultAmended: z.object({
    resultEventId: z.string().uuid(),
    approvedEventId: z.string().uuid(),
    amendedAt: utcDateTimeSchema,
    amendedBy: z.string().min(1),
    amendmentReason: z.string().min(1),
    correctedFields: z.record(z.string(), z.unknown()),
  }).strict(),
  NonconformanceRaised: z.object({
    nonconformanceId: z.string().min(1),
    raisedAt: utcDateTimeSchema,
    category: z.string().min(1),
    description: z.string().min(1),
    advisoryOnly: z.literal(true),
  }).strict(),
  OperationalStatusChanged: z.object({
    status: z.string().min(1),
    reason: z.string().min(1),
    derivedFromEventIds: z.array(z.string().uuid()).optional(),
    attemptedLabResultMutation: z.boolean().optional(),
  }).strict(),
  WorkOrderClosed: z.object({
    closedAt: utcDateTimeSchema,
    closureReason: z.string().min(1),
  }).strict(),
} as const;

export type CmtIntegrationEventType = keyof typeof cmtIntegrationPayloadSchemas;
export type CmtIntegrationPayloadByType = {
  [EventType in CmtIntegrationEventType]: z.infer<(typeof cmtIntegrationPayloadSchemas)[EventType]>;
};

export const cmtIntegrationBaseEventSchema = z.object({
  eventId: z.string().uuid(),
  schemaVersion: z.literal(CMT_INTEGRATION_SCHEMA_VERSION),
  eventType: cmtIntegrationEventTypeSchema,
  sourceSystem: cmtIntegrationSourceSystemSchema,
  organizationId: z.string().min(1),
  officeId: z.string().min(1),
  occurredAt: utcDateTimeSchema,
  producedAt: utcDateTimeSchema,
  serverReceivedAt: utcDateTimeSchema.optional(),
  correlationId: z.string().min(1),
  workOrderId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  assignmentId: z.string().min(1).optional(),
  fieldVisitId: z.string().min(1).optional(),
  testSetId: z.string().min(1).optional(),
  specimenId: z.string().min(1).optional(),
  actorId: z.string().min(1),
  actorRole: cmtIntegrationActorRoleSchema,
  revision: z.number().int().min(1),
  idempotencyKey: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  supersedesEventId: z.string().uuid().optional(),
}).strict().superRefine((event, context) => {
  if (Date.parse(event.occurredAt) > Date.parse(event.producedAt)) {
    context.addIssue({
      code: "custom",
      path: ["producedAt"],
      message: "producedAt must not precede occurredAt.",
    });
  }

  if (event.serverReceivedAt && Date.parse(event.producedAt) > Date.parse(event.serverReceivedAt)) {
    context.addIssue({
      code: "custom",
      path: ["serverReceivedAt"],
      message: "serverReceivedAt must not precede producedAt.",
    });
  }
});

export type CmtIntegrationBaseEventEnvelope = z.infer<typeof cmtIntegrationBaseEventSchema>;

export type CmtIntegrationEvent<EventType extends CmtIntegrationEventType = CmtIntegrationEventType> =
  Omit<CmtIntegrationBaseEventEnvelope, "eventType" | "payload"> & {
    eventType: EventType;
    payload: CmtIntegrationPayloadByType[EventType];
  };

export type CmtIntegrationValidationResult =
  | { success: true; data: CmtIntegrationEvent }
  | { success: false; issues: z.ZodIssue[] };

export function getCanonicalCmtIntegrationEventTypes(): readonly string[] {
  return cmtIntegrationEventTypes;
}

export function validateCmtIntegrationEvent(input: unknown): CmtIntegrationValidationResult {
  const envelopeResult = cmtIntegrationBaseEventSchema.safeParse(input);
  if (!envelopeResult.success) {
    return { success: false, issues: envelopeResult.error.issues };
  }

  const eventType = envelopeResult.data.eventType;
  const payloadSchema = cmtIntegrationPayloadSchemas[eventType as CmtIntegrationEventType];
  if (!payloadSchema) {
    return {
      success: false,
      issues: [{
        code: "custom",
        path: ["eventType"],
        message: `Unsupported CMT integration event type: ${eventType}`,
      }],
    };
  }

  const payloadResult = payloadSchema.safeParse(envelopeResult.data.payload);
  if (!payloadResult.success) {
    return { success: false, issues: payloadResult.error.issues.map((issue) => ({ ...issue, path: ["payload", ...issue.path] })) };
  }

  return {
    success: true,
    data: {
      ...envelopeResult.data,
      eventType: eventType as CmtIntegrationEventType,
      payload: payloadResult.data,
    } as CmtIntegrationEvent,
  };
}
