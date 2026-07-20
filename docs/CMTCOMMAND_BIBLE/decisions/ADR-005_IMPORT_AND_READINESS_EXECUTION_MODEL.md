# ADR-005 Import And Readiness Execution Model

## Document Status

- Status: Draft
- Primary Evidence:
  - Founder decision recorded in the Phase 3 Guarded Operational Architecture Selection task, 2026-07-13
  - `pilotIntakeSafety.js`
  - `tests/pilotIntakeSafety.test.js`
  - `docs/CMTCOMMAND_BIBLE/specs/PILOT_V1_TOMORROW_READINESS_AND_COVERAGE.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-002_OPERATIONAL_VNEXT_APPLICATION_ARCHITECTURE.md`
  - `docs/CMTCOMMAND_BIBLE/decisions/ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md`
- Last Reviewed: 2026-07-13

## Decision

Operational vNext should use a database-tracked import and readiness execution model:

- Imports have explicit lifecycle states and durable row outcomes.
- Preview and confirmation happen before source records are applied.
- Confirmed imports execute inside application services with transactional persistence.
- Readiness evaluates after accepted imports and after coverage decisions.
- Readiness rules execute in pure deterministic TypeScript.
- Snapshots persist evaluated results and rule-version context.
- No distributed queue is introduced for Pilot V1 unless measured pilot imports exceed the selected platform's reliable request/job limits.

## Import Lifecycle

```text
Received
-> Validating
-> Preview Ready
-> Awaiting Confirmation
-> Processing
-> Completed | Completed With Warnings | Failed | Cancelled
```

State meanings:

- Received: file metadata accepted for validation; ownership scope is known.
- Validating: file type, size, columns, row shape, sensitive columns, and duplicate checks are running.
- Preview Ready: validation produced a preview with row outcomes.
- Awaiting Confirmation: user can explicitly confirm or cancel.
- Processing: confirmed import is applying normalized records.
- Completed: records applied without blocking row failures.
- Completed With Warnings: accepted records applied with warnings preserved as data-quality issues.
- Failed: import did not apply successfully.
- Cancelled: user cancelled before execution.

## Validation Stages

1. File-type and size validation.
2. Malware/hostile-file risk handling according to selected platform capabilities.
3. Parser validation.
4. Column mapping.
5. Required-field validation.
6. Duplicate source-row detection.
7. Sensitive-column and secret-like value detection.
8. Organization and office ownership mapping.
9. Preview generation.
10. Data-quality issue generation.

## Preview And Confirmation

Preview must show:

- File metadata.
- Entity type.
- Column mapping.
- Required missing fields.
- Warnings.
- Blocking errors.
- Row-level outcomes.
- Sensitive-column findings.
- Whether confirmation is allowed.

No import should apply normalized records until an authorized user explicitly confirms it.

## Processing Model

Pilot V1 should begin with in-app processing behind explicit Route Handler or Server Action boundaries, using database-tracked state for observability and retry.

Do not introduce a distributed queue by default.

Use a managed job or queue later only if:

- Confirmed imports exceed the selected platform's request or execution limits.
- Imports need durable async execution independent of the web request.
- Concurrent imports block normal operation.
- Retry/resume requirements cannot be satisfied by database-tracked in-app jobs.

## Transaction Model

Confirmation and processing should use transactions for each import entity group where possible:

- Create or update import execution record.
- Apply normalized rows.
- Create row outcomes and data-quality issues.
- Mark affected work orders for readiness evaluation.
- Commit state change.

Do not present partially processed data as a successful import. If partial row acceptance is allowed, it must be explicit and visible as Completed With Warnings with row-level outcomes.

## Failure Handling

Failures must record:

- Import batch.
- File metadata.
- State at failure.
- Safe error category.
- Row-level outcome where known.
- Actor.
- Organization and office.
- Retry eligibility.

Do not log raw forbidden sensitive values or secrets.

## Idempotency

Imports should use an idempotency key derived from:

- Organization id.
- Office id.
- Import entity type.
- File checksum.
- User confirmation attempt id.

Duplicate file submissions should be detected and shown to the user. Retrying a failed processing step must not duplicate applied records.

## Snapshot Versus Incremental Import Implications

Snapshot replacement versus incremental update remains a product/data decision. Architecture must support either by storing:

