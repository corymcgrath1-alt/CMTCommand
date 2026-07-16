# CMTCommand Operational vNext

This directory contains the guarded Operational vNext foundation for CMTCommand.
It proves the app boundary, TypeScript/Next.js toolchain, health endpoints,
environment validation, Drizzle/PostgreSQL wiring, organization/office tenancy
persistence, provider-neutral identity, memberships, office assignments,
server-enforced RBAC, four durable operational-record types, unit testing,
integration testing, and browser test configuration.

It does not implement the end-to-end Pilot V1 business workflow.

## Current Scope

Implemented in this scaffold:

- Next.js App Router shell.
- Server-side environment validation with Zod.
- Lazy PostgreSQL/Drizzle connection wiring.
- Organization and office schema with explicit tenant-scoped persistence helpers.
- Application users and unique provider-subject mappings.
- Organization memberships, six fixed roles, explicit office-access policy,
  and same-organization office assignments.
- Signed, allowlisted development/test identity sessions that are forbidden in
  production runtimes.
- Protected `/app` shell, secure active-organization selection, member
  administration, and tenant-scoped office APIs.
- Durable `projects`, `technicians`, `work_orders`, and `dispatch_assignments`
  with required organization/office ownership, source-system identifiers, and
  database-enforced relationship scope.
- Permission- and office-scoped create/list/find services for those four record
  types. Create operations serialize on the organization, revalidate the current
  actor inside the transaction, and return structured mutation metadata for a
  future audit sink.
- `/api/health` liveness endpoint.
- `/api/ready` database-readiness endpoint.
- Vitest unit tests.
- PostgreSQL integration-test path for migrations and tenant isolation.
- Playwright browser smoke test configuration.
- App-local npm package and lockfile.

Not implemented:

- A production authentication provider or production sign-in flow.
- Invitation acceptance or email delivery. The administrator can prepare an
  invited membership only.
- Persistent general audit events. Security mutations return structured,
  actor-attributed metadata for a future audit sink.
- A durable Service Type catalog, imports, equipment/certification/clearance
  records, readiness rules, coverage, Decision Log, operational impact, or
  deployment.
- Product routes or UI for projects, technicians, work orders, or dispatch
  assignments.

## Runtime

- Node target: 22.22.2 or newer, declared in `.nvmrc` and `package.json`.
- npm: declared through `packageManager`.

The local verification environment may use a newer compatible Node version, but
CI targets Node 22.22.2.

## Setup

From this directory:

```powershell
npm ci
```

Create local environment files only when needed. Do not commit `.env` or
`.env.local`.

```text
APP_ENV=development
DATABASE_URL=
TEST_DATABASE_URL=
TEST_DATABASE_EXPECTED_NAME=
TEST_DATABASE_EXPECTED_HOST=
TEST_DATABASE_RESET_AUTHORIZATION=
AUTH_MODE=disabled
AUTH_SESSION_SECRET=
AUTH_DEVELOPMENT_SUBJECTS=alpha-admin,alpha-dispatcher,alpha-viewer
```

Leaving database values blank and `AUTH_MODE=disabled` is valid for linting,
type checking, unit tests, the public scaffold page, and production build. It
fails closed for protected application access.

### Local development identity setup

No production provider has been selected. To exercise identity and RBAC locally,
use a non-production runtime, a migrated local database, and an explicit
allowlist:

```text
APP_ENV=development
AUTH_MODE=development
AUTH_SESSION_SECRET=<at-least-32-random-local-characters>
AUTH_DEVELOPMENT_SUBJECTS=alpha-admin,alpha-dispatcher,alpha-viewer,alpha-suspended,alpha-disabled,no-membership,beta-admin,beta-dispatcher,multi-organization-viewer
DATABASE_URL=postgresql://user:password@localhost:5432/cmtcommand_operational_dev
```

Never reuse an example secret in a shared environment. The adapter is rejected
when `APP_ENV` is staging/pilot-production/production or when `NODE_ENV` is
production. It accepts no identity headers and writes an `HttpOnly`,
`SameSite=Lax`, signed cookie containing only provider, subject, timestamps, and
an optional server-validated active organization.

After applying migrations, seed deterministic development identities:

```powershell
npm run db:migrate
npm run seed:identity:dev
npm run dev
```

