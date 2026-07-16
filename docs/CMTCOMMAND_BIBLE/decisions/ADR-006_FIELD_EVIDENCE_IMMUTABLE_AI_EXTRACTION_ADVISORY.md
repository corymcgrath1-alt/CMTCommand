# ADR-006 Field Evidence Is Immutable And AI Extraction Is Advisory

## Document Status

- Status: Accepted Architecture Direction; Runtime Not Implemented
- Scope: Future Field Operations workstream
- Primary Evidence:
  - Field Operations Capture & Report Intelligence workstream brief, 2026-07-15
  - [Field Operations Capture And Reporting](../13_FIELD_OPERATIONS_CAPTURE_AND_REPORTING.md)
  - [Field Operations V1 Specification](../specs/FIELD_OPERATIONS_V1.md)
  - [ADR-004 Tenancy Authorization And Audit Model](ADR-004_TENANCY_AUTHORIZATION_AND_AUDIT_MODEL.md)
- Last Reviewed: 2026-07-15

## Context

Field reporting combines professional observations, source media, machine-generated suggestions, human review, sample handoffs, and customer-facing report packages. If originals can be silently replaced, AI suggestions become indistinguishable from confirmed facts, or approved reports can be overwritten, CMTCommand cannot provide a trustworthy evidence-to-report chain.

The current operational app does not yet have the identity, assignment, audit, storage, or field-reporting persistence needed to implement this decision. This ADR governs later work and does not authorize bypassing those prerequisites.

## Decision

Field Operations will apply all of the following rules:

1. Original evidence assets are immutable source records.
2. Display, thumbnail, normalized, transcoded, and other derived media are separately stored derivatives that reference the original.
3. Extraction and transcription outputs are advisory suggestions, never confirmed report facts on arrival.
4. Every suggestion retains source evidence, processor/version, confidence, source region/time where available, and review history.
5. Only an authorized human review action may accept or edit a suggestion into a confirmed report value.
6. Rejected, edited, conflicting, and superseded suggestions remain available for provenance and audit.
7. AI and integration adapters cannot attest, approve, finalize, or submit a professional report.
8. Submission or approval creates an immutable report version atomically with the state transition.
9. Amendments create later versions and never overwrite previously approved versions.
10. Manual capture, entry, review, and submission remain available when AI is absent or fails.

## Evidence Immutability

Immutability means:

- The stored original bytes are not rewritten in place by compression, rotation, normalization, annotation, extraction, or review.
- Original filename, detected type, byte size, SHA-256 hash, capture/upload time, uploader, tenant/assignment associations, and storage reference are preserved.
- Processing creates new derivative records and new storage objects.
- A derivative records the original asset, derivative type, media type, byte size, processing version, and creation time.
- Duplicate detection and retry use hash, assignment context, and idempotency; they do not silently merge unrelated evidence.

Immutability does not require indefinite retention. An approved retention or legal-deletion policy may remove source bytes through an authorized, audited lifecycle transition. The system preserves only the tombstone/audit metadata that policy permits and never presents deleted evidence as still available.

## Advisory Extraction

An extraction suggestion is not a report value. It is an immutable processor output plus mutable review status.

Required provenance:

- Field key.
- Raw and normalized suggested value.
- Confidence or confidence class.
- Evidence asset ID.
- Page, bounding region, frame, or time range where available.
- Processor type, provider-neutral processor name, processor version, and processing time.
- Schema-validation result.
- Review status, actor, time, and edit/rejection rationale where applicable.

The report field separately records whether its current value is human-entered, accepted from a suggestion, or human-edited from a suggestion. Editing a suggestion does not mutate the original processor output.

## Human Review Boundary

The following actions always require an authenticated, authorized human:

- Accepting or editing an extraction suggestion into a report field.
- Technician attestation.
- Submitting for technical review.
- Technical approval when required.
- Reopening, amending, voiding, exporting, or externally submitting according to policy.

