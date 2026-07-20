# CMTCommand Integration Architecture

## Scope

This document defines the v1 integration contract between CMTCommand Operational vNext, a future technician field app, and a concrete laboratory system. The operational source branch is `phase-5-tenancy-foundation`; the corrected contract lives on top of that branch under `contracts/cmtcommand-integration/v1/` and is consumed by `apps/operational/src/server/integration/cmt-events.ts`.

The earlier contract commit `aff51bbedd88c9eb9abbb08774c7926b344e63c7` was source material only. It used `tenantId`/`branchId` and treated one specimen as four cylinders, so this version deliberately corrects those conflicts with the operational model and concrete-testing reality.

## Source Of Truth Boundaries

- CMTCommand Operational owns projects, work orders, dispatch assignments, readiness/operational status projections, and notifications.
- The future field app owns unsynchronized device capture until server acknowledgment. After acknowledgment, server events and revisions are canonical.
- The laboratory system owns specimen receipt, break scheduling, raw compression measurements, review, approval, and amendments.
- Dashboards may derive status from accepted events, but they cannot create, edit, approve, or amend laboratory-owned technical results.
- No system directly edits another system database through this contract.

## Contract Package

- Event envelope schema: `contracts/cmtcommand-integration/v1/schemas/event-envelope.schema.json`
- Event payload schema bundle: `contracts/cmtcommand-integration/v1/schemas/events.schema.json`
- OpenAPI command/query contract: `contracts/cmtcommand-integration/v1/openapi.json`
- Deterministic validator and simulator: `contracts/cmtcommand-integration/v1/simulator.mjs`
- End-to-end fixture: `contracts/cmtcommand-integration/v1/fixtures/e2e-concrete-lab-cycle.json`
- Failure fixtures: `contracts/cmtcommand-integration/v1/fixtures/failure-cases.json`
- Operational Zod adapter: `apps/operational/src/server/integration/cmt-events.ts`

## Identifier Decision

The canonical isolation vocabulary is `organizationId` and `officeId`, matching the operational database, membership, RBAC, dispatch, audit, and media foundations. The contract intentionally omits `tenantId` and `branchId`; adapters that receive those names from an external system must translate at a documented boundary before producing v1 events.

Client-supplied organization, office, actor, and role fields are evidence fields, not authorization proof. A real event-intake route must derive authorization from the authenticated server context and then verify the envelope scope against that context.

## Event Envelope

Every event uses the same required envelope:

| Field | Required | Notes |
| --- | --- | --- |
| `eventId` | yes | UUID generated once for the event. |
| `schemaVersion` | yes | `cmtcommand.integration.event.v1`. |
| `eventType` | yes | One of the canonical event types in the schema. |
| `sourceSystem` | yes | Originating bounded context. |
| `organizationId` | yes | Operational organization boundary. |
| `officeId` | yes | Operational office boundary. |
| `occurredAt` | yes | UTC time the business action occurred. |
| `producedAt` | yes | UTC time the event was produced for sync. |
| `serverReceivedAt` | server | UTC server intake time on accepted records and feeds. |
| `correlationId` | yes | Stable workflow correlation id. |
| `workOrderId` | yes | Work order aggregate id. |
| `projectId` | optional | Included when known. |
| `assignmentId` | optional | Included for assignment and field visit events. |
| `fieldVisitId` | optional | Included for field visit and field observation events. |
| `testSetId` | optional | Included for concrete sample/test-set events. |
| `specimenId` | optional | Included for specimen-level events. |
| `actorId` | yes | Actor or service-principal id as recorded evidence. |
| `actorRole` | yes | Role at the time of action as recorded evidence. |
| `revision` | yes | Optimistic concurrency version for the affected aggregate. |
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
- `AgeGroupAverageDerived`
- `LabResultReviewed`
- `LabResultApproved`
- `LabResultAmended`
- `NonconformanceRaised`
- `OperationalStatusChanged`
- `WorkOrderClosed`

## Concrete Specimen Rule

A `testSetId` identifies the concrete sample/test set. A `specimenId` identifies exactly one physical cylinder. `SpecimenCreated` represents exactly one physical specimen and has no `specimenCount` field. If four cylinders are made, four `SpecimenCreated` events must exist, each with its own `specimenId` and `specimenLabel`.

A destructive compression break consumes the specimen. A specimen may have one planned destructive break assignment and no more than one original destructive `BreakResultRecorded` event. The 7-day and 28-day results must reference different specimen IDs.

Pair testing preserves each cylinder's raw measured dimensions, area, maximum load, strength, fracture type, technician, machine, calibration, and test time. Any age-group average is derived by an `AgeGroupAverageDerived` event that explicitly names the individual `BreakResultRecorded` event IDs.

## Sync Behavior

Field sync uses a durable local outbox and stable idempotency keys. Clients retry the same event safely after network failures. Server intake acknowledges exact duplicate deliveries, rejects idempotency-key conflicts, rejects stale revisions, and refuses out-of-order custody or lab-result transitions. Cursor feeds return accepted events after a stable cursor.

Binary attachment storage is deferred. v1 carries evidence and attachment metadata only.

## Advisory Limits

Configured limits and nonconformance events may raise operational flags. They do not automate engineering acceptance, rejection, certification, professional sign-off, or external submission. AI or inferred claims remain advisory and must not impersonate a reviewer or approver.
