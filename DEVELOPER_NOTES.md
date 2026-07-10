# CMTCommand Developer Notes

## Architecture

CMTCommand is a static HTML/CSS/JavaScript demo. It uses global UMD-style utility files loaded by `index.html`, then `app.js` renders pages into `#app` and handles events through delegated listeners.

There is no backend, login, database, cloud storage, external AI call, analytics SDK, CRM, ERP, LIMS, payment layer, or build system.

## Script Load Order

`index.html` should load scripts in this order:

1. `demoShared.js`
2. `pilotIntakeSafety.js`
3. `readinessEngine.js`
4. `operationalCompression.js`
5. `operationalImpact.js`
6. `demoWalkthrough.js`
7. `pilotReadinessPack.js`
8. `demoControlCenter.js`
9. `app.js`

`app.js` depends on all utility globals being available. If a future utility is added, load it before `app.js`.

## Module Responsibilities

- `demoShared.js`: safe localStorage access, timestamp formatting, status labels, plain-text formatting, copy fallback, demo target helpers.
- `pilotIntakeSafety.js`: Pilot Setup CSV parsing, required-column validation, duplicate warnings, CSV export escaping, safe text sink helpers, and narrow URL protocol checks.
- `readinessEngine.js`: deterministic work-order readiness, pickup readiness, schedule summary, and coverage candidate ranking rules.
- `operationalCompression.js`: readiness packets, ops brief, coverage handoff, decision summary, pilot intake summary.
- `operationalImpact.js`: issue counts, conservative review-time estimate, impact snapshot, repeat patterns, coverage bottlenecks, data quality.
- `demoWalkthrough.js`: Pilot Story Mode steps, progress helpers, initial/reset state, demo recap.
- `pilotReadinessPack.js`: founder checklist, qualification questions, data request, success criteria, objections, messages, scorecard.
- `demoControlCenter.js`: deterministic Demo QA health checks, reset plan, known limitations, QA report copy.
- `app.js`: demo data, state, page rendering, navigation, event handling, browser-local state. It delegates readiness and coverage rules to `readinessEngine.js`.

## LocalStorage Keys

Display preference keys:

- `cmtcommand-ui-mode`
- `cmtcommand-theme`

Demo state keys:

- `cmtcommand-demo-walkthrough`
- `cmtcommand-demo-control-checklist`

Full Demo Reset should clear only demo state keys. It should preserve display preferences and unrelated browser storage.

## TRD-104 Scenario

The centerpiece story is:

```text
Tomorrow Readiness -> TRD-104 -> Find Coverage -> Maria Lopez -> Approve Coverage Plan -> Decision Log -> Operational Impact -> Pilot Materials -> Demo QA
```

TRD-104 must start as risk-bearing before approval. Maria Lopez must remain the recommended qualified coverage option. Approving Maria should create a local Decision Log entry and improve the Operational Impact story.

Avoid changing demo data shape unless tests and browser smoke are updated together.

## Readiness Engine

`readinessEngine.js` is the source of truth for deterministic tomorrow-readiness evaluation. It accepts explicit work orders, technicians, equipment, pickup records, assignment overrides, and service requirements. It returns Ready, At Risk, or Not Ready plus blockers, warnings, source facts, equipment plan, and coverage-candidate scores.

`app.js` keeps wrapper names such as `evaluateDemoReadiness`, `evaluateCylinderPickup`, and `getDemoCoverageCandidates` for rendering compatibility, but those wrappers delegate to `CMTReadinessEngine`. New rules should be added to the engine and covered in `tests/readinessEngine.test.js`, not duplicated in page renderers.

## Pilot Story Mode Targets

`demoWalkthrough.js` defines 11 steps with `page` and `target` fields. `app.js` renders matching `data-demo-target` attributes.

If a target only appears after navigation or selection, Demo QA may warn instead of fail. A step should fail only when the target is missing from the step definition or no matching UI target is expected anywhere.

