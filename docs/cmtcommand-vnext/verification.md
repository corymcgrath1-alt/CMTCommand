# CMTCommand vNext Verification

## Phase 8 - Isolated Release Packaging

Date: 2026-07-10

Branch: `feat/trusted-pilot-intake-safety`.

Base HEAD used for clean-worktree proof: `39c326c3aad15e050f29cf4d61a82597e0b5cf77`.

### Staged Release Boundary

Included as vNext release content:

- Pilot intake/render safety: `pilotIntakeSafety.js`, selected `app.js` Pilot Setup hunks, selected `styles.css` mobile Pilot Setup topbar/search hunk, `index.html`, `operationalCompression.js`, `demoControlCenter.js`.
- Tests and deterministic validation: `tests/pilotIntakeSafety.test.js`, `tests/demoControlCenter.test.js`, `tests/operationalCompression.test.js`, `scripts/verify-root.mjs`, `.github/workflows/root-static-checks.yml`.
- Durable docs/guidance: `README.md`, `DEVELOPER_NOTES.md`, `AGENTS.md`, `docs/cmtcommand-vnext/{charter,baseline,plan,status,verification,review}.md`, `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.cjs`.

Excluded from the release package:

- Unrelated/pre-existing root hunks in `app.js` and `styles.css`.
- All `euchre-platform/` modified and untracked files.
- `.pnpm-store/`, ZIP exports, workbooks, root screenshots, outreach notes/CSV, server logs, and other local artifacts.
- Generated browser evidence files: `docs/cmtcommand-vnext/artifacts/*.json` and `docs/cmtcommand-vnext/artifacts/*.png`.

### Clean-Worktree Proof

Patch export and application:

```powershell
git worktree add --detach $env:TEMP\cmtcommand-phase8-clean HEAD
git diff --cached --binary --output=$env:TEMP\cmtcommand-phase8-staged.patch
git -c safe.directory=$env:TEMP\cmtcommand-phase8-clean -C $env:TEMP\cmtcommand-phase8-clean apply --check $env:TEMP\cmtcommand-phase8-staged.patch
git -c safe.directory=$env:TEMP\cmtcommand-phase8-clean -C $env:TEMP\cmtcommand-phase8-clean apply --binary $env:TEMP\cmtcommand-phase8-staged.patch
```

Result: patch applied cleanly to a detached worktree at `39c326c3aad15e050f29cf4d61a82597e0b5cf77`.

Clean-worktree root verifier:

```powershell
Push-Location $env:TEMP\cmtcommand-phase8-clean
node scripts\verify-root.mjs
Pop-Location
```

Result: exit 0. All syntax checks and deterministic Node tests passed, ending with `Root static verification passed.`

Browser validation script syntax:

```powershell
node --check docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs
```

Result: exit 0 in the clean worktree.

Clean-worktree diff hygiene:

```powershell
git -c safe.directory=$env:TEMP\cmtcommand-phase8-clean -C $env:TEMP\cmtcommand-phase8-clean diff --check
```

Result: exit 0.

