# CMTCommand Integration Threat Model

## Assets

- Organization and office boundaries.
- Work order and assignment integrity.
- Offline field observations and acknowledgment history.
- Test-set and specimen identity.
- Specimen chain of custody.
- Laboratory measurements, review, approval, and amendment history.
- Audit events, idempotency records, and cursor feeds.

## Primary Risks

| Risk | Control |
| --- | --- |
| Cross-organization event injection | Server authorization derives organization and rejects mismatched event scope. |
| Cross-office event injection | Server authorization derives office scope and rejects unauthorized office changes. |
| Client-supplied actor spoofing | Server maps actor identity from authenticated context; envelope actor fields are evidence, not authorization proof. |
| Duplicate offline submissions | Stable idempotency keys and event IDs produce duplicate acknowledgments rather than duplicate records. |
| Lost acknowledgments | Retrying the same idempotency key is safe and returns the accepted server state. |
| Stale revisions | Optimistic concurrency rejects stale updates and exposes conflicts. |
| Silent overwrite of field observations | Acknowledged records are corrected with append-only events. |
| One cylinder represented as many specimens | `SpecimenCreated` represents one physical specimen and has no count field. |
| One specimen tested destructively more than once | The simulator rejects multiple schedules or original break results for one specimen. |
| Dispatch editing approved lab results | Contract and simulator reject dispatch-sourced lab result mutation attempts. |
| Out-of-order custody | Lab receipt requires a prior custody transfer event. |
| Uncalibrated or unidentified test equipment | Break results require current testing-machine calibration evidence. |
| Result tampering after approval | Approved results are immutable; amendments append and supersede with reason and audit trail. |
| Overcollection of attachments or sensitive data | v1 only carries evidence metadata. No binary payloads, credentials, payroll, pricing, HR notes, medical data, or personal identity documents are required. |

## Auditability

Every accepted event records producer fields plus server receipt metadata in a real implementation. Rejected events retain safe code, event id, idempotency key, source system, organization, office, and correlation id for authorized operators. Audit views must not leak private field-device drafts that have not been submitted.

## Non-Automation Boundary

Limit checks, averages, and nonconformance indicators are advisory operational flags. The contract does not automate engineering acceptance, rejection, certification, professional sign-off, or external submission.
