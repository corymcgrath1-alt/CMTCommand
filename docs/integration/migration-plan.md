# CMTCommand Operational Integration Migration Plan

## Current State

Operational vNext already has authenticated local/test identity, organization and office scoping, durable dispatch assignments, append-only assignment events, general audit events, and local/test private media primitives. This task adds a corrected shared integration contract and an operational Zod adapter. It does not create production event persistence or live system synchronization.

## Implemented In This Phase

1. Canonical v1 event envelope and event-payload schemas.
2. Corrected organization/office identifier vocabulary.
3. Corrected concrete specimen identity rules.
4. Contract fixtures and simulator coverage for happy path and negative cases.
5. Operational TypeScript/Zod adapter that consumes the canonical schema.
6. Contract verification included in Operational vNext verification and CI paths.

## Deferred Production Work

1. Build authenticated `POST /v1/events` intake inside Operational vNext.
2. Persist accepted events, idempotency records, rejection records, and server receipt timestamps durably.
3. Add cursor-based change feeds backed by the production database.
4. Build read models for operational status, specimen traceability, lab-result status, and age-group averages.
5. Implement outbox synchronization in the actual field app.
6. Integrate the lab system through lab-owned event writers for receipt, scheduling, results, review, approval, and amendments.
7. Add binary attachment storage only after production storage, malware scanning, retention, legal-hold, and access-control policy are approved.
8. Complete production identity provider, deployment, monitoring, backup/restore, and incident-response gates before customer use.

## Rollback

The v1 contract is additive documentation, fixtures, schemas, simulator code, and an operational validation module. If it must be removed, revert the isolated `contracts/cmtcommand-integration/v1/`, `docs/integration/`, the operational integration module/test, package-script updates, and Bible references. No production data migration is affected because production event persistence is not implemented.

## Compatibility Contract

Field and lab implementations must consume this shared contract. A separate field-side event dialect would break idempotency, cursor feeds, chain-of-custody traceability, and lab result auditability.
