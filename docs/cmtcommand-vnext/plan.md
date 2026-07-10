# CMTCommand vNext Release Plan

## Phase 2 Evidence Summary

Current repository evidence identifies root CMTCommand as a static HTML/CSS/JavaScript demo. There is no root `package.json`, lockfile, CI directory, deployment config, backend, schema, or migration file. Root `src/` and `migrations/` directories exist but have no files. The applicable app surface is the root static app and utility scripts, not `euchre-platform/` or generated release artifacts.

Phase 2 used two read-only explorer audits:

- One audit favored hardening the TRD-104 guided buyer story.
- One audit identified a concrete intake/rendering security and reliability gap in the Pilot Setup workflow.

The selected slice is **Trusted Pilot Intake and Render Safety** because it improves a real user-facing pilot setup workflow, removes a concrete local rendering/input failure mode, and creates a small testable utility boundary without adding dependencies or changing the product architecture.

## Candidate Release Slices

### 1. Trusted Pilot Intake and Render Safety (selected)

- User value and workflow: makes Pilot Setup credible after the buyer story by allowing a limited local CSV/document review without unsafe or misleading previews.
- Reliability/security/maintainability value: treats CSV headers, file names, document notes, and exported spreadsheet cells as untrusted input; centralizes parsing, escaping, and validation that currently lives privately in `app.js`.
- Repository evidence: `render()` writes page strings through `innerHTML` in `app.js:4301` and `app.js:4322`; CSV upload flows through `FileReader` into `stageImport(parseCsv(...), file.name)` in `app.js:7199`; CSV headers become object keys in `app.js:6611` through `app.js:6641`; import headers render raw in `app.js:6781`; document `fileName` and `notes` render raw in `app.js:6827` and `app.js:6836`; current tests focus on deterministic utility modules per `README.md:71`.
- Effort/risk/confidence: medium effort, medium implementation risk because `app.js` is large and already has pre-existing user edits; low migration risk because no persistent backend or schema is involved; high confidence because acceptance can be proven with unit tests and browser smoke.
- Testability and validation: focused Node tests for parser, sanitizer, export escaping, validation states, malformed CSV, duplicate headers, and no-execution browser smoke with malicious local inputs.
- Likely files changed later: new `pilotIntakeSafety.js` or equivalent UMD utility, `index.html`, `app.js`, `demoControlCenter.js`, `tests/pilotIntakeSafety.test.js`, possibly `tests/demoControlCenter.test.js`, `README.md`, `DEVELOPER_NOTES.md`, and project-memory docs.
- Deliberately unchanged: no backend, cloud upload, OCR/AI service, CRM/LIMS integration, payroll/pricing/HR data handling, real persistence, or nested `euchre-platform/` work.

### 2. TRD-104 Guided Buyer Story Hardening

- User value and workflow: strengthens the main Tomorrow Readiness -> Find Coverage -> Maria Lopez approval -> Decision Log -> Operational Impact path.
- Reliability/security/maintainability value: could make TRD-104 approval idempotent, move decision construction into a testable utility, and reduce stale or duplicate local decision state.
- Repository evidence: README documents this as the main demo path; `demoWalkthrough.js` defines the 11-step guided story; `app.js` contains `renderCommandCenter`, `renderReadinessDemo`, `renderDemoCoverageScreen`, `assignDemoCoverage`, and `renderDecisionLogPage`; `demoControlCenter.js` verifies TRD-104 story health.
- Effort/risk/confidence: medium-high effort and medium risk because it touches the centerpiece workflow and modified `app.js`; low migration risk; medium confidence because browser verification is essential.
- Testability and validation: unit tests for decision construction and duplicate-approval behavior, plus browser smoke of the full guided path.
- Likely files changed later: `app.js`, possibly a new scenario utility, `demoWalkthrough.js`, `demoControlCenter.js`, `operationalImpact.js`, `operationalCompression.js`, tests, docs.
- Deliberately unchanged: no scheduling replacement, backend dispatch workflow, real employee data, or major visual redesign.

### 3. Demo QA and Local Reset Gate

