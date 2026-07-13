# Code Review Checklist

## Document Status

- Status: Draft
- Primary Evidence:
  - `AGENTS.md`
  - `docs/CMTCOMMAND_BIBLE/10_TESTING_AND_ACCEPTANCE.md`
- Last Reviewed: YYYY-MM-DD

## Acceptance Criteria

- [ ] The change satisfies the stated acceptance criteria.
- [ ] Unstated product behavior was not changed silently.
- [ ] Failure paths are handled and visible where appropriate.

## Scope

- [ ] Diff touches only intended root CMTCommand files.
- [ ] No unrelated `euchre-platform/`, `brackethub/`, artifact, cache, log, ZIP, workbook, or `_migration_review/` files are included.
- [ ] No unrelated refactor, rename, broad formatting, or speculative abstraction.

## Correctness And Data Integrity

- [ ] Existing TRD-104/Maria Lopez story invariants still hold when relevant.
- [ ] Derived values remain source-backed and conservative.
- [ ] LocalStorage/reset behavior preserves unrelated storage.
- [ ] Import/export behavior preserves valid data and rejects/flags invalid data.

## Permissions And Security

- [ ] Role UI was not treated as real authorization unless a real permission system was added and tested.
- [ ] User-controlled CSV/file/document/pilot text is not inserted into raw `innerHTML`.
- [ ] CSV export uses formula-safe handling.
- [ ] URL-valued sinks use an allowlist.
- [ ] No real credentials, sensitive personal data, payroll, HR, or pricing data is required.

## Compatibility

- [ ] `index.html` script order is valid.
- [ ] Utilities remain dependency-free UMD modules unless explicitly changed.
- [ ] No package manager, dependency, backend, schema, or deployment config was added without explicit scope.
- [ ] Existing visual modes remain intact.

## Tests And Verification Claims

- [ ] `node scripts\verify-root.mjs` was run or a reason was given.
- [ ] `git diff --check` was run for touched files or a reason was given.
- [ ] Browser smoke was run for UI/state changes or a reason was given.
- [ ] Pilot Setup hostile/malformed/oversized cases were checked if trust boundaries changed.
- [ ] Verification claims list exact commands and results.

## Documentation

- [ ] Relevant README, developer notes, AGENTS, or Bible chapters were updated only when behavior/guidance changed.
- [ ] Unsupported claims are labeled as inferred or open questions.
- [ ] Relative links resolve.

## Generated Files Dependencies Migrations Debug Artifacts

- [ ] Generated/local artifacts are not included unless intentionally scoped.
- [ ] Dependency and lockfile changes are justified by actual dependency changes.
- [ ] No migration/destructive operation is included without explicit approval.
- [ ] No debug-only code, `.only`, `.skip`, conflict markers, or temporary logs remain.