The seed creates Alpha Engineering with Alexandria and Richmond, Beta Testing
with Fairfax and Manassas, fixtures for all six roles, Alpha and Beta dispatcher
subjects restricted to Alexandria and Fairfax respectively, a suspended
membership, a disabled user, a user with no membership, and a multi-organization
viewer. Seed data is not part of production migrations.

## Schema And Migrations

The Drizzle schema contains the tenancy, identity, and bounded operational-data
foundation:

- `src/server/db/schema/organizations.ts`
- `src/server/db/schema/offices.ts`
- `src/server/db/schema/users.ts`
- `src/server/db/schema/external-identities.ts`
- `src/server/db/schema/organization-memberships.ts`
- `src/server/db/schema/office-assignments.ts`
- `src/server/db/schema/projects.ts`
- `src/server/db/schema/technicians.ts`
- `src/server/db/schema/work-orders.ts`
- `src/server/db/schema/dispatch-assignments.ts`

Generate migrations after schema changes:

```powershell
npm run db:generate
```

Apply migrations to the normal server database:

```powershell
npm run db:migrate
```

`npm run db:migrate` uses `DATABASE_URL` through Drizzle Kit. It must not fall
back to `TEST_DATABASE_URL`.

Apply migrations to an explicit test database:

```powershell
$env:APP_ENV="test"
$env:TEST_DATABASE_URL="postgresql://user:password@localhost:5432/cmtcommand_operational_test"
$env:TEST_DATABASE_EXPECTED_NAME="cmtcommand_operational_test"
$env:TEST_DATABASE_EXPECTED_HOST="localhost"
npm run db:migrate:test
```

The test path accepts only the exact repository-owned database identity
`cmtcommand_operational_test` on an explicitly declared loopback host. A name
that merely contains `test`, an arbitrary remote host, or a URL that disagrees
with the expected name or host is rejected. Diagnostics redact credentials and
never print the unredacted connection string.

PostgreSQL integration tests also delete their own scoped test fixtures.
That destructive cleanup requires an additional explicit authorization value:

```powershell
$env:TEST_DATABASE_RESET_AUTHORIZATION="ALLOW_CMT_TEST_DATABASE_RESET"
npm run test:integration
```

Immediately before cleanup, the integration test verifies PostgreSQL's live
`current_database()` identity inside the same transaction. Cleanup enumerates
the ten current operational, identity, and tenancy tables in dependency-first
order and uses `RESTRICT`, so a future dependent table fails visibly instead of
being silently removed by `CASCADE`.

## Development

```powershell
npm run dev
```

Open `http://127.0.0.1:3000/` unless Next.js selects another port.

## Health Checks

`GET /api/health`

- Does not require PostgreSQL.
- Returns HTTP 200 with `{ "status": "ok", "service": "cmtcommand-operational" }`.

`GET /api/ready`

- Checks PostgreSQL connectivity with a minimal query.
- Returns HTTP 200 only when PostgreSQL is configured and reachable.
- Returns HTTP 503 with a stable reason such as `database_not_configured` or `database_unavailable`.
- Does not return database URLs, hostnames, stack traces, or raw driver errors.

