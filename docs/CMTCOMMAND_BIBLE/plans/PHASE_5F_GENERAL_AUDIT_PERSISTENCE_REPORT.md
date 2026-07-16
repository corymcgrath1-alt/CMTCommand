# Phase 5F General Audit Persistence Report

## Executive Result

Phase 5F is acceptance-complete for the bounded local/test scope. Existing
material Phase 5D identity/RBAC and Phase 5E operational mutations now write
typed general audit events transactionally. PostgreSQL rejects audit update and
delete. Authorized reads are organization- and office-scoped, security history
has a stronger permission, and the protected API/UI passed PostgreSQL and
browser acceptance.

This result is not production authorization. Production identity, database-role
grants, retention/archive/legal-hold/purge operations, private storage,
reporting requirements, and deployment remain unresolved.

## Repository State

- Root: `C:/Users/Surface i7/Documents/CMT Command Center`
- Branch: `phase-5-tenancy-foundation`
- Starting and current HEAD: `064e339aec9d341ebc778b2ed06f447e6d815cfe`
- Upstream: `origin/phase-5-tenancy-foundation`
- Initial CMTCommand worktree: clean
- Initial unrelated work: 12 tracked and 20 untracked paths under
  `euchre-platform/` only
- Unrelated work preserved: yes; no `euchre-platform/` file was read for task
  implementation, edited, staged, reverted, formatted, stashed, or cleaned
- Git mutations: none; no stage, commit, push, branch switch, merge, rebase,
  reset, clean, stash, tag, or remote mutation

## Audit Domain Model

`audit_events` has 21 columns: UUID identity; organization and nullable office;
actor user, nullable actor membership, and historical role; category, action,
outcome; primary and optional paired secondary target; request, correlation,
and transaction UUIDs; optional reason, previous state, resulting state, and
metadata; and millisecond server timestamp.

PostgreSQL catalog inspection confirmed four audit enums, four foreign keys,
five checks, the primary key, seven query indexes plus the primary-key index,
and one statement trigger covering update and delete. Composite foreign keys
enforce office/organization and actor membership/organization/user identity.
State JSON is limited to 4,096 bytes and metadata to 8,192 bytes. The server
adds depth, collection, string, safe-key, and prohibited-field validation.

Migration `0008_fast_rage.sql` creates the enums, table, constraints, and
indexes. Custom migration `0009_audit_append_only_guards.sql` creates
`prevent_audit_event_mutation()` and the SQLSTATE 55000 trigger. The supporting
`organization_memberships(id, organization_id, user_id)` unique constraint
enables the composite actor foreign key.

## Taxonomy

Categories are authentication, membership, authorization, organization,
office, project, service type, technician, work order, dispatch assignment, and
system. Outcomes are succeeded, denied, and failed. Targets cover organization,
office, user, membership, project, service type, technician, technician office
eligibility, work order, dispatch assignment, and assignment technician.

Typed actions cover membership preparation/role/status/suspension/revocation/
office policy, office assignment/removal, project/service-type/technician/work-
order lifecycle, technician membership and eligibility, complete dispatch
assignment scheduling/relationship/lifecycle/conflict behavior, and selected
membership, cross-office, own-assignment, and conflict-override denials.

## Transactional Integration

The following existing mutation families write general audit events in the
same transaction as successful source changes:

- Membership preparation, role change, status/suspension/revocation, office
  policy, office assignment, and office removal.
- Project create/update/status/archive.
- Service-type create/update/status.
- Technician create/update/status, membership link/unlink, and office
  eligibility add/remove.
- Work-order create/update/status/cancel, assignment-driven scheduling, and
  assignment-driven reconciliation.
- Dispatch assignment create, schedule change, primary assign/reassign/remove,
  support add/remove, acknowledge, start, complete, cancel, cascading
  work-order cancellation, and conflict override.

Assignment changes keep assignment-domain events and general events in the same
transaction. Related work-order and assignment events share one server request,
correlation, and transaction context. Returned mutation metadata identifies the
committed audit row rather than generating a post-commit identifier.

Selected denials are written in a separate safe transaction only after the
request has been denied. Same-organization cross-office denial capture first
verifies the target within the actor organization and never authorizes or
discloses the record.

## Authorization And Privacy

- Organization admin: `audit.read` and `audit.read_security`.
- Operations manager: `audit.read` for operational categories in current office
  scope.
- Dispatcher, technical reviewer, viewer, and field technician: no general
  audit-history access.

The server always derives organization, actor, membership, role, and office
scope. Filters cannot choose another organization or widen restricted offices.
Security categories are omitted from ordinary manager reads and explicit
security filters are forbidden without the stronger permission.