HTTP smoke:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8766/index.html -UseBasicParsing -TimeoutSec 5
```

Result: HTTP 200, length 3114, served from the clean worktree. Port `8765` was already occupied by a pre-existing Python process and returned length 3107, so it was not used for the clean-worktree proof and was not stopped.

Browser/CDP workflow:

```powershell
# Temporary validation copy changed only 127.0.0.1:8765 to 127.0.0.1:8766
node --check $env:TEMP\cmtcommand-phase8-browser-validation-8766.cjs
node $env:TEMP\cmtcommand-phase8-browser-validation-8766.cjs
```

Result: exit 0 against clean-worktree HTTP server on `127.0.0.1:8766` and temporary headless Edge CDP on `127.0.0.1:9224` (`Edg/150.0.4078.48`). The run passed 72 assertions with `consoleFailureCount: 0` and `networkFailureCount: 0`.

## Phase 7 - Full Verification And Release Handoff

Date: 2026-07-10

Selected slice: Trusted Pilot Intake and Render Safety.

### Final Changed Files In Scope

- `pilotIntakeSafety.js`, `index.html`, `app.js`, `operationalCompression.js`, `demoControlCenter.js`.
- `tests/pilotIntakeSafety.test.js`, `tests/demoControlCenter.test.js`, `tests/operationalCompression.test.js`.
- `README.md`, `DEVELOPER_NOTES.md`, `AGENTS.md`, `scripts/verify-root.mjs`, `.github/workflows/root-static-checks.yml`.
- `docs/cmtcommand-vnext/{charter,baseline,plan,status,verification,review}.md`.
- `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.cjs`.

Generated browser JSON and PNG screenshots from Phase 5/7 remain local evidence and are intentionally excluded from the packaged source-control release because they include run-specific paths, timestamps, and pixels. The committed `.cjs` script can regenerate them.

Preserved out of scope: all dirty `euchre-platform/` files and unrelated local artifacts remain untouched.

### Verification Matrix

Dependency and lockfile validation:

```powershell
if (Test-Path package.json) { Get-Content package.json -TotalCount 80 } else { 'NO_ROOT_PACKAGE_JSON' }
Get-ChildItem -Name pnpm-lock.yaml,package-lock.json,yarn.lock,npm-shrinkwrap.json -ErrorAction SilentlyContinue
```

Result: exit 1 from the empty lockfile glob, expected output `NO_ROOT_PACKAGE_JSON`; no root package manifest or lockfile exists.

Build, compilation, unit, and local CI equivalent:

```powershell
node scripts\verify-root.mjs
```

Result: exit 0, about 7.0 seconds after final fixes. It ran trailing-whitespace checks, `node --check` for root scripts, and all deterministic Node tests. Explicit passing output included `pilotIntakeSafety tests passed`, `pilotReadinessPack tests passed`, `demoWalkthrough tests passed`, `operationalImpact tests passed`, and `operationalCompression tests passed`.

Browser artifact syntax:

```powershell
node --check docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs
```

Result: exit 0.

Formatting/diff hygiene:

```powershell
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js operationalCompression.js tests\demoControlCenter.test.js tests\operationalCompression.test.js pilotIntakeSafety.js tests\pilotIntakeSafety.test.js scripts\verify-root.mjs .github\workflows\root-static-checks.yml AGENTS.md docs\cmtcommand-vnext\plan.md docs\cmtcommand-vnext\status.md docs\cmtcommand-vnext\verification.md docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs
```

Result: exit 0 with LF-to-CRLF warnings only.

Real app startup:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8765/index.html -UseBasicParsing -TimeoutSec 2
```

Result: exit 0, HTTP 200, length 3107.

Real browser workflow:

```powershell
node docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs
```

Result: exit 0, about 7.2 seconds. The script controlled a disposable headless Edge CDP session against `http://127.0.0.1:8765/`, wrote the JSON/PNG artifacts, and passed 72 assertions with 0 failed assertions, 0 console warnings/errors, and 0 network failures.

The browser workflow covered:

- Pilot Setup empty, success, blocked, warning, reload, keyboard/focus, wide viewport, narrow viewport, command mode, dark mode, and command+dark mobile states.
- Hostile CSV header/cell text, valid hostile row values, image/SVG/event-handler payloads, `javascript:` text, malformed unmatched quotes, missing and multiple missing columns, partial data cleanup, oversized input, FileReader error/recovery, document filename/notes markup, and hostile pilot request confirmation.
- Import type sync, local import history, reload-cleared transient import/history/document state, persisted appearance/theme preferences, Demo QA utility row pass, TRD-104 Maria Lopez approval, Decision Log, Operational Impact, Pilot Materials, and Full Demo Reset.

Security/dependency scan:

```powershell
rg -n "<<<<<<<|=======|>>>>>>>|debugger|\.only\(|\.skip\(|TODO vNext|TEMP|HACK" app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js operationalCompression.js pilotIntakeSafety.js scripts\verify-root.mjs tests docs\cmtcommand-vnext AGENTS.md .github\workflows\root-static-checks.yml
rg -n "api[_-]?key|secret|password|token|credential|Bearer [A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE) KEY" app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js operationalCompression.js pilotIntakeSafety.js scripts\verify-root.mjs tests docs\cmtcommand-vnext AGENTS.md .github\workflows\root-static-checks.yml
```

Result: debug/conflict scan exit 1 with no matches. Secret scan exit 0 with expected false positives only: documentation uses of `secret(s)`/`credential(s)`, app copy about field credentials, and the existing `token savings` banned-term test string.

Migration/schema/rollback checks:

```powershell
rg --files src migrations
```

Result: exit 1 with no files. No root schema, migration, backend, persistent data conversion, or product dependency was added. Rollback remains file-level: revert the utility, script tag, app wiring, copy-summary change, tests, docs, and CI/dev-system additions.

Performance comparison:

