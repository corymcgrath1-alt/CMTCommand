# Field Operations V1

## Document Status

- Status: Draft Specification; Runtime Not Implemented
- Scope Label: Future Workstream
- Current Gate: Path B / FR-0 architecture only
- Primary Evidence:
  - Field Operations Capture & Report Intelligence workstream brief, 2026-07-15
  - [Field Operations Capture And Reporting](../13_FIELD_OPERATIONS_CAPTURE_AND_REPORTING.md)
  - [ADR-006 Field Evidence Is Immutable And AI Extraction Is Advisory](../decisions/ADR-006_FIELD_EVIDENCE_IMMUTABLE_AI_EXTRACTION_ADVISORY.md)
  - [Field Operations Implementation Plan](../plans/FIELD_OPERATIONS_IMPLEMENTATION_PLAN.md)
  - [Phase 5H Production Governance And Pilot Readiness](../plans/PHASE_5H_PRODUCTION_GOVERNANCE_AND_PILOT_READINESS.md)
- Last Reviewed: 2026-07-16

## Product Decision And Current Status

This specification defines a future concrete-placement field-reporting slice. It does not expand or replace the founder-approved 90-day Tomorrow Readiness and Coverage pilot. Phase 5H founder decisions exclude Field Operations from that original pilot, require an internal alpha before customer field technician use, and require a separately authorized customer Field Operations pilot after internal-alpha acceptance and production-readiness gates.

The repository now has local/test foundations for authenticated identity/RBAC,
durable assignments/work orders, audit-event persistence, and private
assignment media storage. It still has no production identity provider,
production object storage, malware scanner, retention policy, Field Session,
report workflow, extraction job, sample workflow, or production field-reporting
runtime. Target API paths are contracts for later implementation, not callable
routes.

## Goal

Connect an authorized dispatch assignment to field capture, advisory extraction, human review, immutable report versioning, sample handoff, dispatcher visibility, and internal export without allowing AI or external systems to bypass professional review.

## Actors And User Stories

### Field Technician

- As a technician, I can see my authorized assignments for the day.
- I can start the assigned field session and continue manual entry without AI or GPS.
- I can capture JPEG, PNG, or WebP images up to 25 MB in the alpha and initial pilot without mandatory cropping.
- I can add tests, text notes, and sample sets.
- I can review evidence-linked suggestions as unconfirmed values.
- I can accept, edit, or reject suggestions while preserving provenance.
- I can see missing/conflicting information, attest, and submit to the required destination.

### Dispatcher / Operations Manager

- I can see session, report, evidence, ticket, and sample exception status without opening each report.
- I can see whether technician action, reviewer action, or sample pickup is required.
- I can determine operational completion without confusing it with Tomorrow Readiness or engineering acceptance.

### Technical Reviewer

- I can review structured values, evidence, narrative, contradictions, attestation, and report history.
- I can approve or return a report according to policy.
- I can require an amendment without overwriting an approved version.

### Laboratory Receiver

- I can confirm sample receipt and append authorized sample-status events.

## Functional Requirements

### Assignment And Session

- FO-001: `My Day` returns only assignments visible to the authenticated actor.
- FO-002: A field session can start only for an existing authorized assignment.
- FO-003: A session records organization, office, assignment, technician, status, and event times.
- FO-004: Location capture is optional, explicit, event-based, and never required for report completion.
- FO-005: Session status and report status remain separate.

### Evidence

- FO-010: The first release supports image evidence and text notes for general photo, truck ticket, test result, observation/deficiency, and sample-related categories; audio and video are deferred.
- FO-011: Configured limits support JPEG, PNG, and WebP originals up to 25 MB for the alpha and initial pilot.
- FO-012: Actual content/media type is validated server-side.
- FO-013: The original asset is private, hashed, immutable, and distinct from derivatives.
- FO-014: Upload initiation and completion are authorized and idempotent.
- FO-015: Retry does not create uncontrolled duplicate assets.
- FO-016: A failed derivative or extraction never deletes or replaces the original.
- FO-017: Permanent public media URLs are forbidden.