Explicit serializers retain material status, version, schedule, relationship,
and safe identifier facts. They exclude full rows, work email/phone/address,
credentials, cookies, tokens, transcripts, documents, media, and report
contents. Unsafe legacy/direct metadata is suppressed on output as defense in
depth.

No final legal retention duration is claimed. There is no ordinary user delete.
Legal hold, archive, controlled purge, privacy-request handling, audit-read
auditing, and external SIEM remain deferred.

## API And User Experience

- `GET /api/audit`: protected, Node runtime, no-store, bounded filters, safe
  result mapping, and `X-Request-ID`.
- `/app/audit`: permission-gated responsive Server Component with date,
  category, action, outcome, office, actor, target type/ID, request, and
  correlation filters; stable older-event pagination; office timezone display;
  safe previous/resulting state; empty/error/access-denied states.
- Navigation shows Audit only to roles with `audit.read`.

Default query window is 30 days, maximum explicit range is 90 days, default page
size is 25, maximum is 100, and the cursor is `(occurred_at, id)`.

## Database And Migration Evidence

An isolated `postgres:16` container was bound only to
`127.0.0.1:55432`. Before migration or cleanup, the live connection reported
database `cmtcommand_operational_test`, user `cmtcommand_test`, server address
`172.17.0.2/32`, server port 5432, and PostgreSQL 16.14. Credentials were
non-production shell values and were not written to repository files.

The first generated `0008` attempt rolled back because Drizzle emitted the
composite actor foreign key before its supporting unique constraint. The new
migration was corrected to create the unique constraint first. Migration then
passed twice; the second run was a safe no-op. The Drizzle ledger contained 10
applied migrations (`0000` through `0009`). Catalog inspection confirmed 15
tables and the audit enums, constraints, indexes, and trigger described above.

Deterministic Alpha Engineering/Beta Testing identity and dispatch fixtures were
seeded by the Playwright setup after guarded cleanup. General audit fixture rows
were produced through real service/API mutations rather than migrations.

## Verification

Executed successfully against the Phase 5F worktree:

- Docker Client 29.6.1 and Server 29.6.1; PostgreSQL 16.14 identity query.
- Repeated `npm run db:migrate:test`: exit 0 twice.
- Focused audit/permission unit tests: 2 files, 39 tests.
- Focused operational-record and dispatch PostgreSQL tests: current files total
  49 tests; targeted reruns passed.
- `npm run verify:db`: 4 integration files, 76 tests.
- `npm run verify`: lint, typecheck, 14 unit files / 135 tests, production build.
- `npm run test:e2e`: 15/15; natural exit; no port-3100 listener.
- `npm run verify:full`: 14 unit files / 135 tests, production build, 15/15
  Playwright; natural exit; no port-3100 listener.
- `npm run db:generate`: 15-table schema, no changes remaining.
- `npx drizzle-kit check`: passed.
- `node scripts\\verify-root.mjs`: root syntax and static-demo tests passed.
- PostgreSQL catalog and trigger inspection: passed.
- Relative Markdown-link validation: 40 files passed.
- Phase 5F local-credential scan, credential-shaped secret scan,
  server-value client-bundle scan, and debug/disabled-test scan: passed.

- Scoped `git diff --check`: passed. Final status inspection confirmed only the
  Phase 5F CMTCommand set plus the pre-existing unrelated `euchre-platform/`
  work; nothing is staged.

## Acceptance Scenario

| Step | Result | Evidence |
| --- | --- | --- |
| 1. Alpha admin signs in | Complete | Playwright development-session flow |
| 2. Admin prepares membership | Complete | Audit browser scenario |
| 3. Membership event persists | Complete | Browser/API plus PostgreSQL |
| 4. Admin assigns office access | Complete | Prepared restricted membership fixture |
| 5. Office-access event persists | Complete | Browser/API event assertion |
| 6. Manager creates project | Complete | Protected API/browser |
| 7. Project event is atomic | Complete | PostgreSQL source/event identity assertion |
| 8. Manager creates work order | Complete | Existing dispatch workflow |
| 9. Work-order event persists | Complete | PostgreSQL integration/full browser flow |
| 10. Dispatcher creates assignment | Complete | Existing dispatch browser workflow |
| 11. Domain/general assignment events exist | Complete | PostgreSQL dual-history assertion |
| 12. Dispatcher assigns primary | Complete | Existing dispatch browser workflow |
| 13. Assignment event records actor/technician | Complete | PostgreSQL reassignment state assertion |
| 14. Technician acknowledges | Complete | Existing own-assignment browser workflow |
| 15. Acknowledgment records technician actor | Complete | PostgreSQL actor/membership assertion |
| 16. Unauthorized override denied | Complete | Dispatcher conflict test |
| 17. Manager override requires reason | Complete | Validation/conflict test |
| 18. Override event has safe reason | Complete | General audit reason assertion |
| 19. Stale mutation creates no success event | Complete | PostgreSQL stale project assertion |
| 20. Failed audit rolls back source mutation | Complete | Controlled transaction test |
| 21. Audit update rejected | Complete | SQLSTATE 55000 test |
| 22. Audit delete rejected | Complete | SQLSTATE 55000 test |
| 23. Alpha cannot read Beta | Complete | PostgreSQL and browser/API isolation |
| 24. Restricted manager sees one office | Complete | PostgreSQL and browser/API isolation |
| 25. Dispatcher cannot open audit page | Complete | Browser access-denied scenario |
| 26. Filters work | Complete | Unit, PostgreSQL, and browser filters |
| 27. Pagination stable | Complete | PostgreSQL two-part cursor test |
| 28. Refresh preserves history | Complete | Browser reload assertion |
| 29. Mobile has no overflow | Complete | 390px browser assertion |
| 30. Membership/dispatch workflows pass | Complete | Full 15-scenario Playwright suite |
| 31. Root static demo unchanged | Complete | Root verifier and root diff scope |
| 32. No deferred capability represented | Complete | Feature/docs review and scoped scans |