- Phase 4 controlled sample: 4,000-row parse+validate, 25 iterations; baseline median-equivalent sample recorded 8.14 ms/iteration and final 9.93 ms/iteration.
- Phase 7 rerun on a busier machine: samples per iteration `[18.11, 14.58, 31.8, 27.97, 30.24]`, median 27.97 ms/iteration, max 31.8 ms/iteration. No optimization was applied because the workflow remains bounded at 200,000 CSV characters and no hot-path regression affected user-perceived local preview behavior.

### Failure Classification

- Fixed: pilot request confirmation XSS; browser validation false-positive passing; missing AC11 TRD-104 objective smoke; malformed CSV unchanged-history assertion; Work Orders preview/upload selector mismatch; malformed parse copy claiming staged/imported rows; CI/local whitespace inconsistency.
- Verified pre-existing/unrelated: dirty `euchre-platform/` changes and unrelated local artifacts listed by `git status`.
- Environment-blocked: none for acceptance criteria. Browser workflow ran successfully after starting disposable Edge CDP. Process command-line inspection for cleanup was access-denied by Windows, but the exact temp profile was removed on retry.
- Not applicable: root package audit, package build, package lint/typecheck, backend/API/service checks, auth, network retry behavior, command execution boundaries, and schema migration checks.

### Acceptance Criteria Evidence

All 16 acceptance criteria in `plan.md` are evidenced. Key final artifact fields:

- Hostile CSV: `unsafeNodes: 0`, globals false, header and cell text preserved.
- Valid hostile values: badge `Ready`, `unsafeNodes: 0`, `javascript:alert(1)` preserved as text.
- Malformed CSV: badge `Blocked`, Apply disabled, history unchanged, no staged/imported copy, copy button `Copy Parse Error`.
- Document metadata and pilot request confirmation: unsafe nodes 0, execution globals false, hostile text preserved.
- Reload and compatibility: transient preview/document/history cleared; UI mode/theme persist; TRD-104/Maria/Decision Log/Pilot Materials/Demo QA/Full Demo Reset pass.

## Phase 3 - Core Implementation

Date: 2026-07-10

Selected slice: Trusted Pilot Intake and Render Safety.

## Changed Files

vNext implementation files:

- `pilotIntakeSafety.js`: new dependency-free UMD utility for CSV parsing, import validation, CSV serialization, formula neutralization, text-sink helpers, document metadata normalization, and URL protocol checks.
- `index.html`: loads `pilotIntakeSafety.js` before the other deterministic utilities and before `app.js`.
- `app.js`: wires Pilot Setup CSV parsing/export/validation to the utility, hydrates untrusted intake preview and document metadata through `textContent`, blocks malformed or missing-column imports, validates generated `blob:` download URLs, and escapes copy button labels.
- `demoControlCenter.js`: adds Pilot Intake Safety to required utility checks.
- `tests/pilotIntakeSafety.test.js`: covers parser, validation, hostile input, UMD export, load order, text-sink helper, oversized input, formula-safe CSV export, and URL policy behavior.
- `tests/demoControlCenter.test.js`: includes the new utility in the passing context and asserts the required-utility failure case.
- `README.md`: documents the new utility and verification command.
- `DEVELOPER_NOTES.md`: documents load order, module responsibility, Pilot Setup intake safety rules, and verification command.

vNext planning/status files:

- `docs/cmtcommand-vnext/baseline.md`: records Phase 3 preflight status and baseline diffs for pre-existing `app.js` and `styles.css` changes.
- `docs/cmtcommand-vnext/plan.md`: amended before implementation to enumerate Pilot Setup fields/sinks, sink-safe rendering policy, UMD/load-order rationale, text fidelity, URL policy, and deterministic test requirements.
- `docs/cmtcommand-vnext/status.md`: updated with Phase 3 checklist and decision record.
- `docs/cmtcommand-vnext/verification.md`: this verification record.

Preserved pre-existing dirty files:

- Root `styles.css` remains modified from the baseline and was not edited for Phase 3.
- Root `app.js` already had unrelated copy/UI hunks before Phase 3; the vNext hunks are limited to intake safety wiring, `renderCopyButton` label escaping, and render hydration.
- Nested `euchre-platform/` modified and untracked files remain untouched.

## Commands And Results

Baseline/evidence commands:

```powershell
git status --short --branch
git status --porcelain=v1 -uall
git -C euchre-platform status --short --branch
git diff --stat -- app.js styles.css
git diff --numstat -- app.js styles.css
git diff --unified=0 -- app.js
git diff --unified=0 -- styles.css
```