### Extraction And Review

- FO-020: Extraction providers are accessed through a provider-neutral processor interface.
- FO-021: Processor output is validated against a strict server-side schema before persistence.
- FO-022: Suggestions retain field, value, confidence, evidence, source region/time, processor, version, and review status.
- FO-023: Suggestions do not populate confirmed report values without an authorized review action.
- FO-024: Accept, edit, and reject actions preserve the original suggestion and actor/time provenance.
- FO-025: Extraction unavailable/failed state leaves upload, manual entry, review, and submission available.
- FO-026: No automated test calls a production AI provider.

### Concrete Report

- FO-030: One report draft belongs to an authorized assignment/session/template context.
- FO-031: Required fields resolve deterministically from configuration, not a universal hard-coded list.
- FO-032: Manual entry is always available for required values.
- FO-033: Missing required fields, conflicts, and unreviewed required suggestions block finalization.
- FO-034: Technician attestation is an explicit authorized action.
- FO-035: A designated technical reviewer must approve a concrete report before it is treated as finalized or exported during the alpha and pilot.
- FO-036: Finalization and immutable version creation are atomic.
- FO-037: Amendments create later immutable versions with a reason and predecessor link.
- FO-038: Draft, reviewed, approved, exported, and externally submitted are visibly distinct.
- FO-039: Operations managers may monitor status and return reports for correction, but do not receive technical-approval authority solely because of their operational role.

### Samples

- FO-040: A technician can create a cylinder/specimen set from the assigned session.
- FO-041: Sample identifiers, counts, molding/curing data, pickup need, planned ages, and remarks are supported.
- FO-042: Status changes are append-only events with actor and time.
- FO-043: Invalid sample transitions fail without changing current state.
- FO-044: Dispatch can see awaiting pickup, overdue, in transit, received, and exception state.

### Dispatch And Completion

- FO-050: Dispatcher status includes assignment, technician, session, report, last activity, evidence count, ticket presence, sample count, pickup need, and next required actor.
- FO-051: Field-reporting status does not alter Tomorrow Readiness classification.
- FO-052: Operational completion is deterministic and is not engineering acceptance.

### Export And Integration

- FO-060: The first slice exports one immutable versioned PDF plus structured JSON package and evidence manifest.
- FO-061: The customer's existing reporting platform remains the official destination during the pilot.
- FO-062: Every export references an exact report version and creates an audit event.
- FO-063: External adapters use mappings and idempotent synchronization records.
- FO-064: External success is recorded only after provider confirmation.

## State Machines

### Field Session

| From | Allowed next states | Required condition |
| --- | --- | --- |
| `not_started` | `active` | Authorized technician/session-start action. |
| `active` | `paused`, `capture_complete` | Pause is explicit; capture completion satisfies configured capture checks or records an authorized exception. |
| `paused` | `active`, `capture_complete` | Authorized resume or completion. |
| `capture_complete` | `closed` | Report/sample handoff conditions satisfied. |
| `closed` | none | Reopening requires a separate explicitly designed transition, not mutation. |

### Report

| From | Allowed next states |
| --- | --- |
| `not_started` | `draft` |
| `draft` | `needs_information`, `ready_for_technician_review` |
| `needs_information` | `draft`, `ready_for_technician_review` |
| `ready_for_technician_review` | `draft`, `technician_reviewed` |
| `technician_reviewed` | `awaiting_technical_review`, `approved` |
| `awaiting_technical_review` | `needs_information`, `approved` |
| `approved` | `exported`, `amended`, `voided` |
| `exported` | `submitted_external`, `amended`, `voided` |
| `submitted_external` | `amended`, `voided` |
| `amended` | `draft` for a new version lineage |
| `voided` | none; replacement is a new report/version lineage |

