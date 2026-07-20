# Phase 5D Identity, Membership, Office Access, And RBAC Report

## Status

- Implementation status: Acceptance-complete for the bounded local/test Phase 5D
  identity, membership, office-access, session, RBAC, and tenant-isolation scope.
- Database verification: Passed against an isolated localhost-only PostgreSQL 16
  runtime using the exact repository test-database identity.
- Authentication path: Path B, provider-neutral boundary plus development/test
  adapter.
- Production provider: Not selected; protected production authentication fails
  closed.
- Phase 5E authorization: Authorized to begin as separately scoped follow-on work;
  Phase 5E was not started during this verification.
- Date: 2026-07-16

## Implemented Boundary

Phase 5D adds the smallest coherent identity and authorization foundation to
`apps/operational/`:

- `users` with active, invited, suspended, and disabled lifecycle states.
- `external_identities` with unique provider/subject mapping independent of email.
- `organization_memberships` with six fixed roles, invited/active/suspended/revoked
  lifecycle, office policy, actor fields, and optimistic version.
- `office_assignments` with database-enforced same-organization membership and
  office references.
- Central role-to-permission policy and office-access helpers.
- Server authorization resolution from signed identity to user, membership,
  office scope, and permissions.
- Secure multi-organization selection in the signed session.
- Protected operational shell, account context, safe denied states, and member
  administration.
- Tenant-scoped current-context and office APIs.
- Actor-attributed mutation metadata without pretending a persistent audit log
  exists.
- Deterministic development fixtures and seed command for all roles and denial
  states.

The deterministic acceptance fixtures use Alpha Engineering with Alexandria and
Richmond, Beta Testing with Fairfax and Manassas, and separate Alpha/Beta
dispatcher subjects restricted to Alexandria/Fairfax respectively.

## Authentication Decision

The repository had no selected or partially integrated provider and no explicit
authorization to select one. Phase 5D uses Path B.

`AUTH_MODE=disabled` is the default. The development adapter requires:

- `APP_ENV=development|test`
- Non-production `NODE_ENV`
- A 32-character minimum `AUTH_SESSION_SECRET`
- An explicit `AUTH_DEVELOPMENT_SUBJECTS` allowlist

The adapter accepts no trusted request headers. Unknown subjects cannot create a
session, and unknown mapped identities cannot access the app.

## Data Integrity

The generated forward-only migrations are
`apps/operational/drizzle/0001_office-composite-key.sql` and
`apps/operational/drizzle/0002_identity-membership-rbac.sql`. The prerequisite
office key is intentionally separate so PostgreSQL sees it before the composite
foreign key that depends on it.

Together they add four enums, four tables, indexes, unique constraints, explicit `RESTRICT`
foreign keys, and a composite uniqueness key on offices. It contains no drop,
truncate, delete, test fixture, or production identity secret.

Important constraints:

- `users.normalized_email` is unique.
- `(external_identities.provider, provider_subject)` is unique.
- `(organization_memberships.organization_id, user_id)` is unique.
- Composite membership/organization and office/organization keys make a
  cross-organization assignment impossible.
- `(office_assignments.organization_membership_id, office_id)` is unique.

## Authorization And Mutation Rules

- Organization admin: member, role, and office-access management.
- Operations manager: authorized operational reads; no member administration.
- Dispatcher: office-restricted operational reads; no member administration.
- Technical reviewer: authorized reads; no member administration by default.
- Field technician: office-restricted reads; no organization administration.
- Viewer: authorized reads only.

Membership mutations prohibit self role/status changes, validate status
transitions, keep revoked memberships terminal, lock the organization row,
revalidate the acting membership in-transaction, and reject stale versions.

## User Experience

- `/sign-in`: controlled production-unavailable state or development allowlist.
- `/app`: redirects unauthenticated users, shows safe denied states, and displays
  only the active database-derived organization and offices.
- `/app/admin/members`: lists organization members and supports membership
  preparation, role/status changes, office policy, and assignment changes for
  authorized admins.
- `/api/auth/context`: sanitized current context.
- `/api/offices` and `/api/offices/[officeId]`: tenant and office scoped, with
  non-leaking 404 behavior.

Prepared memberships do not send email and are labeled accurately.

## Verification Contract

Stable verification is `npm run verify`. Browser verification is
`npm run test:e2e`. Database verification remains `npm run verify:db` and keeps
the Phase 5C safeguards:

- Exact `APP_ENV=test`.
- Exact database name `cmtcommand_operational_test`.
- Explicit loopback host agreement.
- Explicit destructive-cleanup authorization.
- Live `current_database()` proof inside the cleanup transaction.
- Explicit six-table `TRUNCATE ... RESTRICT`; no cascade.

If that database is unavailable or cannot be identified positively, the database
gate must fail closed and must not be bypassed.

## Phase 5D-V PostgreSQL Verification

Phase 5D-V resumed on 2026-07-16 after Docker Desktop became available. The
repository remained on `phase-5-tenancy-foundation` at
`bc314136b673c9219d118720e18230785f877a39`, tracking
`origin/phase-5-tenancy-foundation`. Existing unrelated dirty work under
`euchre-platform/` and the future Field Operations documentation remained
untouched.

### Runtime And Safety Evidence

- `docker version` reported Docker Client and Server 29.6.1 through Docker
  Desktop 4.82.0.