- User value and workflow: gives the founder a reliable pre-demo control center before showing the app.
- Reliability/security/maintainability value: narrows reset behavior to known local demo state and makes stale or corrupted localStorage easier to detect.
- Repository evidence: `demoControlCenter.js` defines `KNOWN_DEMO_STORAGE_KEYS`, `createDemoHealthReport`, `createDemoResetPlan`, and `checkLocalDemoState`; `app.js` renders and handles reset controls.
- Effort/risk/confidence: low-medium effort, low implementation risk, low migration risk, high confidence.
- Testability and validation: existing `tests/demoControlCenter.test.js` and `tests/demoShared.test.js` cover storage keys and reset plans; add browser reset smoke.
- Likely files changed later: `demoControlCenter.js`, `demoShared.js`, `app.js`, related tests and docs.
- Deliberately unchanged: no real monitoring service, analytics, error reporting SDK, or remote QA system.

### 4. Operational Impact Proof Pack

- User value and workflow: makes the business case after the coverage decision more credible and easier to copy/share.
- Reliability/security/maintainability value: strengthens deterministic calculations, source details, conservative estimates, and no exact-ROI overclaiming.
- Repository evidence: `operationalImpact.js` exports `createOperationalImpactSnapshot`, `calculateDataQualityScore`, `findRepeatFailurePatterns`, and `findCoverageBottlenecks`; `app.js` renders operational impact and pilot ROI sections; `tests/operationalImpact.test.js` already covers before/after TRD-104 impact.
- Effort/risk/confidence: medium effort, low-medium implementation risk, low migration risk, high confidence for pure calculations.
- Testability and validation: before/after snapshot tests, source-detail assertions, copy payload checks, and browser verification after Maria approval.
- Likely files changed later: `operationalImpact.js`, `app.js`, `pilotReadinessPack.js`, tests, docs.
- Deliberately unchanged: no external analytics, exact ROI, billing data, or data warehouse integration.

## 1. Problem Statement And Target User Outcome

When a buyer reaches Pilot Setup, CMTCommand asks them to start from a limited anonymized CSV/document workflow. That is currently the right product boundary, but the implementation treats several local file-derived values as trusted display content.

Target outcome: a founder can open Pilot Setup, preview a CSV or local document record, see clear validation and cleanup guidance, and safely copy/export pilot materials while the app proves that untrusted local input is rendered as text, not markup or executable content.

## 2. Current Behavior With File-Level Evidence

- CMTCommand is a static HTML/CSS/JavaScript demo using global UMD-style utility files loaded by `index.html`, then `app.js` renders pages into `#app` with delegated listeners (`DEVELOPER_NOTES.md:5`).
- The root app has no package scripts or build system; documented verification is direct `node --check`, root Node tests, and `git diff --check` (`README.md:73` through `README.md:91`).
- The app renders complete page strings with `innerHTML` in `app.js:4322`.
- CSV export is built by `csvEscape` and `rowsToCsv` in `app.js:6602` through `app.js:6608`; it quotes commas/newlines/quotes but does not define spreadsheet formula handling.
- CSV upload is parsed by private `parseCsv` in `app.js:6611` through `app.js:6641`, then validated by private `validateImport` in `app.js:6644`.
- CSV-derived headers render raw in `<th>${header}</th>` in `app.js:6781`, while row cell values are escaped in `app.js:6782`.
- Local document upload stores browser file metadata and notes in `stageUploadedDocuments` (`app.js:7077`) and renders `doc.fileName` and `doc.notes` raw in `app.js:6827` and `app.js:6836`.
- The existing pure utilities already summarize and score pilot intake quality through `operationalCompression.createPilotIntakeSummary` and `operationalImpact.calculateDataQualityScore`, and those are tested. The parser/rendering boundary that feeds them is not directly covered.

## 3. Selected Design And Alternatives Rejected

Selected design: introduce a small dependency-free UMD intake safety utility and wire Pilot Setup to it. The utility should own CSV parsing, header normalization, validation result shape, display escaping helpers for untrusted intake metadata, and CSV export cell hardening. `app.js` remains the renderer and state owner, but Pilot Setup no longer keeps its parser and safety rules as private untested helpers.

Phase 3 preflight amendment: rendering safety must be enforced at affected sinks. Intake validation may classify and block unsafe or malformed data, but it must not be the only protection. For Pilot Setup text sinks, prefer `textContent` and explicit DOM-node construction after the static shell is rendered. If a URL-valued attribute is introduced or touched, it must be set only after validating a narrow allowed-protocol policy. Current selected-slice evidence does not require accepting user-controlled URL attributes; the only current URL assignment in scope is the internally generated `blob:` download URL.

