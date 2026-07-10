# CMTCommand vNext Status

## Current Phase

Phase 8 - Isolate, verify, and package the vNext release.

Instruction for this phase: create a dedicated branch, stage only the vNext release, prove the staged patch in a clean worktree, commit the self-contained package, and hand off without pushing, publishing, deploying, stashing, resetting, cleaning, or altering unrelated work.

## Selected Slice

Trusted Pilot Intake and Render Safety.

This slice will harden the local Pilot Setup workflow by making CSV import/export, document-upload metadata, and intake preview rendering treat local file-derived values as untrusted text. It is selected because repository evidence shows raw CSV headers, file names, and document notes can reach `innerHTML` rendering, while current tests cover deterministic utility summaries but not the parser/rendering boundary.

## Phase 8 Checklist

- [x] Read durable vNext records, root `AGENTS.md`, active instructions, and root/nested git status.
- [x] Created branch `feat/trusted-pilot-intake-safety` from current `HEAD` while preserving all working-tree changes.
- [x] Classified dirty root files into vNext release content, unrelated/pre-existing work, transient artifacts, and excluded generated browser artifacts.
- [x] Staged only vNext release files.
- [x] Staged mixed `app.js` through an index-only blob containing only Pilot Setup safety hunks; unrelated working-tree hunks remain unstaged.
- [x] Staged only the narrow `styles.css` mobile Pilot Setup topbar/search override; unrelated stylesheet hunks remain unstaged.
- [x] Exported the staged patch with `git diff --cached --binary` and applied it to a detached clean worktree at base `39c326c3aad15e050f29cf4d61a82597e0b5cf77`.
- [x] Ran clean-worktree verification: `node scripts\verify-root.mjs`, browser validation script syntax, `git diff --check`, HTTP smoke, and browser/CDP workflow via a temporary port-only validation copy.
- [x] Preserved all `euchre-platform/` work and unrelated local artifacts outside the index.

## Phase 8 Verification Summary

Passed in clean worktree:

- `node scripts\verify-root.mjs` - exit 0.
- `node --check docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs` - exit 0.
- `git diff --check` - exit 0.
- HTTP smoke against clean worktree on `http://127.0.0.1:8766/index.html` - HTTP 200, length 3114.
- Browser/CDP workflow against clean worktree on `127.0.0.1:8766` with temporary headless Edge CDP on `127.0.0.1:9224` - exit 0, 72 assertions passed, zero console warnings/errors, zero network failures.

Packaging notes:

- Port `8765` was already occupied by a pre-existing Python process and returned a different `index.html` length, so it was not stopped or used for the clean-worktree proof.
- Generated browser JSON/PNG artifacts remain local/transient and are excluded from the packaged release.
- Final local commits and final post-commit status are reported in the Phase 8 handoff, not embedded here, to avoid making the status file depend on its own commit hash.

## Phase 7 Checklist

- [x] Read durable vNext records, active instructions, current git status, and the complete current diff shape.
- [x] Re-ran dependency/lockfile validation; root CMTCommand still has no root package manifest or lockfile.
- [x] Re-ran root syntax checks, deterministic Node tests, and the local CI equivalent through `node scripts\verify-root.mjs`.
- [x] Re-ran tracked whitespace/diff checks and added deterministic trailing-whitespace coverage to `scripts\verify-root.mjs`.
- [x] Re-ran local HTTP startup smoke and browser/CDP workflow validation for Pilot Setup, hostile input, malformed/boundary cases, reload, command/dark mode, Demo QA, and TRD-104 compatibility.
- [x] Ran hygiene scans for conflict markers, debug/test-only residue, and secrets; only expected false-positive wording was found.
- [x] Spawned independent read-only review tracks for correctness, security/trust boundaries, architecture, test adequacy, and product/accessibility/contract behavior.
- [x] Fixed the credible blocking/high findings: pilot request confirmation XSS and browser-validation false-positive passing.
- [x] Fixed low-cost medium/low findings: objective TRD-104 browser smoke, malformed CSV unchanged-history assertion, Work Orders import type sync, blocked malformed-copy text, blocked malformed-summary copy, and CI/local whitespace consistency.
- [x] Reran affected checks after fixes.
- [x] Preserved unrelated root baseline hunks and all `euchre-platform/` work; no nested file was edited.
- [x] Removed temporary Edge PID/profile markers and the disposable browser profile created for validation.
- [x] Updated `verification.md`, created `review.md`, and updated this status file.

## Phase 7 Changed Areas

