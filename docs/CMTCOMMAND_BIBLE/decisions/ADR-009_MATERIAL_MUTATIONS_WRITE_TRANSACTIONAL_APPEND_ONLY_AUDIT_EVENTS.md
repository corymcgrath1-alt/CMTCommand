# ADR-009 Material Mutations Write Transactional Append-Only Audit Events

## Document Status

- Status: Accepted for Phase 5F local/test scope
- Date: 2026-07-16
- Extends: [ADR-004 Tenancy Authorization And Audit Model](ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md)
- Complements: [ADR-008 Dispatch Assignments Are The Field Operations Handoff](ADR-008_DISPATCH_ASSIGNMENTS_ARE_THE_FIELD_OPERATIONS_HANDOFF.md)
- Primary evidence:
  - `apps/operational/src/server/audit/`
  - `apps/operational/src/server/db/schema/audit-events.ts`
  - `apps/operational/drizzle/0008_fast_rage.sql`
  - `apps/operational/drizzle/0009_audit_append_only_guards.sql`
  - `apps/operational/tests/integration/operational-records.integration.test.ts`
  - `apps/operational/tests/e2e/audit.spec.ts`

## Decision

Every existing material identity, membership, office-access, project,
service-type, technician, work-order, and dispatch mutation must append a typed
general audit event. A successful source mutation and its audit event share one
PostgreSQL transaction. Assignment mutations also keep their domain event in
that transaction. If any required write fails, the transaction fails.

Audit events are append-only facts. Application code exposes insert and
authorized read operations only, while PostgreSQL rejects ordinary `UPDATE` and
`DELETE` statements through a trigger.

## Trusted Context And Scope

- Organization, actor user, actor membership, and actor-role snapshot are
  derived from the server authorization context and revalidated in the write
  transaction.
- A client cannot select the audit organization or actor.
- Event office is nullable for organization-wide actions and otherwise must
  belong to the event organization by composite foreign key.
- General audit read requires `audit.read`. Membership, authorization,
  organization, office, authentication, and system categories additionally
  require `audit.read_security`.
- Organization admins receive both permissions. Operations managers receive
  general operational history only, constrained by current office scope.
- Dispatcher, reviewer, viewer, and field-technician roles receive no general
  audit-history access.

## Event And Privacy Model

The event records category, action, outcome, primary and optional secondary
target, server request/correlation/transaction identifiers, optional safe
reason, bounded previous/resulting state, bounded metadata, and a server
timestamp. Historical actor role is a snapshot rather than a current-policy
claim.

Serializers are explicit allowlists. Audit JSON may contain operational state
needed to explain a change, but not full source rows, contact details,
credentials, cookies, tokens, transcripts, documents, media, or report content.
Validation bounds depth, field count, array count, string length, and encoded
size before insertion. PostgreSQL independently enforces object shape and byte
limits.

## History Boundaries

- Assignment events are domain history for assignment lifecycle and technician
  relationships.
- General audit events are cross-domain accountability and authorization
  history.
- Application logs diagnose runtime behavior and are not the authoritative
  audit record.
- External observability or SIEM export is deferred and must not be inferred
  from this local database foundation.

## Retention And Operations

No final legal retention period is selected. There is no ordinary user delete
capability. Legal hold, archival, controlled purge, audit-read auditing, SIEM
export, and production database-role grants remain future operational work.
Destructive test cleanup remains limited to the exact guarded loopback database
`cmtcommand_operational_test`.

## Consequences

Positive:

- Material current-state changes have durable actor and request attribution.
- Source state, assignment domain history, and general audit history cannot
  diverge through partial commits on successful service paths.
- Tenant and restricted-office readers cannot broaden scope with query filters.
- Historical state is privacy-bounded and safe for the basic audit UI.

Tradeoffs:

- Append-only data needs a future approved retention, archival, and legal-hold
  policy.
- Application-layer scope remains the primary authorization control; RLS is a
  later defense-in-depth decision.
- Denied-event capture is intentionally selective to avoid noisy or unsafe
  probing records.

## Rejected Alternatives

- Post-commit best-effort audit writes: rejected because source and audit state
  could diverge.
- Treating assignment events as the general audit platform: rejected because
  they cover only one domain and omit membership and authorization history.
- Full-row snapshots: rejected because they increase privacy and retention risk.
- Mutable audit rows: rejected because ordinary correction could erase the
  accountability record.
- Client-supplied actor, organization, or request identity: rejected because
  browser claims are untrusted.
