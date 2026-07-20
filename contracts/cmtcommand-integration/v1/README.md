# CMTCommand Integration Contract v1

This folder contains the shared event contract for operational dispatch, offline field capture, concrete specimen custody, laboratory break results, review, approval, amendments, and operational notifications.

## Files

- `openapi.json`: command/query API contract for future event intake and feeds.
- `schemas/event-envelope.schema.json`: canonical event envelope.
- `schemas/events.schema.json`: event-specific schema bundle.
- `fixtures/e2e-concrete-lab-cycle.json`: corrected happy path with four physical cylinders and distinct 7-day/28-day specimens.
- `fixtures/failure-cases.json`: duplicate, conflict, stale revision, ordering, calibration, authorization-scope, overwrite, and amendment fixtures.
- `simulator.mjs`: dependency-free contract validator and deterministic state simulator.
- `tests/contract-simulator.test.mjs`: Node coverage for schemas, fixtures, OpenAPI references, idempotency, custody ordering, specimen identity, and lab-result ownership.

## Run

```powershell
node contracts\cmtcommand-integration\v1\tests\contract-simulator.test.mjs
node contracts\cmtcommand-integration\v1\simulator.mjs --fixture contracts\cmtcommand-integration\v1\fixtures\e2e-concrete-lab-cycle.json
```

Operational vNext consumes this contract through `apps/operational/src/server/integration/cmt-events.ts`. The app must not keep a separate event-type list that can drift from `schemas/event-envelope.schema.json`.

## Scope Boundary

This contract is a verified implementation foundation. It does not implement production persistence, a production field app, live laboratory synchronization, binary attachment storage, deployment, or external-system writeback.