Result: current branch is `master`; the root and nested working tree were dirty before Phase 3 edits. Baseline `app.js` and `styles.css` diffs were recorded in `baseline.md`. No stash, reset, clean, commit, reformat, or nested-repo edit was performed.

Expected old-behavior failure:

```powershell
node tests\pilotIntakeSafety.test.js
```

Result before adding `pilotIntakeSafety.js`: failed with `Cannot find module '../pilotIntakeSafety.js'`, confirming the new focused test did not pass against the old behavior.

Focused syntax checks:

```powershell
node --check demoShared.js
node --check pilotIntakeSafety.js
node --check demoControlCenter.js
node --check app.js
```

Result: pass.

Focused standalone tests:

```powershell
node tests\demoShared.test.js
node tests\pilotIntakeSafety.test.js
node tests\demoControlCenter.test.js
node tests\pilotReadinessPack.test.js
node tests\demoWalkthrough.test.js
node tests\operationalImpact.test.js
node tests\operationalCompression.test.js
```

Result: pass. Tests with explicit success output reported:

- `pilotIntakeSafety tests passed`
- `pilotReadinessPack tests passed`
- `demoWalkthrough tests passed`
- `operationalImpact tests passed`
- `operationalCompression tests passed`

Diff checks:

```powershell
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js pilotIntakeSafety.js tests\pilotIntakeSafety.test.js tests\demoControlCenter.test.js docs\cmtcommand-vnext\baseline.md docs\cmtcommand-vnext\plan.md docs\cmtcommand-vnext\status.md docs\cmtcommand-vnext\verification.md
git diff --no-index --check -- NUL pilotIntakeSafety.js
git diff --no-index --check -- NUL tests\pilotIntakeSafety.test.js
git diff --no-index --check -- NUL docs\cmtcommand-vnext\baseline.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\plan.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\status.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\verification.md
```

Result: no whitespace errors reported. Git emitted LF-to-CRLF working-copy warnings. `--no-index` returned exit code 1 because the checked files differ from `NUL`, with only the same line-ending warnings.