`technician_reviewed -> approved` is not permitted for the alpha or initial
pilot because Phase 5H requires designated technical-review approval before a
concrete report is finalized or exported. Every transition requires permission
evaluation and audit. Finalizing transitions create a version atomically.

### Evidence Processing

| From | Allowed next states |
| --- | --- |
| `pending_upload` | `uploaded`, `processing_failed` |
| `uploaded` | `processing`, `quarantined`, `ready` |
| `processing` | `ready`, `processing_failed`, `quarantined` |
| `processing_failed` | `processing`, `deleted_under_policy` |
| `ready` | `processing`, `deleted_under_policy` |
| `quarantined` | `processing`, `deleted_under_policy` |
| `deleted_under_policy` | none |

Deletion removes or makes source bytes inaccessible only under approved policy while preserving the permitted audit/tombstone metadata. It is not an in-place edit.

### Sample Set

| From | Allowed next states |
| --- | --- |
| `created` | `initial_curing`, `exception` |
| `initial_curing` | `awaiting_pickup`, `exception` |
| `awaiting_pickup` | `in_transit`, `exception` |
| `in_transit` | `received_by_lab`, `exception` |
| `received_by_lab` | `closed`, `exception` |
| `exception` | Any valid operational recovery state authorized by policy, with reason. |
| `closed` | none |

## Report Template And Required Fields

### Requirement Resolution

The resolver receives organization, office, service type, project, client, and report-template versions. More specific approved configuration may add or tighten requirements but must not silently remove statutory/organization requirements. The resolver returns field key, data type, required status, units/options, validation rules, evidence requirement, review policy, and configuration provenance.

### Assignment And Project Context

- Project, project number, work order, assignment, client, technician, inspection date, service type.
- Placement location, specification/mix requirements, and report recipients.

### Delivery And Ticket

- Supplier, plant, ticket/truck numbers, mix design, batch/arrival/discharge times.
- Ticket and cumulative quantity, water added, admixtures, rejection indicator, ticket notes.

### Field Observations And Tests

- Ambient/concrete temperature, slump, air content, unit weight when applicable.
- Placement method/activity/location, weather, observed deviations, communication, disposition notes, narrative.

### Samples

- Sample-set/specimen identifiers, counts, molding time, initial-curing location.
- Pickup/lab receipt status, planned test ages, and remarks.

Not every candidate field is universally required.

## Validation Rules

- All client/external inputs are schema-validated.
- Identifiers use stable internal IDs; human/source numbers are separate.
- Tenant scope is derived server-side and checked at service and query boundaries.
- Timestamps include time zone or unambiguous UTC representation.
- Numeric tests validate configured units, bounds, and precision without inventing values.
- Required-field validation runs against a versioned template/requirement result.
- Finalization rejects missing, invalid, conflicting, or required-unreviewed values.
- Uploaded bytes are bounded, hashed, sniffed, and checked against declared media.
- Location includes permission state/source/accuracy and never implies false precision.
- Extraction output is rejected safely if malformed; rejected output does not write report fields.
- Idempotency keys are scoped to actor/organization/assignment/action and cannot be reused across tenants.

## Permission Rules

| Capability | Technician | Dispatcher / Ops | Technical Reviewer | Org Admin | Lab Receiver |
| --- | --- | --- | --- | --- | --- |
| View own assignment | Allow | Office-scoped allow | Review-scoped allow | Organization-scoped allow | Deny by default |
| Start assigned session | Allow | Reassign/override only if separately granted | Deny | Policy-dependent | Deny |
| Add evidence/edit own draft | Allow while editable | Policy-dependent | Return/comment; edit only if granted | Policy-dependent | Deny |
| Attest technician review | Own report only | Deny | Deny | Deny | Deny |
| Submit for review | Own report | Policy-dependent | Deny | Policy-dependent | Deny |
| Technically approve | Deny by default | Only if reviewer role separately assigned | Allow within review scope | Only if reviewer role separately assigned | Deny |
| Reopen/amend/void | Deny by default | Policy-dependent | Policy-dependent | Policy-dependent | Deny |
| Update sample pickup | Policy-dependent | Allow within office | Review only | Policy-dependent | Transit/receipt role only |
| Confirm lab receipt | Deny | Review only | Review only | Policy-dependent | Allow |
| Manage templates/integrations | Deny | Deny by default | Review only | Allow when configured | Deny |

