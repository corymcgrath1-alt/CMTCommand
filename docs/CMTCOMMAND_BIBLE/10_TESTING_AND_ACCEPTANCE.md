# Testing And Acceptance

## Document Status

- Status: Partially Verified
- Primary Evidence:
  - `scripts/verify-root.mjs`
  - `.github/workflows/root-static-checks.yml`
  - `tests/`
  - `README.md`
  - `apps/operational/package.json`
  - `apps/operational/tests/`
  - `apps/operational/playwright.config.ts`
  - `apps/operational/vitest.config.ts`
  - `apps/operational/vitest.integration.config.ts`
  - `apps/operational/tests/integration/tenancy.integration.test.ts`
  - `apps/operational/tests/unit/operational-records.validation.test.ts`
  - `apps/operational/tests/integration/operational-records.integration.test.ts`
  - `apps/operational/tests/integration/dispatch-workflow.integration.test.ts`
  - `apps/operational/tests/e2e/dispatch.spec.ts`
  - `.github/workflows/operational-ci.yml`
  - `DEVELOPER_NOTES.md`
  - `docs/cmtcommand-vnext/verification.md`
  - `docs/cmtcommand-vnext/status.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-16

## Current Demo - Confirmed

Test framework:

- No package-managed test framework found.
- Tests are dependency-free Node scripts using `assert`.

Test organization:

- `tests/demoShared.test.js`
- `tests/pilotIntakeSafety.test.js`
- `tests/demoControlCenter.test.js`
- `tests/pilotReadinessPack.test.js`
- `tests/demoWalkthrough.test.js`
- `tests/operationalImpact.test.js`
- `tests/operationalCompression.test.js`

Root verification command:

```powershell
node scripts\verify-root.mjs
```

The verifier runs:

- Trailing whitespace checks for selected root files.
- `node --check` for root JS files.
- Direct Node execution of deterministic tests.

CI:

- `.github/workflows/root-static-checks.yml` runs `node scripts\verify-root.mjs`.

Browser validation:

- `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.cjs` exists and was used as release evidence for Pilot Setup behavior.
- It requires a running local server and Edge CDP, so it is not the normal root CI gate.

## Founder Decision - 2026-07-13

`scripts/verify-root.mjs` remains the required root verifier for the current application.

Focused automated tests are required for operational logic.

Browser/CDP validation should not become a blocking CI or pull-request check while it remains intermittent or timing-sensitive. The progression should be:

1. Local browser validation.
2. Documented pre-release browser validation.
3. Stabilization and removal of intermittent timeouts.
4. Repeated clean execution across clean environments.
5. Promotion to a CI or pull-request gate.

Use ten consecutive clean runs as the founder-approved proposed reliability threshold before making browser validation blocking. This threshold is policy direction, not an enforced repository fact.

## Architecture Selection - 2026-07-13

Operational vNext should use Vitest for deterministic TypeScript domain/service tests and Playwright for browser/E2E coverage. Domain tests for readiness and coverage must not require a browser, web server, database, auth provider, or network service.

See the layered testing architecture in [Operational vNext Architecture Blueprint](plans/OPERATIONAL_VNEXT_ARCHITECTURE_BLUEPRINT.md).

## Operational vNext Scaffold - Confirmed

Phase 4 added app-local testing and verification commands under
`apps/operational/`:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run verify
npm run test:e2e
npm run test:db
npm run test:integration
npm run verify:db
```

`npm run verify` runs lint, typecheck, Vitest unit tests, and a production
Next.js build. It does not require PostgreSQL, Playwright browser execution,
auth credentials, deployment credentials, or customer data.

`npm run test:e2e` runs the non-blocking Playwright scaffold smoke. It is
configured as a single-worker check so it owns one local dev server and avoids
stale-server reuse.

`npm run test:db` is explicit and requires `APP_ENV=test`, a safe
`TEST_DATABASE_URL`, and exact repository test-database name and loopback-host
proofs. It is not part of the default gate.

