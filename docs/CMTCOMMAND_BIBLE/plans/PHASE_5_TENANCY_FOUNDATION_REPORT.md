# Phase 5 Tenancy Foundation Report

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `apps/operational/src/server/db/schema/organizations.ts`
  - `apps/operational/src/server/db/schema/offices.ts`
  - `apps/operational/src/server/tenancy/`
  - `apps/operational/drizzle/0000_open_giant_girl.sql`
  - `apps/operational/tests/unit/`
  - `apps/operational/tests/integration/tenancy.integration.test.ts`
  - `apps/operational/scripts/db-migrate-test.ts`
  - `.github/workflows/operational-ci.yml`
- Last Reviewed: 2026-07-14

## Date

2026-07-14

## Baseline Commit

- Baseline commit: `c0d5a89 Scaffold CMTCommand operational vNext`

## Scope Implemented

- Organization persistence model.
- Office persistence model.
- Stable internal UUID identifiers.
- Organization ownership for offices.
- PostgreSQL constraints for the approved tenancy foundation.
- Application-layer organization-wide and office-limited access scopes.
- Scoped office repository functions.
- Unit tests for validation, scope parsing, test database safety, and safe error mapping.
- PostgreSQL integration-test path for tenant isolation and constraints.
- Test-only migration command and database safety guard.
- Separate PostgreSQL-backed CI job.

## Scope Explicitly Excluded

- Authentication.
- Invitations.
- Users.
- Organization memberships.
- Role assignments or RBAC.
- Technician, availability, certification, clearance, equipment, project, job-site, work-order, service requirement, import, readiness, coverage, Decision Log, audit-event, and operational-impact models.
- Public HTTP routes for tenants or offices.
- Tenant-management UI.
- Production deployment, monitoring, backups, or rollback.

## Tables Created

| Table | Purpose |
| --- | --- |
| `organizations` | Customer firm or isolated tenant boundary. |
| `offices` | Operational office or branch owned by one organization. |

## Constraints Created

- `organizations.id` primary key.
- `organizations.slug` unique constraint.
- `organizations.status` enum constraint through `organization_status`.
- `organizations_slug_format_check`.
- `organizations_name_not_blank_check`.
- `offices.id` primary key.
- `offices.organization_id` required foreign key.
- `offices.status` enum constraint through `office_status`.
- `offices_organization_code_unique` on `(organization_id, code)`.
- `offices_code_format_check`.
- `offices_name_not_blank_check`.
- `offices_time_zone_not_blank_check`.

## Migration Created

- `apps/operational/drizzle/0000_open_giant_girl.sql`
- `apps/operational/drizzle/meta/_journal.json`
- `apps/operational/drizzle/meta/0000_snapshot.json`

The migration contains only the organization and office foundation.

## Identifier Strategy

- Organization ids are PostgreSQL UUIDs generated with `gen_random_uuid()`.
- Office ids are PostgreSQL UUIDs generated with `gen_random_uuid()`.
- Organization names and office names are not primary identifiers.
- Human/customer operational identifiers remain future fields and are not part of this phase.

## Organization Ownership Behavior

Organizations own offices through the `offices.organization_id` foreign key.
Organization deletion is not exposed as a repository operation. At the database
level, `offices_organization_id_fk` uses `ON DELETE restrict` so an organization
with offices is not silently deleted with its offices.

## Office Ownership Behavior

Offices belong to exactly one organization. Office codes are unique only within
an organization, so the same code may exist in separate organizations.

## Access-Scope Model

`apps/operational/src/server/tenancy/scope.ts` defines:

- Organization-wide access: one organization id with `officeAccess: "all"`.
- Office-limited access: one organization id with `officeAccess: "restricted"`
  and a list of permitted office ids.

Empty restricted office lists are valid and return no offices. Missing office
restrictions do not broaden access. Office ids cannot override the organization
id in the scope.

## Scoped Persistence Operations

Setup/admin persistence:

- `createOrganization`
- `findOrganizationById`
- `findOrganizationBySlug`
- `createOfficeForOrganization`