Every allowed action also requires active identity, organization membership, office/resource scope, current-state eligibility, and audit context.

## Target API Contracts

These contracts are design targets. No route is implemented in FR-0.

### Contract Rules

- Session middleware/context resolves `actorId`, `organizationId`, office scope, roles, and request/correlation ID.
- Client-supplied organization IDs are ignored as authorization facts.
- Mutations accept an idempotency key where retry is plausible.
- Route Handlers validate/authorize and delegate to services; they do not own domain transitions.
- Large media uses an authorized direct/presigned flow when the selected provider supports it.
- Responses never expose storage keys, permanent URLs, raw provider errors, or cross-tenant existence.

### Resource Contracts

| Method and target path | Purpose | Required capability | Notes |
| --- | --- | --- | --- |
| `GET /api/my-day?date=` | List actor-visible assignments. | `field_assignment:view_own` or office view. | Server derives tenant scope. |
| `GET /api/assignments/{assignmentId}/field-status` | Read dispatcher/technician status projection. | Assignment view. | Inaccessible and nonexistent are equivalent. |
| `POST /api/assignments/{assignmentId}/field-sessions` | Start a session. | `field_session:start`. | Idempotent for same assignment/technician/start request. |
| `POST /api/field-sessions/{id}/transitions` | Pause/resume/complete/close. | State-specific session capability. | Expected current state required. |
| `POST /api/field-sessions/{id}/evidence/uploads` | Initiate private upload. | `evidence:create`. | Returns short-lived provider-neutral upload grant. |
| `POST /api/evidence/{id}/complete-upload` | Confirm hash/metadata and enqueue processing. | `evidence:create`. | Server validates stored object. |
| `GET /api/evidence/{id}/access` | Obtain short-lived authorized preview/download. | `evidence:view`. | Never permanent/public. |
| `POST /api/evidence/{id}/extractions` | Request extraction when available. | `extraction:request`. | Manual workflow remains available. |
| `POST /api/reports/{id}/suggestions/{suggestionId}/review` | Accept/edit/reject. | `report_suggestion:review`. | Original suggestion preserved. |
| `PATCH /api/reports/{id}/fields/{fieldKey}` | Enter/edit a draft field. | `report_draft:edit`. | Optimistic concurrency/expected revision. |
| `POST /api/reports/{id}/transitions` | Attest, submit, return, approve, reopen, amend, void. | State-specific report capability. | Approval/version creation is atomic. |
| `GET /api/reports/{id}/versions/{version}` | Read immutable version. | `report:view`. | Returns versioned manifest/view model. |
| `POST /api/reports/{id}/exports` | Create versioned PDF plus structured JSON export. | `report:export`. | References exact immutable version; direct external submission remains deferred. |
| `POST /api/field-sessions/{id}/sample-sets` | Create sample set. | `sample_set:create`. | Updates status projection transactionally. |
| `POST /api/sample-sets/{id}/events` | Append sample state event. | State-specific sample capability. | Expected current state required. |

### Error Contract

Errors use stable categories:

```json
{
  "status": "error",
  "code": "validation_error | forbidden | not_found_or_inaccessible | conflict | processing_unavailable | persistence_failure",
  "message": "Safe user-facing summary",
  "issues": [],
  "requestId": "safe-correlation-id"
}
```

No error exposes a stack trace, provider credential, signed URL, storage key, raw transcript, or cross-tenant existence.