HTTP smoke against existing local server:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/index.html -TimeoutSec 3
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/pilotIntakeSafety.js -TimeoutSec 3
```

Result: both returned `HTTP 200`.

## Acceptance Criteria Status

- CSV hostile header/cell rendered as text: covered by `pilotIntakeSafety` text-sink and parse tests; app uses DOM hydration for preview headers and cells.
- Document file metadata rendered as text: app renders placeholders and hydrates `data-document-field` elements with `textContent`.
- Malformed CSV blocked: covered by unmatched-quote test and app disabled Apply Import state.
- Missing required columns blocked: covered by validation test and app disabled Apply Import state.
- Blank required fields produce warnings: covered by validation row-warning test and app warning hydration.
- Duplicate headers disambiguated: covered by duplicate-header test.
- Duplicate rows warn: covered by duplicate-row validation test.
- Formula-like CSV export neutralized: covered by rows-to-CSV test.
- Quotes, ampersands, whitespace, newlines, and Unicode preserved: covered by valid quoted CSV and hostile-text tests.
- Demo QA utility coverage: covered by `tests/demoControlCenter.test.js`.
- No dependency, backend, config, schema, package manager, or `euchre-platform/` change: verified by diff/status inspection.

## Remaining Verification For Later Phases

- Browser DOM execution proof that hostile CSV/document payloads do not create `img`, `svg`, `script`, or event-handler nodes in the live app.
- Manual or browser-automated Pilot Setup flow with file upload interactions.
- Full TRD-104 guided flow smoke after final review.
- Mobile viewport and dark/command visual review for affected Pilot Setup surfaces.

## Phase 4 - Hardening

Date: 2026-07-10

Scope: Trusted Pilot Intake and Render Safety only.

## Threat And Failure Model

Changed trust boundaries inspected:

- CSV bytes and file metadata entering through `FileReader`.
- CSV headers and row cells converted into object keys and preview text.
- Validation warnings derived from user-controlled headers/fields.
- Import preview table and warning DOM sinks.
- Document upload metadata and notes DOM sinks.
- Generated CSV download URL and `download` filename assignment.
- UMD browser global and CommonJS test export.

Not applicable in this static local slice:

- Authorization/ownership checks: no login, backend, account data, or remote resource ownership.
- Path traversal: file names are never used as filesystem paths.
- Unsafe subprocess/environment handling: no subprocesses are called by product code.
- Network timeout/retry behavior: no product network request is introduced.
- Secrets: no credentials, tokens, env vars, or external APIs are added.
- Migration/schema: no persisted schema or config migration exists.

## Issues Fixed

1. Prototype-style CSV headers could collide with normal object/dictionary behavior.
   - Fix: internal header counters and canonical-column maps use prototype-free dictionaries, and parsed row assignment uses explicit data properties.
   - Evidence: `tests\pilotIntakeSafety.test.js` covers `__proto__`, `constructor`, and `toString` headers without object prototype pollution.

2. The public text helper could be misused to construct non-text elements.
   - Fix: `appendTextElement` now allows only known text-container tags used by the app and rejects tags such as `script`.
   - Evidence: `tests\pilotIntakeSafety.test.js` asserts `script` is rejected.

3. Oversized CSV files were bounded inside the parser but still read into memory first by `FileReader`.
   - Fix: `app.js` checks `file.size > CMTPilotIntakeSafety.MAX_CSV_CHARACTERS` before `readAsText` and stages a blocked parse result.
   - Evidence: `app.js` diff inspection plus parser oversized-input tests.

4. File read failures and stale concurrent reads were not handled.
   - Fix: FileReader `onerror` and `readAsText` throw paths now stage blocked parse results; success/error handlers check an `intakeImportReadToken` so older reads cannot overwrite a newer preview.
   - Evidence: `app.js` diff inspection and `node --check app.js`.

5. Invalid parser size options could disable the parser cap.
   - Fix: parser uses the default max when `options.maxCharacters` is not a positive finite number.
   - Evidence: `tests\pilotIntakeSafety.test.js` covers a non-numeric limit.

## Performance Measurement

Benchmark command:

```powershell
node -e "const safety=require('./pilotIntakeSafety.js'); const rows=Array.from({length:4000},(_,i)=>['TRD-'+i,'Project '+i,'Concrete','Notes '+i].join(',')).join('\n'); const csv='work_order,project,service_type,notes\n'+rows; const start=performance.now(); for(let i=0;i<25;i++) safety.validateImport({label:'Work Orders',requiredColumns:['work_order','project','service_type']}, safety.parseCsv(csv)); const elapsed=performance.now()-start; console.log(JSON.stringify({rows:4000,iterations:25,elapsedMs:Number(elapsed.toFixed(2)),perIterationMs:Number((elapsed/25).toFixed(2))}));"
```

Results:

- Before Phase 4 hardening: `{"rows":4000,"iterations":25,"elapsedMs":203.4,"perIterationMs":8.14}`
- After Phase 4 hardening: `{"rows":4000,"iterations":25,"elapsedMs":248.3,"perIterationMs":9.93}`

Decision: no performance optimization. The added prototype-safe assignment cost is measurable but still below 10 ms per 4,000-row parse+validate iteration in this local, user-triggered path, and oversized files are now blocked before read.

## Commands And Results

Phase 4 start focused checks:

```powershell
node --check demoShared.js
node --check pilotIntakeSafety.js
node --check demoControlCenter.js
node --check app.js
node tests\pilotIntakeSafety.test.js
node tests\demoControlCenter.test.js
```

Result: pass.

Broader applicable root checks:

```powershell
node --check demoShared.js
node --check pilotIntakeSafety.js
node --check demoControlCenter.js
node --check pilotReadinessPack.js
node --check demoWalkthrough.js
node --check operationalImpact.js
node --check operationalCompression.js
node --check app.js
node tests\demoShared.test.js
node tests\pilotIntakeSafety.test.js
node tests\demoControlCenter.test.js
node tests\pilotReadinessPack.test.js
node tests\demoWalkthrough.test.js
node tests\operationalImpact.test.js
node tests\operationalCompression.test.js
```

Result: pass.

Diff checks:

```powershell
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js tests\demoControlCenter.test.js
git diff --no-index --check -- NUL pilotIntakeSafety.js
git diff --no-index --check -- NUL tests\pilotIntakeSafety.test.js
git diff --no-index --check -- NUL docs\cmtcommand-vnext\baseline.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\plan.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\status.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\verification.md
```

Result: no whitespace errors reported. Git emitted LF-to-CRLF working-copy warnings. `--no-index` returned exit code 1 because each checked file differs from `NUL`, with only line-ending warnings.

HTTP smoke against existing local server:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/index.html -TimeoutSec 3
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/pilotIntakeSafety.js -TimeoutSec 3
```

Result:

- `index.html`: `HTTP 200 3077`
- `pilotIntakeSafety.js`: `HTTP 200 10118`

