# CMTCommand

CMTCommand is a static, demo-safe operations command center for CMT/geotech/special inspection firms focused on tomorrow readiness, coverage gaps, decision traceability, and pilot validation.

The core demo idea is:

```text
Scheduled does not mean ready.
```

## What The Demo Proves

- Scheduled does not mean ready.
- Readiness blockers can be caught before morning dispatch.
- TRD-104 shows a qualified coverage gap.
- Maria Lopez resolves/reduces the blocker.
- Decision Log records the action.
- Operational Impact shows business value with conservative estimates.
- Pilot Materials supports a real pilot conversation.
- Demo QA verifies readiness before a meeting.

## Run Locally

From this folder:

```powershell
python -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765/
```

If the default `python` command is unavailable on this machine, use the bundled Codex Python runtime:

```powershell
"C:\Users\Surface i7\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8765
```

If another local server is already using `8765`, stop it or use another port such as `8766`.

## Main Demo Path

Tomorrow Readiness -> Start Demo Walkthrough -> TRD-104 -> Find Coverage -> Approve Maria Lopez -> Decision Log -> Operational Impact -> Pilot Materials -> Demo QA

The manual centerpiece path is:

1. Open Tomorrow Readiness.
2. Confirm TRD-104 is risk-bearing before approval.
3. Open Find Coverage.
4. Review Maria Lopez as the recommended coverage option.
5. Approve Coverage Plan.
6. Open Decision Log.
7. Return to Tomorrow Readiness and show Operational Impact.
8. Open Pilot Materials.
9. Open Demo QA and confirm Ready for Demo.

## Pilot Setup Intake Flow

Pilot Setup is a local-only intake preview for limited, anonymized pilot exports. To exercise the upgraded flow:

1. Open `http://127.0.0.1:8765/?ui=standard`.
2. Open Pilot Setup.
3. Use Preview Template on Work Orders to confirm a Ready preview.
4. Upload a CSV with the required columns to preview local rows before Apply Import.
5. Confirm malformed, oversized, or missing-column CSV files show a Blocked state and keep Apply Import disabled.
6. Stage document metadata and notes locally; filenames and notes display as text, not markup.

CSV previews are capped at 200,000 characters. Template/export values that could be interpreted as spreadsheet formulas are prefixed for spreadsheet safety.

## Important Files

- `index.html`: static shell and script load order.
- `app.js`: main app state, demo data, rendering, navigation, event handling.
- `styles.css`: visual system, responsive behavior, dark mode, command mode.
- `demoShared.js`: small shared helper for timestamps, localStorage safety, status labels, and copy fallback.
- `pilotIntakeSafety.js`: Pilot Setup CSV parsing, import validation, safe text sinks, CSV export escaping, and URL protocol checks.
- `operationalCompression.js`: source-backed readiness summaries and copy packets.
- `operationalImpact.js`: deterministic impact snapshot, issue counts, conservative time-savings estimate, repeat patterns, and bottlenecks.
- `demoWalkthrough.js`: Pilot Story Mode step definitions, progress, and recap copy.
- `pilotReadinessPack.js`: pilot questions, data request, messages, scorecard, and business-case copy.
- `demoControlCenter.js`: Demo QA health report, audits, known limitations, reset plan, and QA report copy.
- `tests/`: focused Node tests for the deterministic utility layer.
- `scripts/verify-root.mjs`: dependency-free root syntax/test runner used locally and in CI.
- `.github/workflows/root-static-checks.yml`: focused CI for root static-app checks.

## Verification Commands

Run the commands that apply:

```powershell
node scripts\verify-root.mjs
```

That command runs the current root syntax checks and deterministic Node tests. The underlying checks are:

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
git diff --check -- app.js styles.css index.html README.md DEVELOPER_NOTES.md demoShared.js pilotIntakeSafety.js demoControlCenter.js pilotReadinessPack.js demoWalkthrough.js operationalImpact.js operationalCompression.js tests scripts AGENTS.md .github
```

This project is currently a static app and does not have a `package.json`, so `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` are not available unless a future pass adds package scripts.

## Visual Modes

CMTCommand includes two visual modes:

- Standard Mode: practical polished buyer-demo UI.
- Command Center Mode: darker premium operations-command-center treatment.

Open either mode directly:

```text
http://127.0.0.1:8765/?ui=standard
http://127.0.0.1:8765/?ui=command
```

The header Appearance control switches between modes. URL parameters override the saved local preference.

## Founder Demo Checklist

- Open Demo QA.
- Confirm Demo Health is Ready for Demo.
- Reset demo story if needed.
- Set preferred appearance and dark/light mode.
- Open Tomorrow Readiness.
- Start with "Scheduled does not mean ready."
- Run Pilot Story Mode or the manual TRD-104 path.
- Pause on the TRD-104 Readiness Packet.
- Approve Maria Lopez.
- Show Decision Log.
- Show Operational Impact.
- Open Pilot Materials.
- Copy the follow-up message after the meeting.

## Local State And Resets

CMTCommand uses browser-local state for demo preferences and selected walkthrough/checklist state. Demo reset controls intentionally avoid wiping unrelated browser storage.

Known CMTCommand keys include:

- `cmtcommand-ui-mode`: Standard or Command Center appearance preference.
- `cmtcommand-theme`: light/dark preference.
- `cmtcommand-demo-walkthrough`: Pilot Story Mode state.
- `cmtcommand-demo-control-checklist`: Demo QA pre-demo checklist state.

Full Demo Reset clears only the demo story/checklist state and preserves display preferences.

## Out Of Scope

- No backend.
- No login.
- No cloud persistence.
- No external AI.
- No real analytics.
- No exact ROI.
- Not a LIMS replacement.
- Not a scheduling replacement in the first pilot.
- No sensitive payroll, HR, pricing, or personal employee data required.

## Known Limitations

- Static demo data only.
- Local-only browser state.
- Conservative estimated time savings, not exact ROI.
- No live scheduling integration.
- No external CRM/email sending.
- Pilot would begin with limited anonymized exports.