- `app.js`: escaped the pilot request confirmation sink, preserved selected import type across template preview and CSV upload, rendered visible recent local import history, and changed malformed CSV preview copy so blocked parse errors do not claim staged rows.
- `operationalCompression.js`: returns a blocked parse-error intake summary with accepted rows set to 0 and no "imported" copy when parser errors are present.
- `tests/operationalCompression.test.js`: adds regression coverage for parse-error summary copy.
- `scripts/verify-root.mjs`: added deterministic trailing-whitespace checks before syntax/tests so local and CI verification share the same whitespace gate.
- `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.cjs`: changed the browser workflow artifact from passive observation to assertion-backed validation; added pilot request XSS, import-history unchanged, Work Orders selector, and TRD-104 approval/Decision Log/Pilot Materials/Demo QA/reset checks.
- `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.json` and screenshots: regenerated local evidence from the assertion-backed browser workflow; excluded from the packaged source-control release because they are run-specific artifacts.
- `docs/cmtcommand-vnext/review.md`: new consolidated independent review and resolution record.
- `docs/cmtcommand-vnext/verification.md` and this file: Phase 7 evidence and final handoff status.

## Phase 7 Verification Summary

Passed:

- `node scripts\verify-root.mjs` - exit 0, about 3.2 seconds.
- `node --check docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs` - exit 0.
- `git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js tests\demoControlCenter.test.js pilotIntakeSafety.js tests\pilotIntakeSafety.test.js scripts\verify-root.mjs .github\workflows\root-static-checks.yml AGENTS.md docs\cmtcommand-vnext\plan.md docs\cmtcommand-vnext\status.md docs\cmtcommand-vnext\verification.md docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs` - exit 0 with LF-to-CRLF warnings only.
- `Invoke-WebRequest http://127.0.0.1:8765/index.html` - HTTP 200, length 3107.
- `node docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs` - exit 0, about 7.2 seconds, 72 browser assertions passed, zero console warnings/errors, zero network failures.

Not applicable or empty by repository evidence:

- Dependency/lockfile validation: no root `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, or `npm-shrinkwrap.json`.
- Migration/schema validation: `rg --files src migrations` returned no root files.
- Typecheck/lint/build/package audit: no root package system, transpiler, linter, type config, build command, dependency graph, backend, schema, auth, or product network/subprocess path exists for this static app.

## Phase 7 Review Summary

- Initial independent review found one blocking/high security issue: `state.pilotConfirmation` could render untrusted company text through `innerHTML`. Fixed by escaping the confirmation sink and adding a hostile pilot request browser assertion.
- Initial independent review found one blocking/high test issue: the browser artifact collected values without assertions. Fixed by adding assertion-backed validation and failing exit behavior.
- Initial independent review found medium/low gaps around AC11 TRD-104 objective coverage, malformed CSV unchanged state, Work Orders selector sync, misleading malformed copy, misleading malformed summary/imported copy, and CI whitespace consistency. All were fixed and covered by rerun checks.
- Fresh read-only re-review was requested for security, test adequacy, and product/accessibility/contract behavior after the fixes; final judgments are recorded in `review.md`.

## Phase 7 Final Status

- Acceptance criteria are evidenced in `verification.md`; none are environment-blocked.
- Durable vNext records retained in repository: `charter.md`, `baseline.md`, `plan.md`, `verification.md`, `review.md`, `status.md`, and the reproducible browser validation script under `docs/cmtcommand-vnext/artifacts/`.
- No deployment, push, publish, commit, staging operation, stash, reset, clean, external resource change, dependency install, package-manager change, backend change, schema migration, or `euchre-platform/` edit occurred.

## Phase 6 Checklist

- [x] Read the durable vNext record.
- [x] Inspected current git status and current diff shape.
- [x] Read existing contributor guidance: `README.md` and `DEVELOPER_NOTES.md`.
- [x] Checked for existing root `AGENTS.md`, overrides, package manifests, lockfiles, CI/deployment config, source/migration files, and root tests.
- [x] Confirmed root CMTCommand remains static, package-free, and separate from nested `euchre-platform/`.
- [x] Added concise root `AGENTS.md` with project-specific map, commands, invariants, trust boundaries, compatibility/scope rules, artifact cautions, and done checks.
- [x] Added dependency-free `scripts/verify-root.mjs` as the local verification entry point for syntax checks and deterministic Node tests.
- [x] Added focused `.github/workflows/root-static-checks.yml` to run the same verifier in CI for root static-app changes.
- [x] Reconciled `README.md`, `DEVELOPER_NOTES.md`, `plan.md`, AGENTS, and CI around `node scripts\verify-root.mjs`.
- [x] Ran the local equivalent of the new CI job.
- [x] Documented why no root package manager, browser CI, obsolete-code deletion, or reusable project skill was added.
- [x] Did not touch `euchre-platform/`, add production dependencies, add package scripts, change deployment/external systems, stage, commit, stash, reset, clean, or perform final review.

## Phase 6 Changed Files

- `AGENTS.md`: new root project-specific agent/contributor guide.
- `scripts/verify-root.mjs`: new dependency-free verifier for root syntax checks and deterministic Node tests.
- `.github/workflows/root-static-checks.yml`: new focused CI workflow for root static-app checks.
- `README.md`: documents the verifier, CI workflow, and updated root diff-check command.
- `DEVELOPER_NOTES.md`: documents the verifier as the local and CI entry point.
- `docs/cmtcommand-vnext/plan.md`: adds the verifier as the durable vNext verification entry point while preserving underlying commands.
- `docs/cmtcommand-vnext/verification.md`: records Phase 6 evidence, commands, CI/doc reconciliation, and deferred items.
- `docs/cmtcommand-vnext/status.md`: this Phase 6 status update.

## Phase 6 Verification

Passed:

- `node scripts\verify-root.mjs`
- `git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js tests\demoControlCenter.test.js`
- `git diff --no-index --check -- NUL AGENTS.md`
- `git diff --no-index --check -- NUL scripts\verify-root.mjs`
- `git diff --no-index --check -- NUL .github\workflows\root-static-checks.yml`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\plan.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\status.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\verification.md`

