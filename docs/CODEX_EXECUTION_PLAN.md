# CMTCommand Codex Execution Plan

Date: 2026-07-10

## Product Thesis

CMTCommand answers one operational question for CMT, geotech, and special-inspection teams: can tomorrow's scheduled work actually be performed? The supported root product should convert local schedule, technician, certification, equipment, intake, and decision data into deterministic readiness states, source-backed explanations, feasible corrective actions, and auditable manager decisions.

## Safety Envelope

- Working directory confirmed: `C:\Users\Surface i7\Documents\CMTCommand-codex`.
- Active branch confirmed: `codex-takeover`.
- Current `HEAD` at the browser-validator repair start: `92b40a572afed4a33aa19f7dc18eb1ba124d4044`.
- Protected baseline tag `pre-codex-takeover^{commit}` resolves to `d23c70a7044f46f129cb2272ab83a1840441484a`.
- `git worktree list` shows the original repository at `C:\Users\Surface i7\Documents\CMT Command Center` on `feat/trusted-pilot-intake-safety` and this autonomous worktree at `C:\Users\Surface i7\Documents\CMTCommand-codex` on `codex-takeover`.
- `git status --short --branch` was clean at takeover start.
- Operator instruction files present: `AGENTS.md`, `CODEX_TAKEOVER_PROMPT.md`.
- Protected path status: `euchre-platform/` exists and is out of scope; `brackethub/` and `_migration_review/` are absent in this worktree snapshot.
- No shared refs were modified.

## Baseline Validation

Commands run before product edits:

```powershell
node .\scripts\verify-root.mjs
```

Result: pass. Syntax checks, deterministic Node tests, and verifier whitespace gate passed.

