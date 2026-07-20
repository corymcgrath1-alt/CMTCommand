# CMTCommand Static Demo To Production Service Migration Plan

## Current State

The root CMTCommand app is a static HTML/CSS/JavaScript demo with no backend, login, package-managed build, database, schema migration, deployment workflow, or production event intake. This task does not convert the demo into a backend.

## Migration Steps

1. Keep the static demo as the founder-facing prototype and contract reader.
2. Create a production service outside the static root that imports the v1 schemas without changing event names or envelope fields.
3. Add authenticated tenant and branch context at the service boundary.
4. Implement idempotent `POST /v1/events` intake with durable event storage, server receipt time, duplicate detection, revision checks, and dead-letter visibility.
5. Implement cursor-based change feeds for assignments, field acknowledgments, custody, lab status, and operational status.
6. Implement read models for dispatch status, specimen traceability, and lab result status from accepted events.
7. Integrate the field app by generating or sharing contract types from `contracts/cmtcommand-integration/v1/schemas/events.schema.json`.
8. Integrate the lab system through lab-owned event writers for receipt, break scheduling, result recording, review, approval, and amendment.
9. Add binary attachment storage only in a later version with explicit storage policy, scanning, retention, and access control. v1 remains metadata-only.
10. Keep approved-result amendments append-only and verify dispatch cannot mutate approved technical values.

## Rollback

The v1 contract is additive documentation, fixtures, schemas, and simulator code. If it needs to be removed from the static demo repository, revert the isolated `contracts/cmtcommand-integration/v1/` and `docs/integration/` files plus the contract simulator test. No root demo state or production data migration is affected.

## Compatibility Contract

Field and lab implementations must consume this shared contract. A separate field-side event dialect would break idempotency, cursor feeds, chain-of-custody traceability, and lab result auditability.