## Defects Found And Corrected

1. **Generated migration order**: the actor composite foreign key preceded its
   supporting unique constraint, so PostgreSQL rejected `0008`. The constraint
   now precedes the foreign key; repeated migration and catalog tests regress it.
2. **Assignment-create reconciliation**: the work-order scheduling update did
   not verify that a row was returned. A controlled zero-row update could commit
   an assignment without scheduling its work order. The service now throws and
   rolls back; a trigger-based regression proves no source, domain, or audit
   partial write.
3. **Work-order cancellation ordering**: subordinate assignments could be
   cancelled before a guarded work-order update returned no row, allowing a
   partial commit on a stale result. The guarded work-order update now happens
   first; a controlled zero-row regression proves assignment/history/audit state
   remains unchanged.
4. **Audit target filter UI**: Target ID was exposed without Target Type even
   though the safe query contract requires the pair. The page now exposes both,
   with browser filter-persistence coverage.
5. **Restricted-manager acceptance fixture**: the deterministic operations
   manager used all-office access, so it could not prove restricted audit
   visibility. It is now restricted to Alexandria; all prior manager workflows
   continue to pass.
6. **Organization-wide operational history**: the first restricted-scope query
   excluded null-office service-type events even though restricted managers may
   read organization-wide service types. Restricted audit scope now includes
   organization-wide operational events plus assigned-office events, while
   continuing to exclude unauthorized offices and security categories; the
   PostgreSQL regression covers all three cases.

## Files Changed

- Audit core/schema: `src/server/audit/{taxonomy,request-context,validation,
  serializers,writer,query-service}.ts`, `src/server/db/schema/audit-events.ts`,
  schema exports, membership composite key, and central permissions.
- Migrations: `drizzle/0008_fast_rage.sql`,
  `drizzle/0009_audit_append_only_guards.sql`, snapshots `0008`/`0009`, and
  `_journal.json`.
- Transaction integration: member service, operational create/catalog services,
  dispatch service, mutation result metadata, and HTTP result mapping.
- API/UI: audit Route Handler, audit page, operational navigation, global audit
  styles, and restricted development fixture.
- Tests: audit unit and Playwright files; permission, identity, tenancy,
  operational-record, dispatch, integration cleanup/readme, and Playwright
  cleanup updates.
- Documentation: app README; Bible index/domain/architecture/data/feature/
  security/testing/operations/roadmap/Field Operations chapters; Field
  Operations plan; ADR-009; this report.

No root static runtime file and no `euchre-platform/` file changed.

## Deferred Work

Production identity and invitations; database/hosting providers; production
role grants; audit retention, archive, legal hold, purge, access monitoring, and
SIEM; RLS; private storage/uploads; field sessions; evidence/media; reports and
templates; AI/OCR; samples; readiness/coverage; Decision Log; Procore/email and
other integrations all remain deferred.

## Risks And Open Questions

- Counsel/product must approve audit retention and privacy-request behavior.
- Production database migration/application roles and backup/recovery consistency
  need operational proof.
- RLS remains an open defense-in-depth decision.
- Audit-history reads are not themselves audited to avoid recursive noise.
- Incident-response and SIEM consumers are not selected.
- Denied-event coverage is intentionally selective; future domains must define
  safe verification before recording target-specific denials.

## Next Executable Gate

The repository is ready for a separately authorized Phase 5G private object
storage and authorized media-upload foundation from the local/test dependency
perspective. Phase 5G was not begun here. Field Operations FR-1 is not
authorized: pilot-ready production identity, private storage, and approved
report/template/retention gates remain incomplete.