The verifier ran the root `node --check` commands and all deterministic Node tests, including `tests\pilotIntakeSafety.test.js` and `tests\demoControlCenter.test.js`.

Notes:

- Git emitted LF-to-CRLF warnings during diff checks.
- `--no-index` checks returned exit code 1 because each checked untracked file differs from `NUL`; output contained only the same line-ending warnings and no whitespace errors.

## Phase 6 Decision Memo

- Selected slice remains: Trusted Pilot Intake and Render Safety.
- Why these dev-system changes are in scope: the selected release added a new utility, tests, script-load invariant, and trust boundary; future maintenance now has one root verification command plus CI coverage for those files.
- CI/doc inconsistencies corrected: there was no root CI and no root AGENTS guide; repeated individual verification commands now have a shared entry point documented in AGENTS, README, DEVELOPER_NOTES, plan, and CI.
- Major deferred improvement: browser/CDP validation remains a phase artifact, not CI, because it requires a running local server and Edge CDP session.
- Reusable project skill: not added because the repo has no supported in-repo skill convention and the repeated workflow is covered by AGENTS plus `scripts/verify-root.mjs`.
- Remaining acceptance criteria: run final independent review and any final manual TRD-104 walkthrough smoke requested by that phase.

## Phase 5 Checklist

- [x] Read the durable vNext record and inspected current diff shape.
- [x] Ran the actual static app from the existing local server at `http://127.0.0.1:8765/`.
- [x] Used Microsoft Edge headless/CDP to exercise the upgraded Pilot Setup workflow with real DOM events and file-input uploads.
- [x] Checked loading, empty, success, partial-data, malformed, missing-column, oversized, read-error, disabled, recovery, reload, Demo QA, command mode, dark toggle, wide viewport, and 390px viewport states.
- [x] Checked hostile CSV header/cell payloads and hostile document filename/notes payloads for visible text rendering, no executable DOM nodes, and no global XSS flags.
- [x] Checked keyboard focus and basic labels/headings semantics for the affected flow.
- [x] Inspected browser console and network failures.
- [x] Captured JSON and PNG artifacts under `docs/cmtcommand-vnext/artifacts/` as local Phase 5 evidence.
- [x] Fixed selected-scope product defects found during validation.
- [x] Updated `README.md`, `verification.md`, and `status.md`.
- [x] Re-ran root syntax checks, focused/browser validation, and standalone Node tests.
- [x] Did not touch `euchre-platform/`, add dependencies, add package scripts, change schemas/config, stage, commit, stash, reset, clean, deploy, or perform final review.

## Phase 5 Changed Files

Production/user-facing changes:

- `index.html`: adds a static data favicon so realistic browser validation no longer reports a `favicon.ico` 404.
- `styles.css`: adds a later mobile override for `.topbar-actions` and `.search-wrap`, fixing the 390px Pilot Setup search-control height defect found in screenshots.
- `app.js`: renders the existing Demo QA `required-utilities` section so `Pilot Intake Safety utility` is visible in the product, not only computed by the deterministic report.
- `README.md`: adds the user-facing Pilot Setup Intake Flow with local run steps, Ready/Blocked expectations, document metadata behavior, preview cap, and spreadsheet formula-safety note.

Validation/project-memory changes:

- `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.cjs`: repeatable Edge CDP workflow driver.
- `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.json`: exact browser-observed states and outputs, generated locally and not packaged.
- `docs/cmtcommand-vnext/artifacts/phase5-pilot-setup-wide-after.png`: wide viewport screenshot after fixes, generated locally and not packaged.
- `docs/cmtcommand-vnext/artifacts/phase5-pilot-setup-narrow-after.png`: 390px viewport screenshot after fixes, generated locally and not packaged.
- `docs/cmtcommand-vnext/verification.md`: Phase 5 workflow, defects, commands, artifacts, and classification.
- `docs/cmtcommand-vnext/status.md`: this Phase 5 status update.

