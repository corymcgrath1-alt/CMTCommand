# Phase 5E Durable Operational Records And Dispatch Workflow Report

## Status

- Phase 5E-A durable-record foundation: acceptance-complete and committed.
- Phase 5E-B operational dispatch workflow: acceptance-complete for the bounded
  local/test scope documented here.
- Complete bounded Phase 5E: acceptance-complete; no Field Operations FR-1
  behavior is implemented or authorized.
- Date: 2026-07-16

## Repository Boundary

Phase 5E-B began from committed Phase 5E-A checkpoint
`24cdc0ce1268200da0e68eba927bc653720388ad` on
`phase-5-tenancy-foundation`, tracking
`origin/phase-5-tenancy-foundation`. All root CMTCommand files were clean; the
pre-existing tracked and untracked `euchre-platform/` work remained out of scope
and untouched. No staging, commit, push, branch switch, merge, rebase, reset,
clean, stash, PR, or other remote mutation was performed.

## Durable Domain

The complete bounded model now includes:

- Projects with lifecycle/versioned updates and archive without hard delete.
- Organization-owned Service Types with unique normalized keys, optional
  default office, status/version, actor attribution, and historical work-order
  compatibility after archival.
- Technicians with required home office, optional organization-membership link,
  active/inactive/on-leave status, versioned work-profile updates, and current
  office eligibility distinct from user authorization.
- Work Orders with a durable service-type reference, historical service-name
  snapshot, lifecycle/version, requested interval, priority, and transactional
  reconciliation from assignment state.
- Dispatch Assignments with operational timezone, schedule, lifecycle/version,
  actor attribution, and one work-order boundary.
- Assignment Technicians with one active primary, zero or more active supports,
  duplicate-active prevention, and preserved ended/reassignment history.
- Append-only Assignment Events for creation, scheduling, primary/support
  changes, status transitions, cancellation, and conflict override.

Assignment lifecycle is centralized as `draft -> unassigned -> assigned ->
acknowledged -> in_progress -> completed`, with documented direct
`assigned -> in_progress`, primary removal to `unassigned`, and cancellation
from nonterminal states. Terminal assignments do not silently reopen. Work-order
lifecycle is centralized as `draft -> ready_for_dispatch -> scheduled ->
in_progress -> completed`, with cancellation from nonterminal states.

Schedule overlap uses half-open intervals `[start, end)`. Adjacent intervals do
not conflict; cancelled assignments and the assignment being edited are ignored.
Conflict override is denied by default and requires explicit central permission,
a reason, actor attribution, and an append-only event. Out-of-scope conflicts may
block without disclosing another office's assignment.

## Authorization And Transaction Safety

All protected pages and APIs resolve verified identity to the current active
application user, organization membership, office scope, and centralized role
permissions. Organization admin and operations manager may manage the complete
bounded workflow and override conflicts with a reason. Dispatcher may manage
work orders and assignments but has no conflict-override permission. Technical
reviewer and viewer are read-only. A field technician may read only assignments
connected to their linked technician profile and acknowledge only their active
primary assignment.

Technician office eligibility never grants application authorization. Optional
membership linkage never derives a role or office scope from the technician
record.

Multi-record mutations lock the owning organization, revalidate the actor and
office access in the transaction, validate the expected version, update current
state, reconcile work-order state where applicable, and append the assignment
event atomically. Failed event insertion or reconciliation rolls back the
current-state change. Inaccessible and nonexistent resources share non-leaking
results.

## Protected Product Surfaces

The Operational vNext navigation now exposes bounded protected pages for:

- Projects: authorized-office search/status list, create/edit/archive, and
  work-order counts.
- Work Orders: office/project/date/priority/status/service filters, create/edit,
  ready-for-dispatch transition, cancellation with reason, and assignment count.
- Technicians: status/home office/eligibility/login-link visibility, create/edit,
  eligibility management, and schedule-conflict indication.
- Dispatch: office/date board, ready queue, unassigned assignment creation,
  primary reassignment, support changes, transition/cancellation controls,
  authorized conflict override, and stale-version recovery messaging.
- My Assignments: linked technician's project/address/service/time/instructions,
  appropriate history, and own acknowledgment only.

Thin Route Handlers under `src/app/api/` validate request shapes and delegate to
server-only services. They do not own lifecycle or tenant policy. Browser
coverage includes the operations-manager workflow, office-restricted dispatcher,
read-only viewer/reviewer, own-assignment technician, cross-tenant rejection,
persisted refresh, stale-update recovery, and 390px no-overflow behavior.