The UMD form is required because every current root helper uses the same browser-global plus CommonJS export pattern. The new utility should expose a minimal browser global such as `CMTPilotIntakeSafety` and `module.exports` for Node tests. It must load after shared helpers if it needs them and before `app.js` so app rendering and Demo QA can use it. Its public surface should stay limited to CSV parsing, import validation, CSV serialization/export hardening, document metadata normalization, text-sink helpers, and URL protocol validation if needed.

Rejected alternative: only patch the three raw render sites in `app.js`. That is faster but leaves parsing/export rules private and easy to regress.

Rejected alternative: use a third-party CSV parser/sanitizer. The repo has no root package system, and a production dependency is not justified for a focused static demo.

Rejected alternative: prioritize TRD-104 guided story hardening. It has higher primary-demo value, but repository evidence already shows substantial TRD-104 coverage. The intake/rendering issue is a clearer release-quality failure mode and materially improves security and testability.

## 4. In-Scope And Non-Goal Boundaries

In scope:

- Local CSV parsing and preview for Pilot Setup.
- Local document upload metadata rendering for Pilot Setup.
- CSV export/template cell hardening.
- Missing-column, duplicate-header, duplicate-row, malformed-row, and formula-like value warnings.
- UI states that make blocked imports observable.
- Demo QA checks for the new intake safety utility and local-only pilot data boundary.
- Focused tests and docs for the selected workflow.

Non-goals:

- No backend upload, database, login, cloud persistence, live scheduling import, CRM/LIMS/ERP integration, OCR, external AI, analytics, or production deployment.
- No broad app rewrite, framework migration, package-manager introduction, or dependency addition.
- No changes to `euchre-platform/`, `.pnpm-store/`, release ZIPs, screenshots, spreadsheets, or local server logs.
- No real payroll, pricing, HR, sensitive personal data, or exact ROI handling.

User-controlled Pilot Setup fields in scope:

- CSV import file bytes read by `FileReader`.
- CSV filename from `file.name`.
- CSV headers.
- CSV cell values.
- Import type selected through `#importEntitySelect`.
- Document upload file names from `documentUploadInput.files`.
- Document type selected through `#documentTypeSelect`.
- Related project selected through `#documentProjectSelect`.
- Related technician selected through `#documentTechSelect`.
- Related equipment selected through `#documentEquipmentSelect`.
- Document notes from `#documentNotesInput`.
- Sample document selector `#sampleExtractionSelect` and extraction destination `#sendExtractionModule`; these are constrained to static options but still pass through UI state.

Affected sinks in scope:

- DOM/template sinks: `renderImportPreview`, warning badges, import preview table headers/cells, import preview status, `renderDocumentUploadSection`, document cards, document metadata fields, copy button labels where later connected to non-static values, and the last CSV export status display.
- Storage/state sinks: `state.intakeImport`, `state.intakeImportedRecords`, `state.intakeDocuments`, `state.extractionSample`, `state.extractionSaved`, `state.extractionMessage`, and `state.lastCsvExport`.
- Reload/persistence sinks: no selected-slice data is intentionally persisted across reload; browser reload should clear session-only staged imports/documents while preserving existing display preferences and demo storage behavior.
- URL/download sinks: internally generated `blob:` URL for CSV download, `download` filename attribute, and no user-controlled navigational URL attributes.
- Preview/render sinks: Smart Intake Summary, source details, missing-column/row/duplicate warning lists, CSV preview table, document list, extraction preview, and Demo QA checks.

## 5. Architecture/Data-Flow Changes And Invariants

Planned data flow:

1. `index.html` loads the new intake utility before `app.js`.
2. CSV text enters through the existing local `FileReader`.
3. The utility parses CSV into rows plus warnings/errors instead of throwing or silently trusting headers.
4. `app.js` stores the parse/validation result in existing local session state.
5. Pilot Setup renders only escaped text for CSV headers, row values, file names, document notes, and validation messages.
6. Existing `operationalCompression` and `operationalImpact` utilities continue to receive rows plus validation summaries.
7. CSV export/template generation runs through the same utility so spreadsheet formula-like values are neutralized.

