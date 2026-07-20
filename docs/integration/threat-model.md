# CMTCommand Integration Threat Model

## Assets

- Tenant and branch boundaries.
- Work order and assignment integrity.
- Offline field observations and acknowledgment history.
- Specimen identity and chain of custody.
- Laboratory measurements, review, approval, and amendment history.
- Audit events, idempotency records, and cursor feeds.

## Primary Risks

| Risk | Control |
| --- | --- |
| Cross-tenant event injection | Server authorization checks tenant and branch before accepting or returning events. |
| Client-supplied actor spoofing | Server maps actor identity from authenticated context; envelope actor fields are evidence, not authorization proof. |
| Duplicate offline submissions | Stable idempotency keys and event ids produce duplicate acknowledgments rather than duplicate records. |
| Lost acknowledgments | Retrying the same idempotency key is safe and returns the accepted server state. |
| Stale revisions | Optimistic concurrency rejects stale updates and exposes conflicts. |
| Silent overwrite of field observations | Acknowledged records are corrected with append-only events. |
| Dispatch editing approved lab results | Contract and simulator reject dispatch-sourced lab result mutation attempts. |
| Out-of-order custody | Lab receipt requires a prior custody transfer event. |
| Uncalibrated or unidentified test equipment | Break results require testing machine id and calibration reference/status. |
| Result tampering after approval | Approved results are immutable; amendments append and supersede with reason and audit trail. |
| Overcollection of attachments or sensitive data | v1 only carries attachment metadata. No binary payloads, credentials, payroll, pricing, HR notes, medical data, or personal identity documents are required. |

## Auditability

Every accepted event records producer fields plus server receipt metadata in implementation. Dead-lettered events retain error code, event id, idempotency key, source system, tenant, branch, and correlation id for authorized operators. Audit views must not leak private field device drafts that have not been submitted.

## Data Minimization

The v1 payloads intentionally include operational concrete testing data and metadata only. They do not require real supplier credentials, customer secrets, private technician HR notes, personal financial data, or binary attachments.

## Non-Automation Boundary

Limit checks and nonconformance indicators are advisory operational flags. The contract does not automate engineering acceptance, rejection, certification, or professional sign-off.