## Phase 5 Verification

Passed:

- `node docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs`
- `node --check demoShared.js`
- `node --check pilotIntakeSafety.js`
- `node --check demoControlCenter.js`
- `node --check pilotReadinessPack.js`
- `node --check demoWalkthrough.js`
- `node --check operationalImpact.js`
- `node --check operationalCompression.js`
- `node --check app.js`
- `node --check docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs`
- `node tests\demoShared.test.js`
- `node tests\pilotIntakeSafety.test.js`
- `node tests\demoControlCenter.test.js`
- `node tests\pilotReadinessPack.test.js`
- `node tests\demoWalkthrough.test.js`
- `node tests\operationalImpact.test.js`
- `node tests\operationalCompression.test.js`
- `git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js tests\demoControlCenter.test.js`
- `git diff --no-index --check -- NUL pilotIntakeSafety.js`
- `git diff --no-index --check -- NUL tests\pilotIntakeSafety.test.js`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\status.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\verification.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\artifacts\phase5-browser-validation.json`
- HTTP smoke for `http://127.0.0.1:8765/index.html`: `HTTP 200 3107`.
- HTTP smoke for `http://127.0.0.1:8765/pilotIntakeSafety.js`: `HTTP 200 10118`.

Browser artifact highlights:

- Hostile CSV header/cell displayed as text; `unsafeNodes: 0`, `globalCmtXss: false`, `globalFileXss: false`.
- Malformed, missing-column, oversized, and read-error uploads were `Blocked` with Apply Import disabled.
- Partial Work Orders CSV with all required headers but blank required cells was `Needs review` with Apply Import enabled and `Needs review & quotes` preserved.
- Hostile document filename/notes displayed as text; `unsafeNodes: 0`, `globalDocXss: false`.
- Reload cleared staged import/document preview state.
- Demo QA showed `Ready for Demo` and `Pilot Intake Safety utility`.
- Command mode opened Pilot Setup and dark mode toggled.
- Wide 1440px and narrow 390px viewports had no horizontal overflow.
- Browser console and network failure counts were both zero.

Notes:

- Git emitted LF-to-CRLF warnings during diff checks.
- `--no-index` checks returned exit code 1 because each checked untracked file differs from `NUL`; output contained only the same line-ending warnings and no whitespace errors.

## Phase 5 Decision Memo

- Selected slice remains: Trusted Pilot Intake and Render Safety.
- Why this phase passed product validation: the upgraded Pilot Setup workflow now works in the actual static UI with real file-input events, visible Ready/Needs review/Blocked states, safe hostile-input rendering, reload behavior, Demo QA visibility, and responsive screenshots.
- Defects fixed: favicon 404, mobile topbar/search height defect, and non-rendered Demo QA required-utilities section.
- Major remaining risk: final independent review has not started; a manual assistive-technology pass was not performed.
- Remaining acceptance criteria: run final independent review and, if requested in that phase, manually smoke the full TRD-104 walkthrough through Maria approval.

## Phase 4 Checklist

- [x] Read the durable vNext record.
- [x] Re-checked git status and inspected the full tracked diff shape against the original base.
- [x] Re-ran Phase 3 focused checks before hardening edits.
- [x] Threat-modeled the changed Pilot Setup CSV/document workflow and trust boundaries.
- [x] Fixed credible risks inside the selected slice: prototype-style headers, unsafe text-helper tag misuse, oversized pre-read files, FileReader failure handling, stale concurrent reads, and invalid parser limits.
- [x] Strengthened focused tests for prototype-style headers, unsafe text-helper tags, explicit parse errors, and invalid parser limit fallback.
- [x] Measured parser/validation hot-path performance before and after hardening.
- [x] Ran broader applicable root syntax and standalone Node test suites.
- [x] Ran HTTP smoke against the existing local server.
- [x] Attempted targeted in-app browser smoke; classified as environment-blocked after two attach timeouts.
- [x] Updated `DEVELOPER_NOTES.md`, `plan.md`, `verification.md`, and `status.md`.
- [x] Did not touch `euchre-platform/`, add dependencies, add package scripts, change schemas/config, stage, commit, stash, reset, clean, deploy, or perform final review.

## Phase 4 Changed Files