```powershell
$tests = Get-ChildItem .\tests -File -Filter "*.test.js"
foreach ($test in $tests) {
    Write-Host "`nRunning $($test.Name)..."
    node $test.FullName
    if ($LASTEXITCODE -ne 0) {
        throw "Test failed: $($test.Name)"
    }
}
```

Result: pass. All root `tests/*.test.js` files passed.

No root `package.json` or package-managed build, lint, type-check, or audit command exists.

## Current Architecture

- Static root app served from `index.html`.
- `app.js` owns demo fixtures, mutable browser-local state, page rendering, navigation, event handling, tomorrow-readiness evaluation, coverage recommendation, and decision logging.
- UMD utility modules provide shared storage/copy helpers, pilot intake safety, operational compression, operational impact, pilot walkthrough, pilot materials, and Demo QA.
- `tests/` contains dependency-free Node tests for deterministic utilities.
- `scripts/verify-root.mjs` is the local/CI root verification entry point.
- `.github/workflows/root-static-checks.yml` runs the verifier for root static-app changes.
- `docs/cmtcommand-vnext/` records prior vNext phase memory, including the completed Trusted Pilot Intake and Render Safety slice.

## Product Ground Truth

Principal users: owners, branch managers, operations managers, dispatchers, project managers, lab/equipment leaders, and field supervisors responsible for making tomorrow's work executable.

Highest-value jobs:

- See tomorrow's overall readiness at a glance.
- Identify the highest-risk work order before dispatch.
- Understand the exact blocker and source fields.
- Find a qualified, available corrective action.
- Approve or record a manager decision.
- See readiness and impact after the decision.
- Start a pilot from limited anonymized local data without unsafe file handling.

Current primary workflows:

- Tomorrow Readiness: evaluates six demo work orders and surfaces Ready, At Risk, and Not Ready counts.
- Find Coverage: focuses the TRD-104 story, ranks coverage options, recommends Maria Lopez, and records approval.
- Decision Log: stores local decision entries with before/after status, issue, reason, checks used, and impact.
- Operational Impact: calculates issues caught, conservative review-time estimate, repeat patterns, bottlenecks, and data quality.
- Pilot Setup: previews, validates, and safely renders local CSV/document intake.
- Demo QA and Pilot Materials: verify demo health and generate buyer/pilot copy.

## Principal Risks

- Core readiness and coverage rules are still embedded in `app.js`, which mixes domain logic with rendering and makes the product harder to test beyond the deterministic utility layer.
- Current readiness behavior is credible for the TRD-104 demo, but not yet exposed as a reusable engine that future anonymized pilot adapters can call.
- Demo QA verifies the TRD-104 story but does not yet verify an authoritative readiness-engine utility.
- Browser/CDP validation exists as a repeatable artifact but is not part of the root verifier or CI because it requires a running local server and Edge CDP.
- The root app remains static and local-only; live scheduling, ERP/LIMS, identity, backend persistence, and production deployment are intentionally out of scope.

## Prioritized Milestones

### 1. Extract Authoritative Readiness Engine

Acceptance criteria:

- Add a dependency-free UMD utility that evaluates work-order readiness from explicit work order, technician, equipment, pickup, and assignment context.
- The engine must return deterministic status, blockers, warnings, required certs/equipment/clearance, source facts, and explainable reasons.
- The engine must rank coverage candidates by actual constraints and prevent assignment when blockers remain.
- TRD-104 remains Not Ready before approval; Maria Lopez remains the recommended qualified option; approval moves TRD-104 to Ready.
- Add focused Node tests covering missing technician, unavailable technician, missing/expired/expiring certs, equipment/calibration, clearance, pickup risk, cascading impact, no-valid-alternative cases, and Maria Lopez recommendation.

### 2. Wire App And QA Through Engine

Acceptance criteria:

- `index.html` loads the readiness engine before utility consumers and `app.js`.
- `app.js` delegates demo readiness and coverage candidate creation to the engine while preserving current UI behavior.
- Demo QA includes the readiness engine in required utility checks.
- Root verifier, CI paths, README, developer notes, and vNext docs include the new module and tests.

### 3. Validate And Review

Acceptance criteria:

- Focused tests and `node .\scripts\verify-root.mjs` pass.
- Explicit per-test loop passes.
- Browser validation script passes against a local server, including the existing TRD-104/Maria approval and mobile/dark/command checks.
- `git diff --check` and root status review pass with no protected path changes.
- Security, domain/correctness, and UX/accessibility reviews are performed against the changed scope.

### 4. Handoff Documentation

Acceptance criteria:

- `docs/CODEX_EXECUTION_PLAN.md` is current.
- `docs/ENGINEERING_HANDOFF.md` records architecture decisions, changed files, validation evidence, security/reliability work, compatibility notes, and remaining external limitations.
- README and developer notes accurately describe the supported root commands and readiness-engine boundary.

## Decisions And Rationale

- Preserve the static architecture. A framework migration would not improve the root product enough to justify the risk.
- Keep the completed pilot-intake safety work intact and build the next slice around core readiness correctness.
- Prefer a UMD readiness utility over a package/dependency so the app remains dependency-free and testable in the current CI model.
- Treat demo fixtures as inputs to reusable rules rather than baking the TRD-104/Maria story into the engine.

## Completed Work

- Read `AGENTS.md`, `CODEX_TAKEOVER_PROMPT.md`, `MIGRATION_CLEANUP_REPORT.md`, README, developer notes, vNext memory, root scripts/tests, utility modules, and key `app.js` readiness/coverage paths.
- Confirmed protected-path boundaries and clean root worktree.
- Ran baseline root verifier and explicit root test loop successfully.
- Identified the next high-leverage gap: readiness and coverage rules need a deterministic utility boundary.
- Added `readinessEngine.js`, a dependency-free UMD/CommonJS utility for work-order readiness, pickup readiness, schedule summary, and coverage candidate ranking.
- Added `tests/readinessEngine.test.js` for TRD-104/Maria Lopez, missing technician, unavailable technician, certification expiry/warning, equipment absence, pickup risk, no-valid-alternative behavior, and schedule counts.
- Rewired `app.js` compatibility wrappers (`evaluateDemoReadiness`, `evaluateCylinderPickup`, `getDemoCoverageCandidates`) through `CMTReadinessEngine`.
- Updated Demo QA, root verifier, CI paths, browser-validation assertions, README, developer notes, AGENTS map, and vNext memory for the new utility.
- Hardened the browser-validation helper so it can serve the current worktree on an ephemeral local port with a path-containment check.
- Addressed security review findings by escaping user-entered decision notes, decision log fields, readiness/coverage strings, handoff summaries, pickup workflow fields, and coverage-control attributes before rendering.
- Addressed UX/accessibility review findings by deriving the TRD-104 story/action copy from current readiness state, disabling duplicate/non-feasible approvals, exposing no-valid-alternative messaging, tightening Demo QA utility checks, and expanding browser-validation assertions for post-approval copy.
- Updated the browser-validation script to fail clearly when Chrome DevTools Protocol is unavailable and to close its local static server on failure.
- Repaired the live browser-validation timeout by adding labeled CDP operation errors, creating/connecting to a page target whose URL matches the self-served CMTCommand origin, waiting for DOMContentLoaded/load plus `document.readyState`, rendered `#app`, navigation, and required CMTCommand globals before assertions, and replacing animation-frame polling with bounded timer polling that reports DOM diagnostics.

## Current Validation Status

- Baseline verifier: passing.
- Baseline explicit tests: passing.
- Current `node .\scripts\verify-root.mjs`: passing after browser-validator repair.
- Current explicit root `tests/*.test.js` loop: passing after browser-validator repair.
- Current focused checks: `node --check .\readinessEngine.js`, `node .\tests\readinessEngine.test.js`, `node .\tests\demoControlCenter.test.js`, `node --check .\app.js`, `node --check .\demoControlCenter.js`, and `node --check .\docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs` passed.
- `git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoShared.js pilotIntakeSafety.js readinessEngine.js demoControlCenter.js pilotReadinessPack.js demoWalkthrough.js operationalImpact.js operationalCompression.js tests scripts AGENTS.md CODEX_TAKEOVER_PROMPT.md .github docs`: passed with line-ending warnings only.
- Hygiene scans for debug/test-only residue and secrets found no actionable issue; false positives are documentation words such as `secret`/`token` and existing test strings.
- Browser validation: passing in this session against Microsoft Edge CDP at `http://127.0.0.1:9224`. `node .\docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs` self-served CMTCommand on `http://127.0.0.1:51652/?ui=standard`, created its own matching CDP page target, waited for app readiness, passed 72 assertions, and reported `consoleFailureCount: 0` and `networkFailureCount: 0`.
- Build/lint/type-check/package audit: not applicable; no root package system exists.

## Remaining Work

No locally actionable root work remains after the browser-validator repair and validation pass.

## External Blockers

Live integrations, production deployment, authentication, backend persistence, and real customer data remain intentionally out of scope. No browser-validation blocker remains in the current Edge CDP environment.