## Operational vNext Tenancy Tests - Confirmed

Phase 5 adds database-independent unit tests for:

- Organization input validation.
- Office input validation.
- Slug and office-code normalization.
- IANA time-zone validation.
- Access-scope parsing.
- Empty restricted-scope behavior.
- Test database safety checks.
- Safe database-error mapping.

Phase 5 adds PostgreSQL integration tests for:

- Migration presence.
- Organization creation.
- Organization slug uniqueness.
- Office creation.
- Foreign-key enforcement.
- Office-code uniqueness within an organization.
- Duplicate office codes across organizations.
- Organization-wide office listing.
- Cross-organization listing and lookup isolation.
- Restricted office-scope listing and lookup.
- Empty restricted scopes.
- Inaccessible/nonexistent lookup equivalence.
- Organization deletion restriction while offices exist.
- Safe public mapping for predictable database errors.

`npm run verify:db` is the database-dependent gate. It applies test migrations
and runs PostgreSQL integration tests. It requires `APP_ENV=test`,
`TEST_DATABASE_URL`, exact expected database name and loopback host, and
explicit destructive-cleanup authorization; it must not fall back to
`DATABASE_URL`. Cleanup verifies live `current_database()` identity immediately
before explicitly enumerated `TRUNCATE ... RESTRICT` SQL. The Phase 5E cleanup
list now names all ten current tables in dependency-first order:
`dispatch_assignments`, `work_orders`, `technicians`, `projects`,
`office_assignments`, `external_identities`, `organization_memberships`,
`users`, `offices`, and `organizations`.

## Operational vNext Identity And Authorization Tests - Confirmed

Phase 5D unit tests cover:

- Production-disabled and production-forbidden auth adapter behavior.
- Explicit subject allowlists and session-secret requirements.
- Signed-session round trips, tampering, expiry, alternate secrets, and active
  organization payloads.
- Role permissions, read-only viewer behavior, non-admin member denial, and
  organization-wide office policy eligibility.
- Verified subject mapping, mutable email, unknown/disabled user states,
  invited/suspended/revoked memberships, inactive organizations, no membership,
  multi-organization selection, invalid tenant override, restricted office
  scope, and invalid all-office policy.
- Membership status-transition rules, including terminal revocation.

Phase 5D PostgreSQL integration tests cover unique external identity and
membership constraints, duplicate/cross-organization office assignments,
database-derived office scope, non-admin admin-action denial, self role/status
protection, cross-organization mutation denial, stale versions, in-transaction
actor revalidation, actor-attributed mutation metadata, and cross-organization
office rejection during membership preparation.

Playwright covers unauthenticated protected-route redirection, development sign
in, `HttpOnly` session cookie behavior, and fail-closed database-unavailable UI,
in addition to the existing liveness/readiness checks. Full role-to-role browser
acceptance requires the isolated migrated test database.

## Operational vNext Phase 5E Dispatch Tests - Confirmed

Phase 5E unit tests cover validation, lifecycle transition tables, half-open
overlap semantics, daylight-saving operational dates, and the least-privilege
role/permission matrix.

PostgreSQL integration coverage includes:

- Durable service-type uniqueness, tenant ownership, inactive selection denial,
  and archived historical references.
- Technician office eligibility, optional membership linkage, primary/support
  relationships, one-active-primary and duplicate-active constraints, inactive
  technician denial, and preserved reassignment history.
- Valid/invalid assignment transitions, stale versions, own acknowledgment,
  terminal-state protection, event append-only enforcement, and rollback when
  event insertion fails.
- Work-order ready/scheduled/in-progress/completed/cancelled reconciliation and
  rollback when reconciliation fails.
- Overlap, adjacency, cancelled-assignment exclusion, redacted cross-scope
  conflicts, unauthorized overrides, and reasoned authorized overrides.
