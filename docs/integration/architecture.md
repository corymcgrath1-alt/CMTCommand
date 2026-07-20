# CMTCommand Integration Architecture

## Scope

This document defines the v1 integration contract between CMTCommand dispatch/readiness, the technician field app, and the concrete laboratory system. The current CMTCommand root remains a static demo. This contract work is isolated under `contracts/cmtcommand-integration/v1/` and `docs/integration/` so the demo path, TRD-104 behavior, Maria Lopez coverage, visual modes, and root verification commands remain unchanged.

## Source Of Truth Boundaries

- CMTCommand dispatch owns projects, work orders, assignments, readiness requirements, technician and equipment allocation, and operational status.
- The field app owns unsynced device observations. After server acknowledgment, server records are canonical and revisions are audited.
- The lab system owns specimen receipt, custody, testing-machine observations, break measurements, review, approval, amendments, and technical-result history.
- Dashboards and readiness views may derive status from accepted events, but they cannot mutate approved technical results.
- No system directly edits another system database.

## Contract Package

- Event envelope schema: `contracts/cmtcommand-integration/v1/schemas/event-envelope.schema.json`
- Event payload schema bundle: `contracts/cmtcommand-integration/v1/schemas/events.schema.json`
- OpenAPI command/query contract: `contracts/cmtcommand-integration/v1/openapi.json`
- Deterministic validator and simulator: `contracts/cmtcommand-integration/v1/simulator.mjs`
- End-to-end fixture: `contracts/cmtcommand-integration/v1/fixtures/e2e-concrete-lab-cycle.json`
- Failure fixtures: `contracts/cmtcommand-integration/v1/fixtures/failure-cases.json`

The field app must consume these v1 schemas and fixtures rather than define a separate envelope, event list, or payload dialect.

## Event Envelope

Every event uses the same required envelope:

| Field | Required | Notes |
| --- | --- | --- |
| `eventId` | yes | UUID generated once for the event. |
| `schemaVersion` | yes | `cmtcommand.integration.event.v1`. |
| `eventType` | yes | One of the canonical event types in the schema. |
| `sourceSystem` | yes | Originating bounded context. |
| `tenantId` | yes | Tenant boundary for authorization and query filtering. |
| `branchId` | yes | Branch boundary for operational routing. |
| `occurredAt` | yes | UTC time the business action occurred. |
| `producedAt` | yes | UTC time the event was produced for sync. |
| `correlationId` | yes | Stable workflow correlation id. |
| `workOrderId` | yes | Work order aggregate id. |
| `projectId` | optional | Included when known. |
| `assignmentId` | optional | Included for assignment and field visit events. |
| `fieldVisitId` | optional | Included for field visit and field observation events. |
| `testSetId` | optional | Included for concrete sample/test-set events. |
| `specimenId` | optional | Included for specimen-level events. |
| `actorId` | yes | Actor or service principal id. |
| `actorRole` | yes | Role at the time of action. |
| `revision` | yes | Optimistic concurrency version for the aggregate affected by the event. |
| `idempotencyKey` | yes | Stable key for safe retry. |
| `payload` | yes | Event-specific data. |
| `supersedesEventId` | optional | Required for approved-result amendments. |

## Canonical Event Types

- `WorkOrderCreated`
- `AssignmentPublished`
- `AssignmentAccepted`
- `FieldVisitStarted`
- `FieldVisitCompleted`
- `ConcreteFreshPropertiesRecorded`
- `SpecimenCreated`
- `SpecimenCustodyTransferred`
- `SpecimenReceivedByLab`
- `BreakScheduled`
- `BreakResultRecorded`
- `LabResultReviewed`
- `LabResultApproved`
- `LabResultAmended`
- `NonconformanceRaised`
- `OperationalStatusChanged`
- `WorkOrderClosed`

## Concrete Data Coverage

The v1 schema covers project/work order and placement location, supplier, truck or batch ticket, mix-design identifier, sample and test-set IDs, specimen labels, sample date and time, slump, air content and method identifier, concrete and ambient temperature, unit weight or density, yield, water added, remarks, specimen count and dimensions, curing method, pickup, custody, lab receipt timestamps and condition, break age, test date and time, measured dimensions, cross-sectional area, maximum load, compressive strength, fracture type, testing technician, testing machine ID, calibration reference and status, method/specification references, review, approval, amendment reason, and audit history.

## Command And Query Contract

The OpenAPI document defines:

- `POST /v1/events` for idempotent event intake.
- `GET /v1/events/feed` for cursor-based change feeds.
- `GET /v1/work-orders/{workOrderId}/operational-status` for dispatch/readiness status views.
- `GET /v1/specimens/{specimenId}/trace` for specimen traceability.
- `GET /v1/lab-results/{testSetId}/status` for read-only lab result status.
- `POST /v1/lab-results/{testSetId}/amendments` for lab-owned append-only amendments.

All endpoints require tenant and branch context. Implementations must enforce server-side authorization and must not trust tenant, actor, or viewer identity solely from client-supplied values.

## Sync Behavior

Field sync uses a durable local outbox and stable idempotency keys. Clients retry with capped exponential backoff and preserve local technician-entered drafts when conflicts occur. Server intake returns duplicate acknowledgments for repeated matching idempotency keys and rejects conflicting retries. Cursor feeds return accepted changes and dead-letter summaries without silently overwriting field or lab records.

Clock skew is handled by recording both `occurredAt` and `producedAt` from the event plus server receipt time. Attachments are metadata-only in v1. Binary upload, storage policy, and virus scanning are intentionally outside this contract.

## Advisory Limits

Configured limits and nonconformance events may raise operational flags. They do not automate engineering acceptance, rejection, certification, or professional sign-off. AI or inferred claims are not engineering approval and must retain evidence, confidence wording, validation status, author, and timestamp.