Browser automation:

- Attempted targeted in-app browser smoke for `http://127.0.0.1:8765/?ui=standard`.
- Result: environment-blocked. The browser webview timed out while attaching twice. No product failure was observed because the page could not be attached for inspection.

## Failure Classification

- Introduced failures: none observed.
- Verified pre-existing failures: none in the root static app checks.
- Environment-blocked: in-app browser automation attach timed out twice; live DOM/file-upload proof remains deferred.
- Not applicable: npm build/lint/typecheck, backend integration, schema migration, command/subprocess verification, and network retry/timeout verification because this root static app has no package scripts, backend, schema, product subprocesses, or product network calls.

## Remaining Acceptance Criteria

- Live browser DOM proof that malicious uploaded CSV/document payloads create no executable nodes remains open due to browser attach failure.
- Manual or browser-automated real file upload interaction remains open for the same reason.
- Final independent review remains intentionally unstarted.

## Phase 5 - Real-World Product And Contract Validation

Date: 2026-07-10

Scope: Trusted Pilot Intake and Render Safety in the real static UI.

## Realistic Environment

- Local app server: `http://127.0.0.1:8765/`.
- Browser: Microsoft Edge headless via CDP on `http://127.0.0.1:9224/json/version`, reported `Edg/150.0.4078.48`.
- Browser artifact script: `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.cjs`.
- Exact browser run output: `docs/cmtcommand-vnext/artifacts/phase5-browser-validation.json`.
- Screenshots:
  - `docs/cmtcommand-vnext/artifacts/phase5-pilot-setup-wide-after.png`
  - `docs/cmtcommand-vnext/artifacts/phase5-pilot-setup-narrow-after.png`

## Defects Found And Fixed

1. Browser console/network noise: the first Edge product run reported a `favicon.ico` 404. Fixed by adding a static data favicon in `index.html`. After fix, the browser artifact reported `consoleFailureCount: 0` and `networkFailureCount: 0`.
2. Mobile Pilot Setup topbar: the 390px screenshot showed the search control reserving a tall empty block because the later `.search-wrap { flex: 1 1 260px; }` rule survived in the column topbar. Fixed with a later mobile override setting `.topbar-actions` to full width and `.search-wrap` to `flex: 0 0 auto; width: 100%; max-width: none;`. After fix, the 390px run reported `searchHeight: 42`, `scrollWidth: 390`, and `horizontalOverflow: false`.
3. Demo QA visibility: the deterministic Demo QA report calculated the required utility checks, including `Pilot Intake Safety utility`, but the UI did not render the `required-utilities` section. Fixed by rendering `renderQaSection(sections["required-utilities"], { copyLabel: "Copy Utility QA" })` in `renderDemoControlCenter`. After fix, the browser artifact reported `includesPilotIntakeSafety: true`.

Validation harness corrections, not product defects:

- The first artifact script used the wrong CSV input id; corrected from `#csvImportInput` to the real `#csvImportFile`.
- Upload scenarios now cancel any existing preview before dispatching a file change, so each case waits for a fresh preview instead of re-reading stale DOM.

## Browser Workflow Exercised

Steps run by `node docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs`:

1. Load `http://127.0.0.1:8765/?ui=standard`.
   - Observed `title: CMTCommand`, initial `pageTitle: Tomorrow Readiness`, app content present, and `window.CMTPilotIntakeSafety` present.
2. Open Pilot Setup.
   - Empty state: no import preview, no Apply Import button, local document empty state visible, headings and form labels present, no horizontal overflow.
3. Click Work Orders `Preview Template`.
   - Observed `Import Preview: Work Orders`, badge `Ready`, `Apply Import` enabled, expected Work Orders headers/cells rendered, and `unsafeNodes: 0`.
4. Click `Apply Import`.
   - Observed preview removed and imported-record text visible.
5. Upload hostile CSV:
   - Header: `<img src=x onerror=window.__cmtXss=1>`.
   - Cell: `<svg onload=window.__cmtXss=1>`.
   - Observed badge `Blocked`, `Apply Import` disabled, hostile header/cell visible as text, `unsafeNodes: 0`, `globalCmtXss: false`, and `globalFileXss: false`.
6. Upload malformed CSV:
   - Input: `work_order,project,service_type\n"TRD-104,Potomac,Concrete`.
   - Observed badge `Blocked`, `Apply Import` disabled, and parse/quote error visible.
7. Upload missing-column CSV:
   - Input: `work_order,project\nTRD-104,Potomac`.
   - Observed badge `Blocked`, `Apply Import` disabled, and `service_type` missing-column text visible.
