# ADR-008 Dispatch Assignments Are The Field Operations Handoff

## Document Status

- Status: Accepted for Phase 5E-B
- Date: 2026-07-16
- Extends: [ADR-004 Tenancy Authorization And Audit Model](ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md)
- Primary Evidence:
  - `apps/operational/src/server/dispatch/`
  - `apps/operational/src/server/db/schema/dispatch-assignments.ts`
  - `apps/operational/src/server/db/schema/assignment-technicians.ts`
  - `apps/operational/src/server/db/schema/assignment-events.ts`
  - `apps/operational/tests/integration/dispatch-workflow.integration.test.ts`

## Decision

Dispatch assignments and append-only assignment events are the durable
operational handoff into future Field Operations.

A future field session may begin only from an authorized durable assignment. It
must not reconstruct assignment ownership from browser state, transient UI
selection, work-order text, or a technician profile alone.

## Durable Handoff Model

- Work orders reference an organization-owned durable service type and retain a
  display snapshot for historical context.
- Technicians are operational records and may exist without application logins.
  An optional organization-membership link enables server-verified
  own-assignment access; it does not derive application permissions.
- Technician office eligibility controls where a technician may be dispatched.
  It is independent of the linked user's authorized office scope.
- Each assignment has at most one active primary technician and may have zero or
  more active support technicians. Ended relationships preserve reassignment
  history.
- Assignment and work-order lifecycles are centralized domain policies. A
  successful mutation increments an optimistic version, reconciles related
  state, and appends an assignment event in one transaction.
- Assignment events are database-protected against update and delete. They are
  domain history, not the future general security audit-event platform.

## Conflict Policy

Schedule conflicts use half-open intervals, so adjacent assignments do not
overlap. Active technician relationships on non-cancelled assignments are
considered, and the assignment being changed is ignored. Conflicts block by
default. An override requires the central override permission, a nontrivial
reason, actor attribution, and an append-only `conflict_overridden` event.

Conflict responses follow the actor's tenant and office authorization. A
conflict outside that scope may block a mutation without disclosing the other
assignment's identity.

## Field Operations Consequence

Phase 5E-B closes the durable-record portion of Field Operations prerequisite
P2: Project, Work Order, Assignment, Service Type, and Technician records now
have tenant/office ownership and verified operational relationships. It also
provides own-assignment read and acknowledgment behavior.

This decision does not implement Field Operations FR-1. Production identity,
general append-only audit persistence, private object storage, and approved
report/retention requirements remain prerequisite gates. Field sessions,
evidence, reports, media, extraction, samples, and integrations remain absent.

## Consequences

Positive:

- Dispatch state survives refresh and process restart.
- Reassignment does not erase the prior primary relationship.
- Field-technician access is tied to both current authenticated membership and a
  linked technician relationship.
- Future field records have one durable assignment and event stream to reference.

Tradeoffs:

- Current eligibility is modeled separately from historical assignment facts.
- The application layer remains responsible for authorization; PostgreSQL RLS is
  still a later defense-in-depth decision.
- General security auditing still requires a separate append-only platform with
  its own retention and request-context policy.

## Rejected Alternatives

- Treating work-order service text as the service identity: rejected because it
  cannot enforce tenant-safe catalog ownership.
- Overwriting a technician ID directly on the assignment: rejected because it
  destroys primary/support and reassignment history.
- Using technician office eligibility as user authorization: rejected because
  dispatch qualification and application access are different controls.
- Treating assignment events as the complete audit platform: rejected because
  they cover one domain and not security denials, membership changes, or request
  context.