- `pilotIntakeSafety.js`: adds `createErrorParseResult`, prototype-safe row assignment, prototype-free validation maps, safe text tag allowlist, and positive finite parser limit handling.
- `app.js`: adds `intakeImportReadToken`, pre-read file size blocking, FileReader error handling, stale read guards, and safer staged import fallback rows/columns.
- `tests/pilotIntakeSafety.test.js`: adds prototype-header, unsafe-tag, explicit-error, and invalid-limit tests.
- `DEVELOPER_NOTES.md`: documents the bounded CSV preview file-size gate.
- `docs/cmtcommand-vnext/plan.md`: records Phase 4 compatibility, security, rollback, performance, and residual browser verification decisions.
- `docs/cmtcommand-vnext/verification.md`: records Phase 4 threat model, fixes, checks, benchmark, and failure classification.
- `docs/cmtcommand-vnext/status.md`: this Phase 4 status update.

## Phase 4 Verification

Passed:

- `node --check demoShared.js`
- `node --check pilotIntakeSafety.js`
- `node --check demoControlCenter.js`
- `node --check pilotReadinessPack.js`
- `node --check demoWalkthrough.js`
- `node --check operationalImpact.js`
- `node --check operationalCompression.js`
- `node --check app.js`
- `node tests\demoShared.test.js`
- `node tests\pilotIntakeSafety.test.js`
- `node tests\demoControlCenter.test.js`
- `node tests\pilotReadinessPack.test.js`
- `node tests\demoWalkthrough.test.js`
- `node tests\operationalImpact.test.js`
- `node tests\operationalCompression.test.js`
- `git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js tests\demoControlCenter.test.js`
- `git diff --no-index --check -- NUL pilotIntakeSafety.js`
- `git diff --no-index --check -- NUL tests\pilotIntakeSafety.test.js`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\baseline.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\plan.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\status.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\verification.md`
- HTTP smoke for `http://127.0.0.1:8765/index.html`: `HTTP 200 3077`.
- HTTP smoke for `http://127.0.0.1:8765/pilotIntakeSafety.js`: `HTTP 200 10118`.

Benchmark:

- Before hardening: 4,000 rows x 25 parse+validate iterations, 8.14 ms per iteration.
- After hardening: 4,000 rows x 25 parse+validate iterations, 9.93 ms per iteration.
- Decision: no optimization; the local user-triggered path remains bounded and fast enough.

Classified verification limits:

- Environment-blocked: targeted in-app browser smoke timed out while attaching to the browser webview twice.
- Not applicable: npm build/lint/typecheck, backend integration, migration, product subprocess, and product network retry checks.

## Phase 4 Decision Memo

- Selected slice remains: Trusted Pilot Intake and Render Safety.
- Why the hardening is in scope: each fix protects the CSV/document intake boundary added in Phase 3 without broadening into unrelated app security work.
- Major fixed risks: prototype-style CSV headers, unsafe text helper misuse, oversized files read before parser bounds, missing FileReader errors, stale concurrent file reads, and invalid parser size options.
- Major residual risk: live browser DOM/file-upload proof remains blocked by browser attach timeouts and must be retried in the final review or another environment with a working browser surface.
- Remaining acceptance criteria: final independent review, live DOM/file-upload proof, full TRD-104 smoke, and affected mobile/dark/command visual checks.

## Phase 3 Checklist

- [x] Read `charter.md`, `plan.md`, `status.md`, and active instructions.
- [x] Confirmed `baseline.md` and `verification.md` status; `baseline.md` was created because it was missing.
- [x] Re-checked root git status and relevant nested status before editing.
- [x] Recorded baseline diffs for pre-existing root `app.js` and `styles.css` changes in `baseline.md`.
- [x] Verified the plan against the Phase 3 preflight amendment and amended `plan.md` before implementation.
- [x] Kept current working tree; did not prove or switch to another worktree.
- [x] Did not stash, reset, clean, commit, reformat, or alter unrelated work.
- [x] Added the new UMD safety utility without dependencies or package changes.
- [x] Wired Pilot Setup CSV parsing/export/validation and affected render sinks to the utility.
- [x] Added focused automated coverage for valid input, hostile input, malformed input, boundary cases, export safety, UMD export, load order, and Demo QA utility checks.
- [x] Ran focused syntax, test, diff, and HTTP smoke checks.
- [x] Updated `README.md`, `DEVELOPER_NOTES.md`, `status.md`, and `verification.md`.
- [x] Inspected per-file diff and separated vNext hunks from preserved baseline hunks.
- [x] Stop after this Phase 3 implementation report.

## Phase 3 Changed Files

Implementation:

- `pilotIntakeSafety.js`: new UMD safety utility with CommonJS export and browser global `CMTPilotIntakeSafety`.
- `index.html`: loads `pilotIntakeSafety.js` before utility consumers and `app.js`.
- `app.js`: uses the new utility for Pilot Setup CSV parsing, validation, export serialization, formula-safe CSV cells, generated `blob:` URL validation, document metadata normalization, import blocking, and post-render `textContent` hydration of intake preview/document sinks.
- `demoControlCenter.js`: adds Pilot Intake Safety to required utility checks.
- `tests/pilotIntakeSafety.test.js`: new parser, validation, sink, URL policy, UMD, load-order, and hostile-input tests.
- `tests/demoControlCenter.test.js`: updated required-utility fixture and failure assertion.
- `README.md` and `DEVELOPER_NOTES.md`: document the new utility, load order, safety rules, and checks.

