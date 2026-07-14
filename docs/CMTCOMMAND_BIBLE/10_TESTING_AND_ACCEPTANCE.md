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
  - `.github/workflows/operational-ci.yml`
  - `DEVELOPER_NOTES.md`
  - `docs/cmtcommand-vnext/verification.md`
  - `docs/cmtcommand-vnext/status.md`
  - Founder decision recorded in the Phase 2 Founder Truth Capture task, 2026-07-13
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
- Last Reviewed: 2026-07-13

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
```

`npm run verify` runs lint, typecheck, Vitest unit tests, and a production
Next.js build. It does not require PostgreSQL, Playwright browser execution,
auth credentials, deployment credentials, or customer data.

`npm run test:e2e` runs the non-blocking Playwright scaffold smoke. It is
configured as a single-worker check so it owns one local dev server and avoids
stale-server reuse.

`npm run test:db` is explicit and requires a safe `TEST_DATABASE_URL`. It is not
part of the default gate.

## Practical Testing Matrix

| Change type | Minimum expected verification |
| --- | --- |
| Documentation only | Link validation, `git diff --check`, final diff/status inspection. |
| Current demo domain logic | Focused utility test plus `node scripts\verify-root.mjs`. |
| Current demo UI behavior | Root verifier plus browser smoke of affected page; include 390px mobile and visual modes when layout changes. |
| Operational scaffold/tooling | `npm run verify` from `apps/operational/`; root verifier from repository root. |
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
- Pilot V1 operational logic, permissions, persistence, and deployment tests do not exist yet.
- Operational database connectivity is not verified until a safe `TEST_DATABASE_URL` is available.

## Open Questions

- [OPEN QUESTION - High Impact] What exact acceptance fixtures represent a TRD-104-equivalent imported customer scenario?
- [OPEN QUESTION - Medium Impact] Should documentation link validation become a maintained script?
- [OPEN QUESTION - Medium Impact] What coverage threshold is required before Pilot V1 browser validation can become blocking?
