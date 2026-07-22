# CMTCommand Integration Identifiers And States

## Stable Identifiers

| Identifier | Owner | Stability rule |
| --- | --- | --- |
| `organizationId` | Operational server | Server-derived authorization scope; never trusted from browser state alone. |
| `officeId` | Operational server | Server-derived office scope; cross-office use requires explicit existing policy. |
| `projectId` | Dispatch/operational records | Stable for the project lifecycle. |
| `workOrderId` | Dispatch/operational records | Stable operational aggregate id. |
| `assignmentId` | Dispatch/operational records | Stable field-handoff aggregate id. |
| `fieldVisitId` | Field app/server | Generated before offline work begins and retained after acknowledgment. |
| `testSetId` | Field app/server | Identifies the concrete sample or test set. |
| `specimenId` | Field app/server/lab | Identifies one physical cylinder only. |
| `specimenLabel` | Field app/server/lab | Human label unique within a test set. |
| `eventId` | Producer | Generated once; exact reuse means duplicate delivery. |
| `idempotencyKey` | Producer | Stable per submitted action; conflicting reuse is rejected. |
| `correlationId` | Producer/workflow | Connects related events across systems. |

## Revision Rules

- Revisions are positive integers on the aggregate affected by the event.
- The server rejects stale revisions instead of silently overwriting current state.
- Repeated delivery with the same event id and idempotency key is acknowledged as duplicate.
- Reuse of an idempotency key for a different event is rejected as an idempotency conflict.
- Approved lab results are not revised in place. Amendments append a new event and retain the original approved evidence.

## Work Order State Model

```text
created
  -> assignment-published
  -> field-accepted
  -> field-in-progress
  -> field-completed
  -> specimens-in-custody
  -> lab-received
  -> break-scheduled
  -> result-recorded
  -> result-reviewed
  -> result-approved
  -> amended-result-present
  -> closed
```

Operational projections may aggregate several specimen states, but the event history must retain each specimen-level transition.

## Specimen Custody And Break State

```text
field-created
  -> transferred-to-lab
  -> received-by-lab
  -> scheduled-for-break
  -> broken
  -> reviewed
  -> approved
  -> amended
```

`SpecimenReceivedByLab` is invalid before `SpecimenCustodyTransferred`. `BreakScheduled` is invalid before lab receipt. `BreakResultRecorded` is invalid before a matching schedule. A received, scheduled, or tested specimen cannot move back to an earlier custody state.

## Destructive Testing Rules

- `SpecimenCreated` represents exactly one physical specimen.
- `specimenCount` is intentionally not part of a specimen event.
- A specimen may have only one planned destructive break assignment.
- A specimen may produce no more than one original destructive `BreakResultRecorded`.
- A 7-day result and a 28-day result must reference different specimen IDs.
- Lab review, approval, and amendment reference the individual result event and do not overwrite it.
- `AgeGroupAverageDerived` is allowed only from explicitly listed individual result event IDs at the same test-set and age.

## Approved Result Amendment Rules

- Approval freezes the result value, dimensions, maximum load, compressive strength, fracture type, test method, testing machine, calibration evidence, reviewer, approver, and approval timestamp.
- A correction after approval uses `LabResultAmended` with `supersedesEventId`, amendment reason, corrected fields, actor, and revision.
- The prior approved result remains queryable.
- Dispatch may display amended status but cannot edit corrected technical values.