Project-memory docs:

- `docs/cmtcommand-vnext/baseline.md`: Phase 3 baseline record.
- `docs/cmtcommand-vnext/plan.md`: Phase 3 preflight amendments.
- `docs/cmtcommand-vnext/status.md`: Phase 3 status.
- `docs/cmtcommand-vnext/verification.md`: Phase 3 verification record.

## Phase 3 Verification

Passed:

- `node --check demoShared.js`
- `node --check pilotIntakeSafety.js`
- `node --check demoControlCenter.js`
- `node --check app.js`
- `node tests\demoShared.test.js`
- `node tests\pilotIntakeSafety.test.js`
- `node tests\demoControlCenter.test.js`
- `node tests\pilotReadinessPack.test.js`
- `node tests\demoWalkthrough.test.js`
- `node tests\operationalImpact.test.js`
- `node tests\operationalCompression.test.js`
- `git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js tests\demoControlCenter.test.js`
- `git diff --no-index --check -- NUL pilotIntakeSafety.js`
- `git diff --no-index --check -- NUL tests\pilotIntakeSafety.test.js`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\baseline.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\plan.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\status.md`
- `git diff --no-index --check -- NUL docs\cmtcommand-vnext\verification.md`
- HTTP smoke for `http://127.0.0.1:8765/index.html`: `HTTP 200`.
- HTTP smoke for `http://127.0.0.1:8765/pilotIntakeSafety.js`: `HTTP 200`.

Notes:

- Git emitted LF-to-CRLF working-copy warnings during diff checks.
- The first run of `node tests\pilotIntakeSafety.test.js` before adding `pilotIntakeSafety.js` failed with `Cannot find module '../pilotIntakeSafety.js'`, as expected for old behavior.
- There is no root `package.json`, so no npm build/lint/typecheck command exists for this root static app.

## Phase 3 Diff Ownership

vNext hunks:

- `app.js`: `getPilotIntakeSafety`, `renderCopyButton` label escaping, `render()` safe-sink hydration call, Pilot Setup `csvEscape`/`rowsToCsv`/`parseCsv`/`validateImport`, import preview placeholders, warning/table hydration, document metadata placeholders, CSV download URL policy, blocked Apply Import handling, and document record normalization.
- `index.html`, `demoControlCenter.js`, `tests/`, `README.md`, `DEVELOPER_NOTES.md`, and `docs/cmtcommand-vnext/` changes listed above.

Preserved baseline hunks:

- `styles.css` remains entirely pre-existing dirty work for this phase.
- Non-intake `app.js` copy/UI changes that appear in the full diff were already present before Phase 3 and were not replaced wholesale.
- Nested `euchre-platform/` changes and untracked local artifacts remain untouched.

## Phase 3 Remaining Acceptance Criteria

Core implementation criteria covered by deterministic tests and app wiring:

- Hostile CSV markup/event/SVG/image-style strings are parsed and exposed as text data.
- Preview/document sinks use `textContent` or explicit DOM-node construction for untrusted intake values.
- Missing-column and malformed CSV imports are blocked from applying.
- Duplicate headers and rows are warned.
- Formula-leading CSV export cells are neutralized.
- Valid quotes, ampersands, whitespace, newlines, and Unicode are preserved.
- Demo QA detects the intake safety utility.

Deferred to later final-review/hardening phase:

- Browser DOM proof with real file-upload interaction that hostile CSV/document payloads create no executable DOM nodes.
- Full TRD-104 guided workflow smoke after final review.
- Mobile/dark/command visual inspection of affected Pilot Setup screens.

## Phase 3 Decision Memo

- Selected slice implemented: Trusted Pilot Intake and Render Safety.
- Why it still wins: it improves the Pilot Setup workflow, removes the identified local input/rendering failure mode at the sinks, and adds deterministic tests around a cohesive utility boundary without dependency, backend, package, or migration risk.
- Expected changed areas actually touched: new UMD intake utility, `index.html`, Pilot Setup and safe-copy portions of `app.js`, Demo QA required utility checks, focused tests, README/developer notes, and vNext docs.
- Major risk: full `app.js` diff still contains pre-existing unrelated copy/UI hunks; final review must evaluate only the vNext hunks unless the user scopes those baseline changes in.
- Exact acceptance criteria for Phase 3 pass/fail: `tests/pilotIntakeSafety.test.js` and `tests/demoControlCenter.test.js` pass; `app.js` syntax passes; malformed or missing-column imports set `validation.blocked` and disable Apply Import; untrusted CSV/document preview fields are hydrated through `textContent`; generated CSV export cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return receive a leading apostrophe; `index.html` loads `pilotIntakeSafety.js` before `demoControlCenter.js` and `app.js`; no `euchre-platform/`, backend, dependency, schema, package-manager, stash/reset/commit, or unrelated file operation occurs.