Invariants:

- Local pilot files never leave the browser.
- All untrusted local input is rendered as text.
- Malformed input cannot execute script and cannot be applied as a successful import.
- Existing static architecture and script-load style remain intact.
- Existing TRD-104 demo path, visual modes, and local reset behavior remain compatible.
- Legitimate punctuation, quotes, ampersands, whitespace, and Unicode remain visible unless the product has a specific evidenced restriction.
- Regex replacement or ad hoc escaping must not be presented as a general HTML sanitizer. Existing template escaping may remain for static-string template contexts, but selected-slice user-controlled Pilot Setup text should reach the DOM through `textContent` where practical.

## 6. File/Component-Level Implementation Sequence

1. Add `pilotIntakeSafety.js` as a UMD utility with CSV parse, validation, escaping, and export-hardening functions.
2. Add `tests/pilotIntakeSafety.test.js` covering success, malicious input, malformed input, duplicate headers, duplicate rows, boundary rows, and formula-like exports.
3. Update `index.html` script order to load the utility before `app.js`.
4. Update `app.js` Pilot Setup helpers to call the utility instead of private `parseCsv`, `validateImport`, `rowsToCsv`, and `csvEscape` logic.
5. Escape CSV headers, validation text, filenames, document notes, and copy button labels that can be influenced by local input.
6. Add observable blocked-import UI for parse errors and missing required columns; keep row-level cleanup warnings visible.
7. Update `demoControlCenter.js` to check that the intake utility is loaded and that the local-only/sensitive-data boundary remains present.
8. Update tests for Demo QA if the required utility list changes.
9. Update `README.md` and `DEVELOPER_NOTES.md` with the new script and verification command.
10. Update `docs/cmtcommand-vnext/verification.md`, `review.md`, and `status.md` in later phases as implementation and review happen.

## 7. Compatibility Effects

- Public UI: Pilot Setup keeps the same page and local-only workflow, but shows clearer blocked/warning states for malformed or incomplete CSVs.
- Script API: a new root global such as `CMTPilotIntakeSafety` is introduced for the static app and Node tests.
- Configuration: no new config files, env vars, package scripts, lockfiles, or deployment settings.
- Schema/data: no backend schema or migration.
- Compatibility: existing CSV templates remain valid. Missing required columns or malformed CSVs become blocked instead of appearing apply-ready.
- Phase 4 compatibility hardening: CSV preview is capped by `pilotIntakeSafety.MAX_CSV_CHARACTERS` and the app checks `file.size` before `FileReader.readAsText`. Oversized files now produce a blocked local preview message instead of being read into memory. This is a deliberate compatibility limit for the local demo, not a migration.
- Phase 4 script API addition: `CMTPilotIntakeSafety.createErrorParseResult` is exposed so browser read failures and pre-read size failures use the same blocked validation path as parser failures.

## 8. Security And Privacy Considerations

- Treat CSV content, headers, uploaded filenames, document notes, and future local file labels as untrusted.
- Neutralize spreadsheet formula-like exports beginning with `=`, `+`, `-`, `@`, tab, or carriage return.
- Preserve normal text fidelity for punctuation, quotes, ampersands, whitespace, and Unicode in previews and copied/exported content, except where CSV formula neutralization adds the minimal leading apostrophe required for spreadsheet safety.
- Do not inspect, upload, persist, or transmit local file contents outside browser-local session state.
- Keep payroll, pricing, HR notes, and sensitive personal data explicitly out of pilot requirements.
- Avoid broad localStorage clearing; this slice should not change unrelated storage.
- Phase 4 hardening: CSV header names such as `__proto__`, `constructor`, and `toString` are treated as data keys without mutating object prototypes or internal validation maps.
- Phase 4 hardening: `appendTextElement` accepts only known text-container tags used by the app and rejects executable or non-text tags such as `script`.
- Phase 4 resilience: CSV `FileReader` success/error handlers are guarded by a read token so a stale read cannot overwrite a newer preview, and read/open failures produce blocked parse results without exposing secrets or stack traces.
- Phase 7 review fix: parse-error intake summaries must not reuse normal imported-row copy. Even if the parser keeps a partial diagnostic row, the summary reports `Accepted rows: 0`, uses a parse-error copy action, and avoids wording that implies rows were imported or accepted.