## Migrations And Catalog

Phase 5E-A migrations remain unchanged:

- `0003_vengeful_vapor.sql`
- `0004_right_reavers.sql`

Phase 5E-B adds forward-only migrations:

- `0005_chemical_eternity.sql`: generated catalog, lifecycle, relationship, and
  event structures.
- `0006_dispatch-backfill-and-history-guards.sql`: deterministic legacy
  backfill, complete composite tenant/office foreign-key guards, and the
  append-only assignment-event trigger.
- `0007_deep_smasher.sql`: generated post-backfill required-column tightening.

The generated SQL and custom guard migration were manually reviewed. No fixture
data appears in migrations. A fresh guarded migration and a repeated no-op
application succeeded against PostgreSQL 16.14. Catalog inspection confirmed the
expected tables, enums, indexes, partial unique constraints, composite keys,
foreign keys, and append-only trigger.

The deterministic seed first applies the identity fixtures and then creates
Alpha Engineering and Beta Testing service types, projects, technicians,
eligibilities, work orders, assignments, relationships, and events. Two runs
produced the same 24-row full-record fingerprint:
`11849260ee4b80032bba86f07cf10e72`.

## Verification Evidence

An isolated `postgres:16` container used exact database
`cmtcommand_operational_test`, non-production local credentials, the repository
database-identity/reset guard, and loopback-only `127.0.0.1:55432` publishing.
PostgreSQL reported version 16.14. The container was removed after verification.

Executed evidence:

- `npm test`: 13 files / 116 tests passed.
- Focused dispatch PostgreSQL suite: 9 grouped integration cases passed.
- `npm run test:integration`: 4 files / 53 tests passed.
- `npm run verify:db`: migration guard and all PostgreSQL integration tests
  passed.
- `npm run verify`: lint, typecheck, unit tests, and production build passed.
- `npm run test:e2e`: 10/10 scenarios passed, exited naturally with status 0,
  and left no listener on port 3100.
- `npm run verify:full`: lint, typecheck, unit tests, production build, and all
  Playwright scenarios passed.
- `npm run build`: production build passed.
- `npm run db:generate`: no schema changes remained to generate.
- `npx drizzle-kit check`: migration metadata passed.
- Root static verifier, relative Markdown-link validation, scoped secret scans,
  client-bundle scans, and `git diff --check` passed.

## Playwright Lifecycle Correction

The earlier six scenario bodies completed, but the Windows `npm` wrapper around
the Playwright-owned Next development server did not provide reliable child
process ownership/teardown. Direct `spawnSync` of `npm.cmd` from global setup
also failed with `EINVAL` on Windows.

The web server now invokes the Next CLI directly through Node, while global
setup launches its seed subprocess through `ComSpec` and closes its PostgreSQL
pool before the web server begins. The final 10-scenario run exited naturally
with code 0 and port 3100 was clear. No timeout was increased and no unrelated
process was killed.

## Field Operations Prerequisite Result

Phase 5E closes the bounded durable-record P2 gate: Project, Work Order,
Assignment, Service Type, and Technician records, assignment relationships,
own-assignment authorization, and append-only assignment history now exist.
[ADR-008](../decisions/ADR-008_DISPATCH_ASSIGNMENTS_ARE_THE_FIELD_OPERATIONS_HANDOFF.md)
defines this assignment/event stream as the future Field Operations handoff.

FR-1 is not authorized. Pilot-ready production identity (P1 completion), a
general append-only audit platform (P3), private object storage/upload policy
(P4), and approved report/template/retention requirements (P5) remain blocked.
No field sessions, reports, media, AI extraction, samples, laboratory workflow,
Procore, email ingestion, readiness, or coverage behavior was implemented.

## Assumptions And Open Risks

- Service-type governance, ownership changes, and organization-wide versus
  default-office policy require product operating rules before pilot import.
- Technician membership linkage is intentionally optional and one-to-one within
  an organization; provisioning/lifecycle policy remains future work.
- Conflict override is restricted to admin/operations-manager by current policy;
  dispatcher override requires a later explicit policy decision.
- Operational dates use stored IANA time zones; production source timezone and
  daylight-saving data quality still need import policy.
- General audit retention, PostgreSQL RLS, production authentication, managed
  database, backup/recovery, monitoring, and deployment remain release gates.