## Phase 2 Checklist

- [x] Inspected current git status at phase start.
- [x] Read existing project memory in `docs/cmtcommand-vnext/`.
- [x] Confirmed `plan.md`, `baseline.md`, `verification.md`, and `review.md` did not already exist.
- [x] Checked for active `AGENTS.md` and `AGENTS.override.md` files.
- [x] Re-read root `README.md`, `DEVELOPER_NOTES.md`, `.gitignore`, and `index.html`.
- [x] Checked root manifests, lockfiles, CI/deployment config, schemas/migrations, and source directories.
- [x] Inspected relevant root tests and utility modules.
- [x] Used two read-only explorer subagents for independent audits; no subagent edited files.
- [x] Generated four coherent release-slice candidates.
- [x] Selected Trusted Pilot Intake and Render Safety.
- [x] Wrote `docs/cmtcommand-vnext/plan.md`.
- [x] Updated `docs/cmtcommand-vnext/status.md`.
- [x] Did not modify production code.
- [x] Stop after this Phase 2 report.

## Phase 2 Decision Memo

- Selected slice: Trusted Pilot Intake and Render Safety.
- Why it wins: it improves the buyer-to-pilot setup workflow, removes a concrete local input/rendering failure mode, centralizes currently private parser/export safety rules, and can be proven with focused unit tests plus browser smoke without a dependency, backend, or migration.
- Expected changed areas in a later implementation phase: new root UMD intake safety utility, `index.html` script order, Pilot Setup helpers in `app.js`, Demo QA utility checks in `demoControlCenter.js`, focused tests, README/developer notes, and vNext verification/review docs.
- Major risk: `app.js` is large and already has pre-existing user edits, so later implementation must patch narrowly and preserve current root `app.js`/`styles.css` changes.
- Exact acceptance criteria: the twelve observable criteria in `docs/cmtcommand-vnext/plan.md`, including safe rendering of malicious CSV headers and document metadata, blocked malformed/missing-column imports, formula-safe CSV export cells, preserved quoted CSV behavior, Demo QA utility coverage, and no backend/dependency/`euchre-platform/` changes.

## Phase 2 Evidence Re-Checked

- `git status --short --branch`: current branch remains `master`; dirty worktree still includes pre-existing modified root `app.js` and `styles.css`, many modified/untracked `euchre-platform/` files, untracked local artifacts, and the untracked `docs/` project-memory folder.
- `git worktree list --porcelain`: current worktree is `C:/Users/Surface i7/Documents/CMT Command Center`, HEAD `39c326c3aad15e050f29cf4d61a82597e0b5cf77`, branch `refs/heads/master`.
- `rg --files -g "AGENTS.md" -g "AGENTS.override.md"`: no repository agent instruction files found.
- Root package/lock/config check: no root `package.json`, lockfile, `.github`, `vercel.json`, `netlify.toml`, `wrangler.toml`, Dockerfile, or package-managed test/build config found.
- Root `src/` and `migrations/`: directories exist but contain no files.
- Root app architecture remains static UMD utility scripts plus `app.js` rendering into `#app`.
- `app.js` evidence for selected slice: `innerHTML` render at `app.js:4322`, private CSV parsing at `app.js:6611`, raw CSV header render at `app.js:6781`, raw document metadata render at `app.js:6827` and `app.js:6836`, and FileReader import flow at `app.js:7199`.

## Phase 2 Candidate Slices Considered

- Trusted Pilot Intake and Render Safety.
- TRD-104 Guided Buyer Story Hardening.
- Demo QA and Local Reset Gate.
- Operational Impact Proof Pack.

## Phase Checklist

- [x] Inspected current git status before editing.
- [x] Checked worktree and branch information.
- [x] Checked for `AGENTS.md` and `AGENTS.override.md`.
- [x] Read root `README.md`.
- [x] Read root `DEVELOPER_NOTES.md`.
- [x] Read root `.gitignore`.
- [x] Read root `index.html`.
- [x] Inspected root test surface.
- [x] Confirmed `docs/cmtcommand-vnext/` did not exist before initialization.
- [x] Created `docs/cmtcommand-vnext/charter.md`.
- [x] Created `docs/cmtcommand-vnext/status.md`.
- [x] Stop after this initialization report.

## Repository Evidence Inspected