## 9. Migration And Rollback Strategy

Migration: none for persisted data because root CMTCommand has no backend and the selected workflow uses browser-local session state.

Rollback: revert the new utility, script tag, `app.js` wiring, tests, and docs for this slice. Because no dependency, schema, or external resource is introduced, rollback is file-level only.

Compatibility risk: users with an already open static page may need a hard refresh after script-load changes. That is acceptable for this local static demo.

Phase 4 rollback note: the pre-read file-size gate and read-token handling are local `app.js` behavior only. Reverting them restores Phase 3 behavior but reintroduces the oversized-file read and stale-read risks. No stored data conversion is needed in either direction.

Phase 7 rollback note: reverting the parse-error summary change restores misleading malformed-CSV copy where a blocked partial row can be described as imported. There is still no data migration; rollback is limited to `operationalCompression.js`, `app.js`, tests, and browser verification artifacts.

## 10. Acceptance Criteria

1. A CSV with a header like `<img src=x onerror=window.__cmtXss=1>` displays that header as visible text in the import preview; it does not create an image element and `window.__cmtXss` remains unset during browser smoke.
2. A local document file name and notes value containing `<script>` or event-handler markup displays as text in Document Uploads and does not execute or create script/image nodes from the payload.
3. A malformed CSV with an unmatched quote produces a visible parse error, cannot be applied, and leaves `state.intakeImportedRecords` unchanged.
4. A CSV missing any required column for the selected import type shows each missing column, marks the import as blocked or needing required-column repair, and prevents Apply Import.
5. A CSV with required columns present but blank required fields shows row-level cleanup warnings and a Smart Intake Summary that reports the number of rows needing cleanup.
6. Duplicate CSV headers are normalized or disambiguated with a visible warning; required-column detection still uses the intended canonical column names.
7. Duplicate imported rows still produce duplicate-risk warnings through the validation result.
8. Exported/template CSV cells that begin with `=`, `+`, `-`, `@`, tab, or carriage return are neutralized so spreadsheet software does not treat them as formulas.
9. Valid quoted CSV values with commas, quotes, CRLF line endings, and quoted newlines parse into the expected field values.
10. Demo QA verifies the intake safety utility is loaded; omitting the utility from the context produces a failing utility check, and the normal app context passes it.
11. Existing TRD-104 walkthrough, Maria Lopez approval, Decision Log, Operational Impact, Pilot Materials, visual mode, theme, and Full Demo Reset behavior remain compatible.
12. No production dependency, package manager, backend, deployment config, external API call, or `euchre-platform/` change is introduced.
13. Markup, event-handler payloads, SVG/image payloads, and `javascript:` strings remain visible text wherever they are accepted as ordinary Pilot Setup values; they do not become DOM elements, event handlers, or executable URLs.
14. Valid values containing quotes, ampersands, leading/trailing meaningful spaces, repeated internal spaces, newlines, and Unicode characters display or parse with their intended text content preserved.
15. Oversized local CSV input produces a bounded, actionable error instead of freezing the page or rendering an unbounded preview.
16. Demo QA intake checks are supplementary; deterministic Node tests are the primary acceptance evidence for parser, validation, export, and sink behavior.

## 11. Test Matrix

- Success cases: valid Work Orders CSV, valid Technicians CSV, demo template preview, template export, document upload metadata display, Pilot Story sample import preview.
- Malformed input: unmatched quotes, trailing partial row, BOM-prefixed header, empty file, invalid selected entity, file with no headers.
- Boundary cases: duplicate headers, extra unknown headers, headers with whitespace/case variation, quoted commas, quoted newlines, CRLF and LF endings, empty required field, many warnings truncated in UI without losing counts.
- Failure/security cases: malicious CSV header, malicious CSV cell, malicious filename, malicious notes, formula-like export values, copy button labels from non-static sources.
- Hostile payload cases: literal markup, event-handler attributes, SVG payloads, image payloads, `javascript:` strings where URL policy is applicable, control characters, oversized input, and mixed hostile-plus-valid Unicode text.
- Text fidelity cases: quotes, apostrophes, ampersands, commas, CRLF, quoted newlines, tabs inside quoted fields, leading/trailing spaces inside quoted fields, emoji or other Unicode, and normal valid values from existing templates.
- Reload/persistence cases: staged imports/documents do not persist across reload, existing display preferences and known demo storage behavior remain unchanged, and Full Demo Reset still avoids unrelated storage.
- Regression coverage: existing Node tests, Demo QA required utility checks, TRD-104 story health, operational impact scoring, pilot material sensitive-data boundary, Full Demo Reset storage scope.