Policy evaluation uses server-derived identity, organization membership, office/resource scope, role/capability, and current state. Hidden UI controls are not sufficient enforcement.

## Report Versions

The editable draft may change while the report is in an editable state. A finalizing transaction must:

1. Revalidate the expected draft revision and allowed state transition.
2. Re-evaluate required fields, unresolved conflicts, suggestion review, and required evidence.
3. Re-evaluate actor permission and technical-review policy.
4. Create the next immutable version containing structured values, narrative, evidence manifest, template/version, attestation, review actions, and amendment context.
5. Transition the report state.
6. Append the audit event.
7. Commit all changes together or none of them.

Exports and external synchronizations reference an exact immutable version, never a mutable draft.

## Provider Boundaries

- Private storage is accessed through a provider-neutral interface.
- Media processors receive immutable evidence references and create derivatives.
- Extraction processors return schema-validated advisory output.
- Report exporters receive immutable version inputs.
- External adapters receive approved version packages plus idempotency context.
- Provider SDK clients remain in server-only adapters and initialize lazily at runtime.

No provider is selected by this ADR.

## Security And Privacy Consequences

- Evidence objects are private by default; authorized access uses short-lived grants.
- Browser-supplied tenant IDs and storage keys are not authorization facts.
- Every persistent field record carries organization and applicable office/assignment scope.
- Logs must not include raw media, transcripts, signed URLs, full narrative contents, or secrets.
- Location metadata is event-based, optional, accuracy-qualified, and subject to retention policy.
- General audit records contain safe identifiers and state changes, not evidence contents.

## Alternatives Considered

### Replace originals with compressed media

Rejected. It reduces storage but destroys the original evidence chain and prevents later validation against source bytes.

### Persist extraction output directly as report values

Rejected. It collapses advisory automation into professional fact, hides uncertainty, and makes human accountability ambiguous.

### Keep only the latest approved report

Rejected. It prevents audit of what was previously approved or sent and makes amendments indistinguishable from silent edits.

### Disable the workflow when AI is unavailable

Rejected. AI is an accelerator, not a required source of truth or availability dependency.

## Consequences

Positive:

- Strong evidence-to-report provenance.
- Reviewable AI assistance without autonomous professional action.
- Reproducible exports and external synchronization.
- Clear amendment history.
- Safe manual fallback.

Tradeoffs:

- Higher storage and derivative-processing cost.
- More records and explicit review states.
- More complex retention/deletion design.
- Finalization requires a transaction spanning report version, state, and audit persistence.
- UI must communicate provenance and confidence without overwhelming field users.

## Compatibility Impact

- Root static demo: no runtime change.
- Operational vNext: no runtime, schema, route, or dependency change in FR-0.
- Future schema: must separate original assets, derivatives, suggestions, report fields, report versions, review actions, and audit events.
- Future API: must prevent direct provider output from becoming confirmed report values.

## Verification Requirements

Later implementation must prove:

- Original bytes/hash are not changed by derivative generation.
- Invalid/disguised media is rejected safely.
- Cross-tenant media and report access is denied.
- Malformed extraction output cannot populate report fields.
- Accept/edit/reject preserves provenance.
- No-provider manual workflow succeeds.
- Missing/unreviewed required fields block finalization.
- Unauthorized approval fails.
- Version creation and finalization are atomic.
- Amendment preserves prior versions.
- Exports and sync receipts reference an exact version.
- Production providers are not called by automated tests.

## Reversal Strategy

Superseding this ADR requires another explicit decision explaining how evidence integrity, human accountability, prior report versions, and manual fallback remain trustworthy. Existing immutable evidence and approved versions must not be rewritten during reversal.

## Open Questions

- What retention, deletion, and legal-hold policies apply to each evidence and report class?
- Which private storage and content-inspection providers satisfy the selected deployment model?
- Which report actions require a distinct technical reviewer?
- What evidence metadata may legally be retained from device files?
- What export format is the first approved human-readable package?
