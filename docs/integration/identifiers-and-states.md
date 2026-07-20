# CMTCommand Integration Identifiers And States

## Stable Identifiers

| Identifier | Format | Owner | Stability rule |
| --- | --- | --- | --- |
| `tenantId` | String | Platform | Never inferred from client-only UI state. |
| `branchId` | String | Dispatch | Required for operational routing. |
| `projectId` | String | Dispatch | Stable for the project lifecycle. |
| `workOrderId` | String | Dispatch | Stable operational aggregate id. |
| `assignmentId` | String | Dispatch | Stable assignment aggregate id. |
| `fieldVisitId` | String | Field app/server | Generated before offline work begins and retained after ack. |
| `testSetId` | String | Field app/server | Stable concrete sample/test set id. |
| `specimenId` | String | Field app/server | Stable specimen id. |
| `eventId` | UUID | Producer | Generated once. Reuse indicates duplicate delivery. |
| `idempotencyKey` | String | Producer | Stable per submitted action. Required for safe retry. |
| `correlationId` | String | Producer/workflow | Connects related events across systems. |

## Revision Rules

- Revisions are positive integers on the aggregate affected by the event.
- The server rejects stale revisions instead of silently overwriting current state.
- Repeated delivery with the same event id and idempotency key is acknowledged as duplicate.
- Reuse of an idempotency key for a different event is rejected as an idempotency conflict.
- Approved lab results are not revised in place. Amendments append a new event and retain the original approved value.

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

Operational status may skip display labels or aggregate several specimen states, but the event history must retain each transition.

## Chain Of Custody State Model

```text
field-created
  -> field-cured
  -> transferred-to-courier-or-lab
  -> received-by-lab
  -> stored-for-break
  -> scheduled-for-break
  -> broken
  -> reviewed
  -> approved
  -> amended
```

`SpecimenReceivedByLab` is invalid before `SpecimenCustodyTransferred`. A received specimen cannot return to an earlier custody state. Lost, damaged, or condition exceptions are represented by custody payload condition fields and optional `NonconformanceRaised` events.

## Approved Result Amendment Rules

- Approval freezes the result value, dimensions, maximum load, compressive strength, fracture type, test method, testing machine, calibration reference, reviewer, approver, and approval timestamp.
- A correction after approval uses `LabResultAmended` with `supersedesEventId`, amendment reason, corrected fields, actor, and revision.
- The prior approved result remains queryable in audit history.
- Dispatch may display an amended-result status but cannot edit the corrected technical values.