## 12. Verification Commands And Realistic Workflow

Commands to run after implementation:

```powershell
node scripts\verify-root.mjs
node --check demoShared.js
node --check pilotIntakeSafety.js
node --check demoControlCenter.js
node --check pilotReadinessPack.js
node --check demoWalkthrough.js
node --check operationalImpact.js
node --check operationalCompression.js
node --check app.js
node tests\pilotIntakeSafety.test.js
node tests\demoShared.test.js
node tests\demoControlCenter.test.js
node tests\pilotReadinessPack.test.js
node tests\demoWalkthrough.test.js
node tests\operationalImpact.test.js
node tests\operationalCompression.test.js
git diff --check -- index.html app.js styles.css README.md DEVELOPER_NOTES.md demoShared.js pilotIntakeSafety.js demoControlCenter.js pilotReadinessPack.js demoWalkthrough.js operationalImpact.js operationalCompression.js tests docs/cmtcommand-vnext
```

Phase 6 development-system note: `node scripts\verify-root.mjs` is the local and CI entry point for the root syntax checks and deterministic Node tests. The individual commands remain documented as the underlying checks and for targeted debugging.

Phase 7 final browser verification command:

```powershell
node docs\cmtcommand-vnext\artifacts\phase5-browser-validation.cjs
```

This command is not part of root CI because it requires a running local HTTP server and Edge CDP, but it is the release handoff gate for Pilot Setup product behavior. It must exit 0 with all assertions passing before final sign-off.

Realistic workflow to exercise after implementation:

1. Serve the static app locally from the root folder.
2. Open `http://127.0.0.1:8765/?ui=standard`.
3. Navigate to Pilot Setup.
4. Preview a valid Work Orders template and confirm Ready state.
5. Upload or simulate a malicious CSV header/cell and confirm no script execution.
6. Upload or simulate malformed and missing-column CSVs and confirm Apply Import is blocked.
7. Stage a local document with malicious filename/notes and confirm the page renders safe text.
8. Open Demo QA and confirm intake utility and sensitive-data checks pass.
9. Smoke the TRD-104 guided path through Maria approval, Decision Log, Operational Impact, and Pilot Materials.
10. Repeat in `?ui=command`, dark mode, and 390px mobile viewport with no horizontal overflow on the affected screens.

## 13. Risks, Assumptions, And Stop Conditions

Risks:

- `app.js` is large and already has unrelated pre-existing edits, so implementation must patch narrowly and inspect surrounding changes before editing.
- Adding a new script changes static load order; a missing script tag would break the app unless Demo QA catches it.
- Browser file upload automation may be unavailable in this environment, requiring a documented fallback to unit tests plus local HTTP/render checks.
- Phase 4 measured performance: the 4,000-row parse+validate benchmark changed from 8.14 ms per iteration before hardening to 9.93 ms per iteration after prototype-safe record assignment. The added cost is accepted because the workflow is user-triggered, locally bounded, and capped before file read.
- Phase 4 residual verification risk: in-app browser automation timed out while attaching to the local webview twice, so live DOM/file-upload proof remains environment-blocked until a later phase can use a working browser surface.

Assumptions:

- Root CMTCommand, not `euchre-platform/`, is the vNext target.
- The selected workflow should remain local-only and dependency-free.
- A small UMD utility is acceptable because the repo already uses UMD-style helper scripts.
- No baseline document exists yet; Phase 2 re-checked available charter/status and repository evidence directly.

Stop conditions:

- Stop and ask if implementation would require adding a production dependency or package manager.
- Stop and ask if the fix requires backend upload, persistence, real PII handling, external AI/OCR, or production deployment.
- Stop and ask if preserving pre-existing `app.js`/`styles.css` edits becomes impossible without overwriting user work.
- Stop and record verification limits if browser automation is blocked after unit and HTTP smoke checks.