Scoped office reads:

- `listAccessibleOffices`
- `findAccessibleOfficeById`
- `findAccessibleOfficeByCode`

No delete operations are exposed.

## Isolation Semantics

The integration-test file covers:

- Organization A cannot list Organization B offices.
- Organization A cannot retrieve Organization B offices by id.
- Restricted scopes cannot retrieve another office in the same organization.
- Organization-wide scopes can retrieve all offices in one organization.
- Same office code can exist in separate organizations.
- Duplicate office code inside one organization is rejected.
- Inaccessible and nonexistent offices return the same public result.
- Empty restricted scopes return no offices.
- Office ids cannot override organization scope.
- Foreign-key constraints prevent offices from referencing nonexistent organizations.
- Organization deletion does not silently delete offices.

## Database Test Strategy

`npm run verify:db` runs:

1. `npm run db:migrate:test`
2. `npm run test:integration`

The test path requires:

- `APP_ENV=test`
- `TEST_DATABASE_URL`
- `TEST_DATABASE_EXPECTED_NAME=cmtcommand_operational_test`
- An exact URL database-name match
- `TEST_DATABASE_EXPECTED_HOST` set to the exact loopback host in the URL
- No unsafe production/staging/pilot markers in the host or database name

The path does not fall back to `DATABASE_URL`, rejects substring-only test
names and arbitrary remote hosts, and redacts credentials in output.

Destructive integration cleanup additionally requires:

- `TEST_DATABASE_RESET_AUTHORIZATION=ALLOW_CMT_TEST_DATABASE_RESET`
- A live `current_database()` result matching the authorized URL identity
- Cleanup of the explicitly enumerated `offices` and `organizations` tables
  with `RESTRICT`, not `CASCADE`

## CI Integration-Test Strategy

`.github/workflows/operational-ci.yml` keeps the no-database job separate from a
PostgreSQL service-container job. The database job uses Node `22.22.2`, a
fixed repository-owned test database on `localhost`, explicit identity and
cleanup authorization variables, `npm ci`, and `npm run verify:db`.

## Verification Performed

- Phase 4 was committed at `c0d5a89`.
- Pre-edit root static verifier passed.
- Pre-edit `npm ci` completed.
- Pre-edit `npm run verify` passed.
- `npm run db:generate` created the initial Drizzle migration.
- Re-running `npm run db:generate` reported no schema changes and no migration drift.
- `npm run verify` passed after implementation: lint, typecheck, 7 unit test files / 29 tests, and production build.
- `npm run test:e2e` passed after implementation: 3 Playwright scaffold smoke tests.
- `node scripts\verify-root.mjs` passed after implementation.
- `npm run verify:db` failed safely before connecting because `APP_ENV=test` and a safe `TEST_DATABASE_URL` were not configured.
- `npm audit --omit=dev` completed with 2 moderate production findings, matching Phase 4.
- `npm audit` completed with 6 moderate total findings, matching Phase 4.
- `git diff --check` completed without whitespace errors.
- Relative Markdown link validation passed across the Bible and operational README.

## Verification Not Performed

- Local PostgreSQL migration execution and integration-test execution were not performed because no
  `TEST_DATABASE_URL`, `psql`, Docker, or local PostgreSQL service was available.
- GitHub Actions execution was not performed locally. The workflow was updated
  to provide the CI execution path.

## Phase 5B Error-Mapping Correction

Status: Phase 5B PostgreSQL Reverification Passed

The first PostgreSQL CI execution proved that PostgreSQL started, the test
database safety guard accepted the CI database, the initial migration applied,
and 8 of 13 integration tests passed. The failing tests exposed a
Drizzle-wrapper error-classification defect: native PostgreSQL `code` and
`constraint` metadata can live inside `DrizzleQueryError.cause`.

The correction updates the central tenancy error metadata extractor to inspect a
small bounded `.cause` chain. It does not change schemas, migrations,
constraints, tenant-scope predicates, expected public results, authentication,
memberships, RBAC, or product-domain behavior.