- The repository-supported `postgres:16` image ran as the isolated
  `cmtcommand-phase5d-postgres16` container with only
  `127.0.0.1:55432 -> 5432/tcp` published.
- Credentials were the fixed non-production CI-style test values and existed
  only in process/container environment configuration. No repository environment
  file was written.
- Before cleanup or migration, a host connection proved
  `current_database() = cmtcommand_operational_test`,
  `current_user = cmtcommand_test`, client endpoint `localhost:55432`, container
  server endpoint `172.17.0.2:5432`, and PostgreSQL 16.14.
- `npm run test:db` passed with exact `APP_ENV=test`, database-name proof, and
  loopback-host proof.

### Migration And Catalog Evidence

- The supported migrator applied `0000_open_giant_girl.sql`,
  `0001_office-composite-key.sql`, and
  `0002_identity-membership-rbac.sql` as three Drizzle migration records.
- A second migration run preserved all three migration ids, hashes, timestamps,
  and row count, proving a safe no-op.
- Live PostgreSQL catalog inspection found six public application tables plus
  `drizzle.__drizzle_migrations`, six enums, 20 indexes, 14 primary/unique
  constraints, and nine foreign keys.
- Composite uniqueness keys exist on `(offices.id, organization_id)`,
  `(organization_memberships.id, organization_id)`, organization/user,
  organization/office-code, provider/subject, and membership/office pairs.
  Composite foreign keys enforce membership/organization and office/organization
  agreement for every office assignment. All nine foreign keys use restrictive
  delete behavior.
- `npm run db:generate` reported no schema changes, and
  `npx drizzle-kit check` passed migration metadata validation.

### Seed And PostgreSQL Test Evidence

- The deterministic seed persisted Alpha Engineering with Alexandria and
  Richmond, Beta Testing with Fairfax and Manassas, 12 users, 12 external
  identities, 12 memberships, and three restricted office assignments.
- A second seed run left per-table data fingerprints unchanged, proving
  idempotency.
- Direct `npm run test:integration` passed two files and 27 tests.
- `npm run verify:db` reapplied the migration guard and passed the same two files
  and 27 PostgreSQL integration tests with the exact live-database cleanup proof
  and explicit reset authorization.

### Live Authorization And Administration Evidence

The operational app ran against the isolated database with the development-only
signed session adapter and explicit subject allowlist. Browser and API evidence
confirmed:

- Alpha Admin received Alpha-wide office access and member administration.
- Alpha Dispatcher received Alexandria only; Richmond and Beta Fairfax probes
  returned the same non-leaking 404 response.
- Alpha Viewer received read-only Alpha access and a denied member-admin page.
- Suspended membership, disabled user, and no-membership subjects returned their
  distinct fail-closed 403/page states.
- Beta Dispatcher received Fairfax only and could not read Alpha Alexandria.
- The multi-organization viewer had to choose an organization explicitly and
  could switch between revalidated Alpha and Beta contexts.
- A new invited membership persisted with Alexandria and Richmond assignments.
- Two concurrently loaded admin pages proved optimistic concurrency: the first
  role change advanced version 1 to 2, and the second stale status mutation was
  rejected without changing persisted status.
- The sole active Alpha administrator's self-demotion was rejected, and live
  PostgreSQL inspection still showed exactly one active Alpha admin with the
  original role, status, and version.
- No browser console warning/error or framework error overlay occurred during
  the live acceptance scenarios.

No verified Phase 5D identity, RBAC, database, migration, session, or
tenant-isolation defect surfaced in this PostgreSQL-backed pass. Application
code was therefore not changed and no speculative regression test was added.

### Complete Verification Evidence

- `npm run verify:full` passed lint, typecheck, 11 unit-test files / 97 tests,
  production build, and six Playwright scenarios. Playwright included the 390px
  sign-in overflow/console check and controlled no-database failures.
- `node scripts/verify-root.mjs` passed the independent static-demo regression
  gate.
- Relative Markdown validation checked 148 links across 35 Bible/operational
  Markdown files with no broken links.
- Client bundle scanning found no database URL, test reset authorization,
  session secret/allowlist, test password, PostgreSQL URL, or session-cookie
  identifier in `.next/static`.
- High-risk secret scanning found no private key, bearer credential, provider
  token, or local runtime session secret. PostgreSQL URL matches were limited to
  documented placeholders, deterministic tests, and the fixed CI-only test
  database credential.
- Conflict/debug/disabled-test scans found no merge marker, debugger, `.only`,
  `.skip`, or Phase 5D temporary marker.
- Dependency audit remained at the established baseline: two moderate
  production findings and six moderate total findings. The suggested automatic
  fixes are breaking dependency downgrades and were not applied.
- Scoped `git diff --check` and the Phase 5D trailing-whitespace scan passed.
  Final Git inspection preserved the original branch, HEAD, upstream, and
  unrelated dirty files, and confirmed that no file was staged.

Phase 5D is acceptance-complete for its bounded local/test scope. Phase 5E is
authorized to begin only as a separately scoped phase. This does not authorize
pilot production: production identity provider selection, managed database and
hosting choices, persistent security audit events, invitation delivery, and RLS
evaluation remain unresolved gates.

## Deferred Work

- Production provider integration.
- Invitation token acceptance and email delivery.
- Persistent general audit events.
- RLS evaluation.
- Imports, readiness, coverage, Decision Log, assignments, Field Operations,
  media, AI extraction, samples, Procore, and email ingestion.

Field Operations FR-1 remains unimplemented.
