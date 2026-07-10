# CMTCommand vNext Review

Date: 2026-07-10

Selected slice: Trusted Pilot Intake and Render Safety.

## Review Method

Phase 7 used independent read-only reviewers for correctness/regression risk, security/trust boundaries, architecture/maintainability, test adequacy/false-positive risk, and product/accessibility/contract behavior. Reviewers were given the selected plan, acceptance criteria, and current diff. After blocking and medium findings were fixed, fresh read-only re-review was run for the changed security/test/product concerns.

No reviewer edited files. `euchre-platform/` was treated as unrelated and out of scope.

## Findings And Resolutions

| Track | Initial judgment | Finding | Resolution | Final disposition |
| --- | --- | --- | --- | --- |
| Correctness/regression | Pass | No blocking correctness issue. Noted a non-blocking stale-read/cancel test gap. | Existing read-token and read-error tests/browser checks retained. | Pass. |
| Security/trust boundaries | Fail | High: pilot request confirmation copied untrusted `company` into `state.pilotConfirmation` and rendered it through `innerHTML`. | `app.js` now escapes `state.pilotConfirmation`; browser validation submits hostile company text and asserts no unsafe nodes or execution while preserving text. | Fresh security re-review passed; only low note is that this path is browser-artifact coverage, not part of the dependency-free Node verifier. |
| Architecture/maintainability | Pass | Low: documented whitespace check was not enforced by CI/local verifier. | `scripts/verify-root.mjs` now checks trailing whitespace for root verifier files before syntax/tests; CI uses the same verifier. | Resolved. |
| Test adequacy | Fail | High: browser artifact collected critical values but did not assert them. | `phase5-browser-validation.cjs` now fails nonzero on assertion failures and records 72 passing assertions. | Fresh focused re-review passed. |
| Test adequacy | Fail | Medium: AC11 TRD-104 compatibility lacked objective browser coverage. | Browser validation now drives TRD-104 -> Maria approval -> Decision Log -> Pilot Materials -> Demo QA -> Full Demo Reset. | Resolved. |
| Test adequacy | Partial | Low: malformed CSV did not directly assert applied import state unchanged. | Browser validation now records import-history count before/after malformed upload and asserts unchanged. | Resolved. |
| Product/contract | Pass with lows | Low: Work Orders template preview did not sync the upload type select. | `state.intakeSelectedEntity` preserves selected/imported type; browser validation asserts Work Orders preview selects Work Orders. | Resolved. |
| Product/contract | Pass with lows | Low: malformed CSV preview still said `1 rows staged`. | Parse-error previews now say "Preview blocked by parse errors"; browser validation asserts staged-row copy is hidden. | Resolved. |
| Product/contract | Fail after re-review | Medium: malformed CSV Smart Intake Summary still implied partial rows were imported. | `operationalCompression.js` now returns a blocked parse-error summary with `Accepted rows: 0`, `Copy Parse Error`, and no "imported" wording; Node and browser tests assert this. | Fresh focused re-review passed. |

## Final Re-Review

Fresh security re-review: pass. Evidence cited `app.js` confirmation escaping, CSV/document text sinks, `blob:` URL allowlist, and formula-safe CSV export. No remaining XSS, URL injection, CSV formula injection, or local privacy issue was found in scope.

Fresh focused test/product re-review: pass. The reviewer confirmed browser validation asserts hostile headers/cells, valid hostile values, malformed CSV behavior, multiple missing columns, partial cleanup copy, reload-cleared transient state, Demo QA utility row pass, command+dark mobile behavior, preference persistence, and TRD-104 Maria approval. The reviewer also confirmed malformed CSV copy no longer implies accepted/imported rows.

## Remaining Non-Blocking Notes

- Browser/CDP validation is not part of `node scripts\verify-root.mjs` or CI because it requires a running local HTTP server and an Edge CDP session. It remains the release handoff gate for product behavior.
- No manual assistive-technology session was run. Browser evidence covers headings, labels, keyboard focus, visible focus, and no horizontal overflow, but not a full screen-reader transcript.
- Root `app.js` and `styles.css` still include pre-existing unrelated hunks recorded in `baseline.md`; these were preserved rather than reverted.
- Dirty `euchre-platform/` work remains unrelated and untouched.

## Final Judgment

Pass for the selected release slice. No unresolved blocking, high, or medium findings remain in the Trusted Pilot Intake and Render Safety scope.