## Provider-Neutral Interfaces

Illustrative contracts for the future server/domain boundary:

```ts
interface PrivateEvidenceStorage {
  beginUpload(input: AuthorizedUploadRequest): Promise<UploadGrant>;
  inspectUploadedObject(input: StoredObjectReference): Promise<StoredObjectFacts>;
  createAuthorizedReadGrant(input: AuthorizedReadRequest): Promise<ReadGrant>;
  deleteUnderPolicy(input: RetentionDeletionRequest): Promise<DeletionReceipt>;
}

interface EvidenceProcessor {
  createDerivatives(input: ImmutableEvidenceInput): Promise<DerivativeResult>;
}

interface ExtractionProcessor<TOutput> {
  readonly processorType: string;
  extract(input: ImmutableEvidenceInput): Promise<TOutput>;
}

interface ReportExporter {
  exportVersion(input: ImmutableReportVersionInput): Promise<ExportArtifact>;
}

interface ExternalReportAdapter {
  synchronize(input: ApprovedVersionSyncRequest): Promise<SyncReceipt>;
}
```

Provider-specific implementations remain server-only and may not finalize reports.

## Operational Completion

`operationallyComplete` is true only when:

```text
session requirements complete
AND required evidence or authorized exceptions resolved
AND technician attestation complete
AND required technical review complete
AND approved/exported package condition satisfied
AND sample disposition recorded when samples exist
```

## Acceptance Criteria

1. A JPEG, PNG, or WebP image up to 25 MB is accepted without mandatory cropping.
2. Original evidence remains distinct from thumbnail/preview derivatives and retains a hash.
3. Disguised or invalid media is rejected safely.
4. Cross-organization evidence, report, sample, and assignment access is denied.
5. Upload retry is idempotent and does not create uncontrolled duplicates.
6. A technician can complete the manual workflow with no extraction provider.
7. Malformed extraction output cannot populate report fields.
8. Suggestions remain unconfirmed until an authorized human accepts or edits them.
9. Accepted, edited, and rejected suggestions retain provenance.
10. Missing required fields prevent finalization.
11. An unauthorized actor cannot approve a report.
12. Technician attestation is explicit and cannot be performed by AI.
13. Submission/approval creates an immutable version atomically.
14. Amendment creates a later version and preserves prior approved versions.
15. Invalid session, report, evidence, and sample transitions are rejected.
16. Sample creation and events update the dispatcher projection.
17. Location denial does not block the workflow and location is event-scoped.
18. Failed derivative, extraction, export, or synchronization degrades safely.
19. External sync references the exact approved version and never fabricates success.
20. Every material action has an audit record with tenant, actor, target, time, and correlation context.
21. Existing tenancy and root static-demo verification continues to pass.

## Explicitly Out Of Scope For FR-1

- Continuous/background location and employee productivity surveillance.
- Automatic project or plan-location confirmation.
- Computer-vision engineering acceptance or autonomous professional judgment.
- Fully autonomous report finalization/submission.
- Production Procore/email synchronization.
- Direct external system submission in the first release.
- Every inspection/report template.
- Full LIMS, billing, payroll, CRM, and customer portal replacement.
- Audio, video, HEIC/HEIF, and GPS/location capture in the first release.
- Unlimited/real-time video analytics.
- Native mobile apps and full offline-first synchronization.
- Automatic deletion/replacement of original evidence.

## Open Decisions Before FR-1

- Exact production auth/session foundation and role assignments.
- Assignment/work-order/project schema and import boundary.
- Production audit operations, retention, and monitoring.
- Storage provider, malware/content inspection implementation, and retention policy.
- Required concrete fields, units, ranges, and detailed technical-review rules.
- Temporary internal-alpha retention policy.
- Monthly infrastructure budget caps.
- Minimum offline behavior.
- Evidence/location/report retention and legal-hold requirements.