The corrected error mapping passed the stable and PostgreSQL GitHub Actions jobs
at commit `bc31413` on 2026-07-14.

## Phase 5C Destructive Test Database Safety Correction

Status: Database-Independent Verification Passed; PostgreSQL Reverification Pending

The Phase 5 test harness previously treated a database name containing `test`
as evidence that the database was disposable. Integration cleanup then used an
open-ended `TRUNCATE ... CASCADE`. A misleading remote database such as
`customer_test` could therefore pass configuration validation and reach
destructive cleanup.

Phase 5C replaces substring matching with a fail-closed contract:

- Only `cmtcommand_operational_test` is an accepted expected database name.
- The URL name must match that expected identity exactly.
- The explicitly expected host must match the URL and must be loopback.
- Destructive cleanup requires the exact authorization value
  `ALLOW_CMT_TEST_DATABASE_RESET`.
- The integration suite reads PostgreSQL's live `current_database()` inside the
  cleanup transaction immediately before destructive SQL.
- Cleanup explicitly enumerates `offices` and `organizations` and uses
  `RESTRICT`. A future dependent table must make cleanup fail visibly until the
  contract is intentionally updated.
- Errors and diagnostics never include credentials or the unredacted URL.

Phase 5C verification performed locally:

- The focused regression test failed before implementation: 13 failed, 4 passed.
- `npm run test -- tests/unit/db.test-safety.test.ts` passed: 17 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed: 7 test files / 47 tests.
- `npm run verify` passed: lint, typecheck, 47 unit tests, and production build.
- `node scripts/verify-root.mjs` passed.
- `npm run verify:db` failed closed before connecting when the required test
  environment was absent.

Local PostgreSQL execution was not available: no PostgreSQL or Docker service
was present and `localhost:5432` was closed. The strengthened migration and
integration path therefore remains pending execution by the existing GitHub
Actions PostgreSQL service after a later authorized push.

## Security Boundary

Database-enforced:

- Required organization and office fields.
- Status enum values.
- Organization slug uniqueness.
- Office code uniqueness within an organization.
- Office-to-organization referential integrity.
- Restrictive organization deletion while offices exist.

Application-enforced:

- Organization slug normalization and validation.
- Office code normalization and validation.
- IANA time-zone validation.
- Explicit organization-wide and office-limited access scopes.
- Cross-organization lookup equivalence for inaccessible and nonexistent offices.

Not enforced yet:

- Authentication.
- User-derived access scope.
- Organization memberships.
- RBAC permissions.
- Audit events.
- PostgreSQL Row-Level Security.

## RLS Status

PostgreSQL Row-Level Security is deferred. ADR-004 requires application-layer
scoped queries first and records RLS as defense-in-depth to evaluate before
pilot production. RLS depends on a selected authentication/session model and a
server-side way to bind database access to trusted organization and office
claims. The deferral does not block adding identity records and RBAC next, but
it must be revisited before pilot production.

## Authentication Status

Authentication is not implemented. Scope objects are constructed by trusted
internal callers or tests only.

## Authorization Status

Role-based authorization is not implemented. The Phase 5 scope model is a
persistence safety boundary, not a complete permission system.

## Known Limitations

- The local environment did not execute PostgreSQL integration tests.
- `updated_at` is database-backed on insert but no update operations exist yet.
- Test-only CI PostgreSQL credentials are static within the workflow and are not
  production secrets.
- Office time-zone validity is application-level validation, not a database
  global time-zone constraint.
- The current scope model is not user-derived until identity and memberships are
  implemented.

## Dependency Audit Comparison

No new dependencies were added. The Phase 4 baseline remains the comparison:

- 2 moderate production findings.
- 6 moderate total findings.
- No high or critical findings.

Automatic audit fixes must not be applied without dependency review because npm
suggests breaking changes.

## Recommendation For The Next Phase

Do not add technicians, work orders, imports, readiness, or coverage yet. The
next smallest guarded phase should add identity records, organization
memberships, office access assignments, and server-enforced RBAC so trusted
access scopes are derived from authenticated server-side facts.
