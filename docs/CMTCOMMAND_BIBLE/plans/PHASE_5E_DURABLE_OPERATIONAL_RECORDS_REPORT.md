# Phase 5E Durable Projects, Work Orders, Technicians, And Dispatch Assignments Report

## Status

- Implementation status: Acceptance-complete for the bounded local/test Phase
  5E persistence, authorization, and tenant-isolation scope described here.
- Database verification: Passed against an isolated localhost-only PostgreSQL
  16 runtime using the repository test-database safety contract.
- Product workflow status: Not implemented; no Phase 5E route or UI is exposed.
- Date: 2026-07-16

## Corrected Preflight

Work began only after the Phase 5E preflight confirmed:

- Repository root: `C:/Users/Surface i7/Documents/CMT Command Center`.
- Branch: `phase-5-tenancy-foundation`.
- Starting HEAD: `dc2cce7d70a7471b0676ab31459f6275eed08234`.
- Upstream: `origin/phase-5-tenancy-foundation`.
- Checkpoint commits `ef0e3829082756a48612def37d106bf58ddb3a51` and
  `dc2cce7d70a7471b0676ab31459f6275eed08234` exist as commits.
- All non-`euchre-platform/` files were clean. The unrelated tracked and
  untracked `euchre-platform/` work remained out of scope and untouched.

No branch switch, history rewrite, staging, commit, push, pull, PR, merge,
rebase, clean, or other remote mutation was performed.

## Implemented Boundary

Phase 5E adds four durable organization/office-owned record types:

| Record | Durable purpose | Identifiers and key relationships |
| --- | --- | --- |
| Project | Project context for scheduled work. | Internal UUID; normalized source system and source project ID; separate human project number. |
| Technician | Minimal operational technician roster. | Internal UUID; normalized source system and source technician ID; display name and optional business contact fields. |
| Work order | Scheduled service work. | Internal UUID; normalized source system and source work-order ID; separate human work-order number; same-office project; service-type text; job-site name; valid schedule interval. |
| Dispatch assignment | Current technician-to-work-order assignment. | Internal UUID; normalized source system and source assignment ID; same-office work order and technician; valid assignment interval; creating/updating user IDs. |

Source uniqueness is organization-wide on source system plus the record-specific
source ID. The same source identifier may therefore exist in separate
organizations. Internal UUIDs, source identifiers, and human numbers are not
interchangeable.

Database constraints enforce required organization/office ownership,
same-organization/same-office relationships, restrictive parent deletion,
normalized source-system syntax, genuine non-whitespace required fields, and
end-after-start intervals. The generated Phase 5E migrations are:

- `apps/operational/drizzle/0003_vengeful_vapor.sql`, which adds the four tables,
  relationships, indexes, and initial checks.
- `apps/operational/drizzle/0004_right_reavers.sql`, which replaces the initial
  ordinary-space-only nonblank checks with checks that also reject tabs,
  newlines, and other whitespace-only direct database writes.

## Authorization And Services

`apps/operational/src/server/operational-records/` provides validated create,
list, and find services. Organization scope comes only from the server-derived
authorization context. Reads apply organization and office predicates; an empty
restricted office scope returns no records; inaccessible and nonexistent
lookups share one public result.

Create services check the central permission policy, lock the owning
organization, then revalidate the current user, organization, membership, role,
and office access inside the transaction. That shared lock serializes creation
with the existing membership and office-access mutation path, so a concurrent
revocation is ordered before or after the write rather than racing between the
authorization check and insert. Expected relationship foreign-key failures map
to a non-leaking result; unexpected foreign-key failures remain persistence
errors.

The Phase 5E role matrix is:

- Organization admin and operations manager: read/manage all four record types.
- Dispatcher: read all four and manage dispatch assignments only.
- Technical reviewer and viewer: read all four; no Phase 5E writes.
- Field technician: no Phase 5E operational-record permission.

Successful creates return actor-attributed mutation metadata. It is transient
metadata for a future audit sink, not persisted general audit history.

## Explicit Exclusions

This phase does not add:

- Operational-record routes, Server Actions, or product workflow UI.
- Update/delete service operations or external import/writeback behavior.
- A durable Service Type catalog; work orders contain validated service-type
  text only, so Field Operations prerequisite P2 remains partial.
- Readiness, coverage, Decision Log, operational-impact, availability,
  certification, clearance, equipment, calibration, or service-requirement
  records.
- A user-to-technician identity mapping or field-technician own-assignment
  access.
- Persistent general audit events, production authentication, RLS, deployment,
  backup, or monitoring changes.

## Verification Evidence

The final local evidence was:

- `npm.cmd run verify`: passed lint, typecheck, 12 unit-test files / 110 tests,
  and the Next.js production build.
- Focused Phase 5E PostgreSQL integration suite: 17/17 passed, including direct
  database CHECK failures and deterministic concurrent revocation ordering.
- `npm.cmd run verify:db`: passed test migration plus 3 integration files / 44
  tests against the isolated test database.
- `npx.cmd drizzle-kit check`: migration metadata passed.
- Repeated migration application completed safely; the live catalog contained
  five Drizzle migration records and exactly ten public application tables.

The separate Playwright command exercised all six existing shell scenarios,
including the 390px case, but its wrapper did not exit before the 180-second
timeout. That command is not claimed as passed and Phase 5E adds no browser
surface. `node scripts\verify-root.mjs` passed. Relative Markdown validation
checked 154 links across 36 Bible/operational Markdown files with no broken
links. Scoped `git diff --check`, untracked-source whitespace checks, conflict/
debug/disabled-test scans, and high-risk secret-pattern scans passed.

## Migration And Recovery

Both Phase 5E migrations are forward-only repository migrations. No production
database was contacted. `0004` deliberately drops and recreates only the new
Phase 5E nonblank CHECK constraints; it does not delete or rewrite application
rows.

Production rollback or recovery is not invented here. Before deployment, the
operator must use the approved database backup/restore and release rollback
procedure, verify migration compatibility with the prior application version,
and rehearse recovery against production-like infrastructure. No down migration
or destructive recovery command was executed during this task.

## Assumptions And Caveats

- Every Phase 5E record requires one office so PostgreSQL composite foreign keys
  can enforce the complete relationship boundary. Organization-wide projects
  require a separately approved data-model change.
- Source identity is unique per organization rather than per office.
- Service Type remains scalar text, not an implied durable entity.
- The implementation is a bounded persistence and service foundation, not the
  complete Pilot V1 or Field Operations workflow.