- Import batch identity.
- Source-system identifiers.
- Source snapshot timestamp when provided.
- Row action outcome such as created, updated, unchanged, skipped, failed.
- Prior import relationship where applicable.

Until the decision is made, Phase 4 scaffolding should not encode only one import reconciliation strategy into irreversible schema names or UX copy.

## Raw-File Handling

Default recommendation:

- Do not retain raw import files long-term by default.
- Store file metadata, checksum, import type, row outcomes, normalized values needed for source-backed audit, and data-quality issues.
- If raw-file retention is required, use private object storage with explicit retention/deletion approval and access logging.

Retention duration remains unresolved.

## Sensitive-Column Detection

Import validation must detect prohibited or unexpected sensitive columns such as SSN, date of birth, home address, banking, payroll, medical, immigration, full background reports, personal disciplinary notes, after-hours location, unnecessary driver's-license details, unrelated documents, passwords, tokens, API keys, and credentials.

Sensitive detection should combine:

- Header-name rules.
- Secret-like value pattern checks.
- Entity-specific allowed column maps.
- Reviewable warnings for unexpected columns.

## Readiness-Trigger Model

Evaluate readiness:

- After an import is completed or completed with warnings when records affect work orders, assignments, people, equipment, certifications, clearances, service requirements, or calibrations.
- After a coverage proposal is approved.
- On demand when an authorized user requests recalculation.
- Optionally on a schedule only after Pilot V1 needs it.

Do not require event-streaming infrastructure for Pilot V1.

## Deterministic Rule Execution

The readiness engine must accept explicit facts and return explicit results. It must not query the database, inspect UI state, read session state, call network services, or depend on current wall-clock time except through an explicit evaluation context.

Status precedence remains:

```text
Not Ready > At Risk > Ready
```

## Rule Versioning

Every readiness snapshot should record:

- Rule set id.
- Rule set version.
- Evaluation timestamp or snapshot context.
- Input source snapshot references.
- Engine version or commit/build reference when available.

Changing business rules should create a new rule version and tests that explain behavior change.

## Readiness Snapshots

Snapshots should persist:

- Organization and office.
- Work orders evaluated.
- Final status per work order.
- Rule results.
- Explanations.
- Input snapshot references.
- Data-quality caveats.
- Evaluation status and errors.

Current mutable operational status is a projection from the latest accepted snapshot; historical snapshots remain readable for audit and explanation.

## Recalculation

Coverage approval must recalculate:

- The changed work order.
- Work orders assigned to the moved technician.
- Work orders using moved or constrained equipment.
- Any work orders whose coverage candidate set or hard-failure status changes because of the decision.

The recalculation boundary should be explicit and persisted so cascading impact can be explained.

## Cascading Coverage Effects

Cascading impact should be bounded by the dependency graph of directly affected technicians, equipment, assignments, and work orders in the current organization/office scope. Cross-office impact is not assumed unless cross-office coverage is approved by policy.

## Audit Requirements

Imports, readiness evaluations, coverage proposals, approvals, corrections, failures, and recalculations must create audit records or linked business Decision Log entries as appropriate.

## Testing Requirements

- Import lifecycle state-transition tests.
- Validation tests for malformed, missing, duplicate, sensitive, and secret-like inputs.
- Transaction tests for failed processing and retry.
- Idempotency tests.
- Snapshot persistence tests.
- Readiness rule unit tests independent of database.
- Recalculation dependency tests.
- Authorization tests for import and decision actions.
- Browser tests for preview, confirmation, failed import, and completed import status.

## Scaling Threshold For Queue Later

Add a managed job/queue only when real pilot evidence shows in-app database-tracked processing cannot complete safely within platform limits, cannot recover reliably from interruptions, or blocks user-facing operations under expected import volume.

Do not add distributed queue infrastructure preemptively.

## Open Questions

- [OPEN QUESTION - High Impact] Should initial imports replace complete source snapshots or support incremental updates?
- [OPEN QUESTION - High Impact] What raw-file retention and deletion policy is approved?
- [OPEN QUESTION - Medium Impact] Which CSV/XLSX parser packages should pass dependency review?
- [OPEN QUESTION - Medium Impact] What exact warning thresholds and coverage-ranking weights should the readiness engine use?