8. Upload partial Work Orders CSV with all required headers but blank required cells:
   - Row includes `TRD-105`, blank `project`, blank `required_equipment`, and notes `Needs review & quotes`.
   - Observed badge `Needs review`, `Apply Import` enabled, no missing-column warnings, cleanup warning visible, ampersand preserved, and row values rendered in table cells.
9. Upload oversized CSV:
   - Input: `work_order\n` plus 200,001 `x` characters.
   - Observed badge `Blocked`, `Apply Import` disabled, and bounded-size message visible.
10. Simulate FileReader read error and recover.
   - Observed blocked read-error preview with `Apply Import` disabled.
   - Then clicked Work Orders `Preview Template`; observed badge `Ready` and `Apply Import` enabled.
11. Stage document metadata with hostile filename and notes:
   - Filename: `<script>window.__docXss=1</script>.pdf`.
   - Notes: `<img src=x onerror=window.__docXss=1> notes & Unicode \u03a9`.
   - Observed filename and notes displayed as text, `unsafeNodes: 0`, and `globalDocXss: false`.
12. Keyboard/semantics check.
   - Focused `Preview Template`; observed focused tag `BUTTON`, focused text `Preview Template`, `:focus` matched, Pilot Setup heading present, and labeled controls/headings present.
13. Viewport checks.
   - Wide 1440x900: `scrollWidth: 1425`, `horizontalOverflow: false`, `searchHeight: 42`.
   - Narrow 390x844: `scrollWidth: 390`, `horizontalOverflow: false`, `searchHeight: 42`.
14. Reload/persistence check.
   - After reload and reopening Pilot Setup, observed no import preview and no staged document card.
15. Demo QA check.
   - Opened Demo Control Center; observed `Ready for Demo` and `Pilot Intake Safety utility` visible.
16. Command/dark compatibility check.
   - Opened `http://127.0.0.1:8765/?ui=command`, reopened Pilot Setup, observed `uiMode: command`, `bodyCommandMode: true`, Preview Template available, and dark mode toggled.

## Commands And Results

Browser validation:

```powershell
node docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs
```

Result: pass. Wrote `phase5-browser-validation.json` and the two PNG screenshots listed above.

Syntax checks:

```powershell
node --check demoShared.js
node --check pilotIntakeSafety.js
node --check demoControlCenter.js
node --check pilotReadinessPack.js
node --check demoWalkthrough.js
node --check operationalImpact.js
node --check operationalCompression.js
node --check app.js
node --check docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs
```

Result: pass.

Standalone tests:

```powershell
node tests\demoShared.test.js
node tests\pilotIntakeSafety.test.js
node tests\demoControlCenter.test.js
node tests\pilotReadinessPack.test.js
node tests\demoWalkthrough.test.js
node tests\operationalImpact.test.js
node tests\operationalCompression.test.js
```

Result: pass. Tests with explicit success output reported:

- `pilotIntakeSafety tests passed`
- `pilotReadinessPack tests passed`
- `demoWalkthrough tests passed`
- `operationalImpact tests passed`
- `operationalCompression tests passed`

Diff and HTTP checks:

```powershell
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js tests\demoControlCenter.test.js
git diff --no-index --check -- NUL pilotIntakeSafety.js
git diff --no-index --check -- NUL tests\pilotIntakeSafety.test.js
git diff --no-index --check -- NUL docs\cmtcommand-vnext\status.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\verification.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs
git diff --no-index --check -- NUL docs\cmtcommand-vnext\artifacts\phase5-browser-validation.json
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/index.html -TimeoutSec 3
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/pilotIntakeSafety.js -TimeoutSec 3
```

Result: pass. Tracked `git diff --check` reported no whitespace errors. `--no-index` checks returned exit code 1 because each file differs from `NUL`; output contained only LF-to-CRLF warnings and no whitespace errors. HTTP smoke returned:

- `index.html`: `HTTP 200`, raw content length `3107`.
- `pilotIntakeSafety.js`: `HTTP 200`, raw content length `10118`.

Final Phase 5 status command:

```powershell
git status --short --branch
```

Result: branch `master`; intended root/vNext changes remain dirty and untracked docs/artifacts remain under `docs/`. Pre-existing unrelated `euchre-platform/` changes and local artifacts remain untouched.

## Failure Classification