When adding or changing walkthrough steps:

- Keep target IDs unique enough to audit.
- Add or update a visible `data-demo-target`.
- Run Demo QA and the walkthrough test.
- Smoke the full Pilot Story Mode path.

## Demo QA Structure

`demoControlCenter.js` builds a pure health report. `app.js` passes live context into it and renders the result.

Main sections:

- Required utilities.
- TRD-104 Story Status.
- Walkthrough Target Audit.
- Copy Material Audit.
- Operational Impact QA.
- Decision Log State.
- Pilot Materials QA.
- Local Demo State Inspector.

Keep Demo QA deterministic. It should report static/local demo readiness, not real monitoring or production QA automation.

## Pilot Setup Intake Safety

Pilot Setup accepts local CSV files and staged document metadata. User-controlled values must render with `textContent` or explicit DOM node construction. Do not add raw imported values to template literals, `innerHTML`, URL attributes, or clipboard/download attributes without a sink-specific safety check.

CSV export should go through `pilotIntakeSafety.rowsToCsv`, which quotes CSV fields and prefixes spreadsheet formula-leading values. URL-valued attributes should use `pilotIntakeSafety.isAllowedUrl` with a narrow protocol list for that sink.

CSV upload previews are intentionally bounded by `pilotIntakeSafety.MAX_CSV_CHARACTERS`. The app checks `file.size` before `FileReader.readAsText` and reports a blocked preview instead of reading oversized files into memory.

Demo QA checks that the utility loaded, but deterministic Node tests are the required proof for parser, validation, rendering-sink helper, and URL-policy behavior.

## Copy Behavior

All app copy buttons use `renderCopyButton` and the delegated `copyOperationalText` handler. The handler normalizes payload text, tries `navigator.clipboard.writeText`, falls back to a hidden textarea, and gives short button feedback.

New copy buttons should use:

```js
renderCopyButton(copyText, "Copy Label")
```

Do not add ad hoc clipboard logic in page renderers.

## Source Details

Source-backed explanation is a trust feature. Keep source details:

- readable,
- tied to source fields,
- expandable with `details`/`summary`,
- not giant raw JSON dumps,
- styled for dark and command modes.

Use existing source detail renderers in `app.js` when possible.

## Test Commands

```powershell
node --check demoShared.js
node --check pilotIntakeSafety.js
node --check readinessEngine.js
node --check demoControlCenter.js
node --check pilotReadinessPack.js
node --check demoWalkthrough.js
node --check operationalImpact.js
node --check operationalCompression.js
node --check app.js
node tests\demoShared.test.js
node tests\pilotIntakeSafety.test.js
node tests\readinessEngine.test.js
node tests\demoControlCenter.test.js
node tests\pilotReadinessPack.test.js
node tests\demoWalkthrough.test.js
node tests\operationalImpact.test.js
node tests\operationalCompression.test.js
```

There is currently no `package.json`, so npm scripts are unavailable.

The local and CI entry point for these checks is:

```powershell
node scripts\verify-root.mjs
```

`.github/workflows/root-static-checks.yml` runs the same script for root static-app changes.

## Browser Smoke Checklist

After any meaningful UI or state change:

- App loads without console errors.
- All main nav pages open.
- Tomorrow Readiness renders.
- Operational Compression and Operational Impact render.
- Pilot Story Mode starts and reaches the final recap.
- TRD-104 approval still works.
- Decision Log updates with Maria Lopez.
- Pilot Materials opens and copy buttons work.
- Demo QA reports Ready for Demo with the valid default context.
- Demo QA reset controls work.
- Dark mode and Command Center mode remain readable.
- 390px mobile viewport has no horizontal overflow.

## Safe Future Scenario Additions

Add future scenarios by extending data and utility inputs first, then app rendering, then Demo QA checks. Avoid changing the TRD-104 story while adding new examples. New scenarios should not require backend state, login, external APIs, or sensitive data.
