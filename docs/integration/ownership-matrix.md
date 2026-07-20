# CMTCommand Integration Ownership Matrix

| Record Or Event | Owning system | Allowed writers | Read consumers | Notes |
| --- | --- | --- | --- | --- |
| Project | CMTCommand Operational | Dispatch/operational service | Field app, lab, dashboards | Dispatch creates and revises project context. |
| Work order | CMTCommand Operational | Dispatch/operational service | Field app, lab, dashboards | Work order status may derive from field and lab events. |
| Assignment | CMTCommand Operational | Dispatch/operational service | Field app, dashboards | Field app can accept an assignment but cannot publish it. |
| Field visit | Field app until ack, then server canonical | Field technician through event intake | Dispatch, lab, dashboards | Server acknowledgment makes the record canonical. |
| Concrete fresh properties | Field app until ack, then server canonical | Field technician through event intake | Dispatch, lab, dashboards | Advisory warnings only. No acceptance decision. |
| Test set | Field app until ack, then server canonical | Field technician through event intake | Dispatch, lab, dashboards | Identifies the concrete sample/test set. |
| Specimen | Field app and lab by custody state | Field technician and lab custody actors | Dispatch, lab, dashboards | One event equals one physical cylinder. |
| Lab receipt | Lab system | Lab receiving actor | Dispatch, field app, dashboards | Dispatch reads receipt status but cannot edit it. |
| Break schedule | Lab system | Lab scheduler | Dispatch, dashboards | Requires specimen receipt before scheduling. |
| Break result | Lab system | Testing technician | Dispatch, dashboards | Raw measured values are specimen-level evidence. |
| Age-group average | Lab system or verified result processor | Lab-owned processor/reviewer | Dispatch, dashboards | Derived only from referenced individual result-event IDs. |
| Lab review | Lab system | Reviewer role | Dispatch, dashboards | Review is separate from approval. |
| Lab approval | Lab system | Authorized approver | Dispatch, dashboards | Approved values are immutable. Corrections use amendments. |
| Lab amendment | Lab system | Authorized approver or reviewer by policy | Dispatch, dashboards | Must include reason, superseded event id, and audit trail. |
| Nonconformance | Lab or dispatch depending on source evidence | Lab reviewer or dispatch quality role | Dispatch, field app, dashboards | Operational flag only until reviewed. |
| Operational status | CMTCommand Operational/readiness | Dispatch service | Field app, lab, dashboards | May be derived from events; cannot mutate lab results. |
| Audit event | Server intake for all systems | Event intake service | Authorized audit viewers | Internal append-only evidence. |

## Write Prohibitions

- Dispatch must never create, edit, approve, or amend laboratory result values.
- Dashboards must never modify technical results or custody records.
- The field app must never overwrite acknowledged observations in place. Corrections are append-only.
- The lab system must not modify dispatch scheduling records directly.
- No system may bypass event intake to write another system database.
