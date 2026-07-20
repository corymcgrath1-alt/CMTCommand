# CMTCommand Integration Contract v1

This folder contains the shared event contract for dispatch/readiness, the technician field app, and concrete laboratory results.

## Files

- `openapi.json`: command/query API contract.
- `schemas/event-envelope.schema.json`: required event envelope.
- `schemas/events.schema.json`: event-specific schema bundle.
- `fixtures/e2e-concrete-lab-cycle.json`: happy-path fixture from assignment through 28-day approved result and notification.
- `fixtures/failure-cases.json`: duplicate, stale revision, out-of-order custody, missing calibration, amendment, and network outage fixtures.
- `simulator.mjs`: dependency-free contract validator and deterministic state simulator.
- `tests/contract-simulator.test.mjs`: Node test coverage for the schemas, fixtures, simulator, idempotency, custody ordering, revision handling, and lab result ownership.

## Run

```powershell
node contracts\cmtcommand-integration\v1\tests\contract-simulator.test.mjs
node contracts\cmtcommand-integration\v1\simulator.mjs --fixture contracts\cmtcommand-integration\v1\fixtures\e2e-concrete-lab-cycle.json
```

The field app must consume this contract rather than define a separate envelope or event type list.