- `git status --short --branch`: current branch is `master`; worktree was dirty before initialization.
- `git worktree list --porcelain`: current worktree is `C:/Users/Surface i7/Documents/CMT Command Center`, HEAD `39c326c3aad15e050f29cf4d61a82597e0b5cf77`, branch `refs/heads/master`.
- `rg --files -g "AGENTS.md" -g "AGENTS.override.md"`: no repository agent instruction files found.
- Root `README.md`: static CMTCommand demo, local server command, main demo path, important files, verification commands, visual modes, local state, out-of-scope items, and known limitations.
- Root `DEVELOPER_NOTES.md`: architecture, script load order, module responsibilities, localStorage keys, TRD-104 scenario, Pilot Story Mode targets, Demo QA structure, copy behavior, source details, test commands, browser smoke checklist, and safe future scenario guidance.
- Root `.gitignore`: ignores `brackethub/` and `brackethub/**`.
- Root `index.html`: static shell loading CSS, app structure, and utility scripts before `app.js`.
- Root tests: `tests/demoShared.test.js`, `tests/demoControlCenter.test.js`, `tests/pilotReadinessPack.test.js`, `tests/demoWalkthrough.test.js`, `tests/operationalImpact.test.js`, and `tests/operationalCompression.test.js`.
- `rg --files src migrations`: no root tracked files found under `src/` or `migrations/`.
- `git ls-files`: confirmed tracked root app files and tracked nested `euchre-platform/` files exist in the same repository.

## Dirty Worktree At Phase Start

These changes existed before initialization and are treated as unrelated user work unless a later phase explicitly scopes them in.

Modified root CMTCommand files:

- `app.js`
- `styles.css`

Modified nested `euchre-platform/` files:

- `euchre-platform/.gitignore`
- `euchre-platform/README.md`
- `euchre-platform/eslint.config.mjs`
- `euchre-platform/package.json`
- `euchre-platform/src/app/globals.css`
- `euchre-platform/src/app/page.tsx`
- `euchre-platform/src/lib/euchre/engine.ts`
- `euchre-platform/src/lib/euchre/index.ts`
- `euchre-platform/src/lib/euchre/rules.test.ts`
- `euchre-platform/src/lib/euchre/rules.ts`
- `euchre-platform/src/lib/euchre/table-view.test.ts`
- `euchre-platform/src/lib/euchre/table-view.ts`

Untracked root artifacts and local files:

- `.pnpm-store/`
- `CMTCommand-20260617-091149.zip`
- `CMTCommand-app-only-20260617-091428.zip`
- `CMTCommand-demo-release-20260623.zip`
- `CMTCommand-demo-release-20260623/`
- `CMTCommand_Product_Planning_Workbook.xlsx`
- `Competitor Research.xlsx`
- `cmtcommand-readiness-demo-workflow.png`
- `cmtcommand-tomorrow-readiness-desktop.png`
- `cmtcommand-tomorrow-readiness-home.png`
- `demo-outreach-script.md`
- `outreach-tracker.csv`
- `server-8765.err`
- `server-8765.out`

Untracked nested `euchre-platform/` work:

- `euchre-platform/scripts/`
- `euchre-platform/server-3002.err.log`
- `euchre-platform/server-3002.log`
- `euchre-platform/server-3002.out.log`
- `euchre-platform/src/lib/euchre/bidding-timeline.test.ts`
- `euchre-platform/src/lib/euchre/bidding-timeline.ts`
- `euchre-platform/src/lib/euchre/bot-policies.test.ts`
- `euchre-platform/src/lib/euchre/bot-policies.ts`
- `euchre-platform/src/lib/euchre/intermediate-bot.ts`
- `euchre-platform/src/lib/euchre/sim/`
- `euchre-platform/src/lib/euchre/simulator.test.ts`
- `euchre-platform/src/lib/euchre/simulator.ts`
- `euchre-platform/src/lib/euchre/trick-animation.test.ts`
- `euchre-platform/src/lib/euchre/trick-animation.ts`

## Decisions

- Initialization did not select a vNext release slice.
- Initialization did not change product code.
- Initialization did not stage, commit, reset, push, deploy, publish, or alter external resources.
- Future phases should treat root CMTCommand as the default product under evaluation unless repository evidence and the user-approved phase scope say otherwise.
- Future phases must continue protecting the nested `euchre-platform/` work and untracked artifacts from unrelated edits or staging.

## Assumptions

- The root static CMTCommand app is the target for the vNext release-candidate effort.
- The dirty worktree entries listed above were user-created or pre-existing.
- The lack of root `package.json` means the documented Node file checks and root test files are the current verification baseline unless a later phase justifies adding tooling.

## Blockers

None for initialization.

## Next Phase

Await the user's next phase instruction. Expected next work is likely a baseline phase, where `baseline.md` should be created from current repository evidence without selecting or implementing the vNext release slice unless the user explicitly names that phase.