- Introduced failures: none observed after Phase 5 fixes.
- Verified pre-existing failures: none in the root static app checks.
- Environment-blocked: none for the upgraded workflow after using Edge CDP.
- Not applicable: package build/lint/typecheck, backend/API/service checks, migration checks, auth checks, subprocess checks, and network retry/timeout checks; root CMTCommand remains a static app with no package scripts, backend, schema, auth, product subprocesses, or product network calls.

## Remaining Limits

- No manual screen-reader or assistive-technology session was run; Phase 5 checked labels, headings, focusability, and visible focus through browser DOM evidence.
- Final independent review remains intentionally unstarted.
- A full manual TRD-104 walkthrough through Maria approval is still appropriate in the final review; Phase 5 validated that Demo QA is Ready for Demo and the selected Pilot Setup workflow works end to end.

## Phase 6 - Development System Upgrade

Date: 2026-07-10

Scope: root CMTCommand development guidance, deterministic verification, and focused CI for the selected Trusted Pilot Intake and Render Safety slice.

## Evidence Read

- Durable vNext record: `charter.md`, `baseline.md`, `plan.md`, `status.md`, and this `verification.md`.
- Contributor docs: root `README.md` and `DEVELOPER_NOTES.md`.
- Existing agent guidance: no root `AGENTS.md` or override file existed; `.agents/` and `.codex/` contained no readable repository instruction files.
- CI/config evidence: no root `.github/`, root `package.json`, lockfile, Dockerfile, deployment config, or package-managed build/lint/typecheck command existed. Nested `euchre-platform/package.json` and lockfile are out of scope.
- Current dirty state: root vNext files remain dirty; unrelated `euchre-platform/` changes and local artifacts remain present and untouched.

## Development-System Changes

- Added `AGENTS.md` with root static-app map, commands, invariants, trust boundaries, compatibility/scope rules, generated-artifact cautions, and definition of done.
- Added `scripts/verify-root.mjs`, a dependency-free Node runner that executes the root syntax checks and deterministic Node tests with structured `spawnSync` arguments.
- Added `.github/workflows/root-static-checks.yml`, a focused GitHub Actions workflow that runs `node scripts/verify-root.mjs` on root static-app, test, docs-command, script, and workflow changes.
- Updated `README.md` to document the verifier as the preferred root check, list the script/workflow as important files, and keep the underlying direct commands available.
- Updated `DEVELOPER_NOTES.md` to identify `node scripts\verify-root.mjs` as the local and CI entry point.
- Updated `plan.md` so the durable vNext verification section references the same verifier.

## Commands And Results

Local equivalent of the new CI job:

```powershell
node scripts\verify-root.mjs
```

Result: pass. It ran:

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

Tests with explicit success output reported:

- `pilotIntakeSafety tests passed`
- `pilotReadinessPack tests passed`
- `demoWalkthrough tests passed`
- `operationalImpact tests passed`
- `operationalCompression tests passed`

Final diff checks:

```powershell
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoControlCenter.js tests\demoControlCenter.test.js
git diff --no-index --check -- NUL AGENTS.md
git diff --no-index --check -- NUL scripts\verify-root.mjs
git diff --no-index --check -- NUL .github\workflows\root-static-checks.yml
git diff --no-index --check -- NUL docs\cmtcommand-vnext\plan.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\status.md
git diff --no-index --check -- NUL docs\cmtcommand-vnext\verification.md
```

Result: pass. Tracked `git diff --check` reported no whitespace errors. `--no-index` checks returned exit code 1 because each checked untracked file differs from `NUL`; output contained only LF-to-CRLF warnings and no whitespace errors.

## CI And Documentation Reconciliation

- Before Phase 6, README and developer notes listed repeated individual Node commands and no root CI existed.
- After Phase 6, AGENTS, README, DEVELOPER_NOTES, plan, and CI agree that `node scripts\verify-root.mjs` is the root static-app verification entry point.
- The repo still intentionally has no root package manager or npm scripts. Adding `package.json` only to alias direct Node commands was deferred as unnecessary tooling.
- A reusable project skill was not added. The repo has no supported in-repo skill convention, and the repeated workflow is now covered by `AGENTS.md` plus the verifier script.

## Deferred Improvements

- Browser/CDP product validation remains a phase artifact under `docs/cmtcommand-vnext/artifacts/`; it was not added to CI because it depends on a locally running HTTP server and Edge CDP session.
- No lint/typecheck/build tooling was added because the root app is static JavaScript without a package system, transpiler, or type configuration.
- No obsolete code was removed; Phase 6 found no unused-code evidence strong enough to justify deletion.