- Direct composite-key rejection of cross-organization and cross-office
  relationships plus non-leaking service results.

Browser acceptance covers operations-manager dispatch, restricted-office
dispatcher behavior, viewer/reviewer mutation denial, linked technician own
assignments, cross-tenant rejection, stale-version recovery, persisted refresh,
and 390px no-overflow behavior.

Bounded local Phase 5E verification passed 13 unit files / 116 tests, four
PostgreSQL integration files / 53 tests, and 10/10 Playwright scenarios.
`npm run test:e2e` exits naturally with status 0 and leaves no listener on port
3100. `npm run verify:db`, `npm run verify`, `npm run verify:full`, production
build, repeated migration, `drizzle-kit check`, root verification, Markdown-link
validation, scoped security scans, client-bundle scans, and diff checks passed.
This is local/test evidence only and does not establish production readiness.

## Practical Testing Matrix

| Change type | Minimum expected verification |
| --- | --- |
| Documentation only | Link validation, `git diff --check`, final diff/status inspection. |
| Current demo domain logic | Focused utility test plus `node scripts\verify-root.mjs`. |
| Current demo UI behavior | Root verifier plus browser smoke of affected page; include 390px mobile and visual modes when layout changes. |
| Operational scaffold/tooling | `npm run verify` from `apps/operational/`; root verifier from repository root. |
| Operational tenancy persistence | `npm run verify`, `npm run verify:db`, root verifier, and database isolation tests against PostgreSQL. |
| Pilot Setup/trust boundary | Root verifier plus malformed, hostile, oversized, reload, valid-value, formula-export, and blocked/allowed cases. |
| Pilot V1 readiness engine | Focused unit tests for each rule, precedence, explanation fields, and recalculation. |
| Pilot V1 API behavior | Success, validation, unauthorized, forbidden, not-found, conflict/stale snapshot, and persistence-failure tests. |
| Pilot V1 database change | Migration tests plus affected integration tests, referential behavior checks, and rollback/recovery notes. |
| Pilot V1 permission change | Allowed and denied cases for each affected role, organization, and office boundary. |
| Pilot V1 import behavior | Valid import, malformed file, missing required fields, duplicate records, sensitive columns, preview/apply flow, and import history. |
| Bug fix | Regression test reproducing original failure when practical, plus related verifier/browser smoke. |

## Pilot V1 Acceptance Requirements

Minimum acceptance expectations:

- Readiness results are deterministic and explainable.
- A single hard failure produces Not Ready.
- Warnings produce At Risk only when mandatory requirements are satisfied.
- Every readiness result includes rule evaluated, input used, result, severity, explanation, and remediation path when one exists.
- Coverage approval recalculates directly and indirectly affected work orders.
- Decision Log writes are append-only, including corrections.
- Organization, office, and role boundaries have allowed and denied test cases.
- Import validation rejects or flags prohibited sensitive columns.

## Verification Reporting Format

Report exact commands and outcomes. Do not write "tests pass" unless tests were run.

If not run, report:

- Command not run.
- Reason.
- What remains uncertain.

## Current Coverage Gaps

- No root package lint/type/build checks exist.
- Browser/CDP validation is not part of CI.
- No full screen-reader transcript or formal accessibility audit was found.
- Prototype surfaces have limited direct tests.
- Phase 5E has bounded persistence, permission, and isolation coverage for four
  operational-record types. Import, readiness, coverage, Decision Log,
  operational-impact, Field Operations, and deployment tests do not exist yet.
- Operational database connectivity and migration behavior require a safe `TEST_DATABASE_URL` or the PostgreSQL CI service-container job.

## Open Questions

- [OPEN QUESTION - High Impact] What exact acceptance fixtures represent a TRD-104-equivalent imported customer scenario?
- [OPEN QUESTION - Medium Impact] Should documentation link validation become a maintained script?
- [OPEN QUESTION - Medium Impact] What coverage threshold is required before Pilot V1 browser validation can become blocking?