## Commands

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run test:db
npm run test:integration
npm run test:e2e
npm run verify
npm run verify:db
npm run verify:full
npm run db:generate
npm run db:migrate
npm run db:migrate:test
npm run db:studio
npm run seed:identity:dev
```

`npm run verify` is the stable default gate: lint, typecheck, unit tests, and
production build. It does not require a live database, browser installation, or
auth provider credentials.

`npm run test:db` requires `APP_ENV=test`, a safe `TEST_DATABASE_URL`, and the
exact expected database name and loopback host. It is intentionally not part of
the default gate.

`npm run test:integration` runs PostgreSQL-backed integration tests and requires
the same exact database identity plus explicit destructive-cleanup
authorization.

`npm run verify:db` applies test migrations and runs PostgreSQL integration
tests. It is the database-dependent gate and is intentionally separate from
`npm run verify`.

`npm run test:e2e` runs Playwright browser smoke tests and is intentionally not
part of the default gate.

`npm run verify:full` preserves the browser behavior from Phase 4: stable
verification plus Playwright scaffold smoke tests. It does not include the
database gate.

## Current Identity, Tenancy, And Operational-Record Boundary

Implemented:

- Stable UUID identifiers for organizations and offices.
- Globally unique normalized organization slugs.
- Office ownership through `organization_id`.
- Office codes unique within an organization.
- Application-layer access scopes for organization-wide and office-limited
  office reads.
- Scoped persistence functions that return inaccessible cross-tenant offices as
  indistinguishable from nonexistent offices.
- Provider subjects map uniquely to application users; email is not the immutable
  identity key.
- Active users require an active organization membership. Invited, suspended,
  revoked, disabled, and unaffiliated states fail closed.
- Multiple organizations use a signed active-organization selection revalidated
  against current database membership on every request.
- Role permissions are centralized in `src/server/auth/permissions.ts`.
- Composite foreign keys prevent cross-organization office assignment.
- Membership writes revalidate the actor inside the transaction, use optimistic
  versions, prevent self role/status changes and final-admin lockout, and return
  structured actor metadata.
- Operational records use internal UUIDs while preserving normalized
  `source_system` plus source-specific IDs separately from human project/work
  numbers.
- Every Phase 5E record requires `organization_id` and `office_id`. Composite
  foreign keys keep work orders with projects and dispatch assignments with work
  orders/technicians in the same organization and office.
- Organization admins and operations managers can read/manage all four record
  types. Dispatchers can read all four and manage dispatch assignments only;
  technical reviewers and viewers are read-only; field technicians receive no
  Phase 5E record permission.
- Operational create services lock the organization and revalidate active user,
  organization, membership, current role permission, and office access inside
  the transaction. Returned actor-attributed mutation metadata is not persisted
  audit history.

Not implemented:

- Production authentication provider integration.
- Invitation acceptance and delivery.
- Persistent general audit-event storage.
- PostgreSQL Row-Level Security.
- Operational-record HTTP routes, Server Actions, and product UI.
- Durable Service Type records and the remaining readiness data domains.

Protected scopes are derived from verified identity and current database
membership. Client-supplied organization IDs, office IDs, roles, and permissions
are untrusted input. Existing setup-level organization/office helpers remain
internal and must not receive browser-derived scopes.

## Protected Request Verification

With the local development setup running:

1. Open `/sign-in` and choose an allowlisted subject.
2. Verify `/app` displays the database-derived organization, role, and office
   context.
3. As `alpha-dispatcher`, verify `/api/offices` returns Alexandria only and a
   direct Richmond request returns the same 404 shape as an unknown office.
4. As `alpha-admin`, open `/app/admin/members`, prepare a membership, and verify
   the UI says no email was sent.
5. As `beta-admin`, verify Alpha offices and members are inaccessible.

Common controlled failures:

- `provider_not_selected`: `AUTH_MODE` is disabled; production remains fail-closed.
- `authentication_misconfigured`: development mode lacks a 32-character secret,
  has no allowlist, or was attempted in a production runtime.
- `database_not_configured`: the signed identity is valid but `DATABASE_URL` is absent.
- `identity_unknown`: the verified provider subject has no application mapping.
- `no_membership` / `membership_denied`: the user lacks an active membership.

## Relationship To The Static Demo

The root static demo remains the trusted product reference and is independently
runnable. Operational vNext must not import root demo runtime code or require
root package tooling.

After changes here, run the root verifier from the repository root:

```powershell
node scripts\verify-root.mjs
```

## Documentation

Start with the CMTCommand Bible:

- [Bible index](../../docs/CMTCOMMAND_BIBLE/00_INDEX.md)
- [Operational architecture blueprint](../../docs/CMTCOMMAND_BIBLE/plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md)
- [Phase 4 scaffolding report](../../docs/CMTCOMMAND_BIBLE/plans/PHASE_4_SCAFFOLDING_REPORT.md)
- [Phase 5D identity/RBAC report](../../docs/CMTCOMMAND_BIBLE/plans/PHASE_5D_IDENTITY_RBAC_REPORT.md)
- [Phase 5E durable operational-records report](../../docs/CMTCOMMAND_BIBLE/plans/PHASE_5E_DURABLE_OPERATIONAL_RECORDS_REPORT.md)

This scaffold is not ready for pilot use until later guarded phases add the
remaining operational data domains, imports, readiness engine, coverage
workflow, persistent general audit events, production identity provider, and
pilot operations.
