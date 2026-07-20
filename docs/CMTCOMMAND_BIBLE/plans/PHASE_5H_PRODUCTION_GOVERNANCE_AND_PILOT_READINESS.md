# Phase 5H Production Governance And Pilot Readiness

## Document Status

- Status: Founder decisions recorded; production remains unauthorized.
- Date: 2026-07-16
- Scope: Architecture, security, privacy, operations, cost, and founder-decision readiness before any production pilot or Field Operations FR-1 authorization.
- Runtime impact: Documentation only. No runtime feature, production provider, secret, deployment, or infrastructure was added.
- Founder decision source: CMTCommand Phase 5H Founder Decisions, 2026-07-16.
- Authorization result: Phase 5I production-readiness implementation is authorized after these decisions are recorded. Internal Field Operations alpha, customer Field Operations pilot, and Field Operations FR-1 coding remain unauthorized.
- Primary evidence:
  - [CMTCommand Bible Index](../00_INDEX.md)
  - [Vision And Product Principles](../01_VISION_AND_PRODUCT_PRINCIPLES.md)
  - [Users Roles And Workflows](../03_USERS_ROLES_AND_WORKFLOWS.md)
  - [System Architecture](../04_SYSTEM_ARCHITECTURE.md)
  - [Data Model And Integrations](../05_DATA_MODEL_AND_INTEGRATIONS.md)
  - [Security Privacy And Permissions](../09_SECURITY_PRIVACY_AND_PERMISSIONS.md)
  - [Deployment And Operations](../11_DEPLOYMENT_AND_OPERATIONS.md)
  - [Decisions Roadmap And Open Questions](../12_DECISIONS_ROADMAP_AND_OPEN_QUESTIONS.md)
  - [Field Operations Capture And Reporting](../13_FIELD_OPERATIONS_CAPTURE_AND_REPORTING.md)
  - [Field Operations V1](../specs/FIELD_OPERATIONS_V1.md)
  - [Field Operations Implementation Plan](FIELD_OPERATIONS_IMPLEMENTATION_PLAN.md)
  - [Phase 5D Identity And RBAC Report](PHASE_5D_IDENTITY_RBAC_REPORT.md)
  - [Phase 5E Durable Operational Records Report](PHASE_5E_DURABLE_OPERATIONAL_RECORDS_REPORT.md)
  - [Phase 5F General Audit Persistence Report](PHASE_5F_GENERAL_AUDIT_PERSISTENCE_REPORT.md)
  - [Phase 5G Private Object Storage Report](PHASE_5G_PRIVATE_OBJECT_STORAGE_REPORT.md)
  - [ADR-007 Server-Derived Authorization Scope](../decisions/ADR-007_SERVER_DERIVED_AUTHORIZATION_SCOPE.md)
  - [ADR-008 Dispatch Assignments Are The Field Operations Handoff](../decisions/ADR-008_DISPATCH_ASSIGNMENTS_ARE_THE_FIELD_OPERATIONS_HANDOFF.md)
  - [ADR-009 Material Mutations Write Transactional Append-Only Audit Events](../decisions/ADR-009_MATERIAL_MUTATIONS_WRITE_TRANSACTIONAL_APPEND_ONLY_AUDIT_EVENTS.md)
  - [ADR-010 Private Object Storage And Authorized Media Upload Foundation](../decisions/ADR-010_PRIVATE_OBJECT_STORAGE_AND_AUTHORIZED_MEDIA_UPLOAD_FOUNDATION.md)
  - [Production Threat Model](../security/PRODUCTION_THREAT_MODEL.md)
  - [Data Lifecycle And Retention Draft](../policies/DATA_LIFECYCLE_AND_RETENTION_DRAFT.md)
  - [Pilot Production Readiness Checklist](../checklists/PILOT_PRODUCTION_READINESS.md)

## Executive Result

Phase 5H records the founder decisions needed to authorize the next
production-readiness implementation phase. It does not approve production use,
internal Field Operations alpha, customer Field Operations pilot, or Field
Operations FR-1 coding.

The local/test technical foundation is strong: tenancy, identity/RBAC,
dispatch records, append-only audit, and private assignment media have been
verified against isolated PostgreSQL and local S3-compatible storage. Founder
decisions now approve the production architecture category, identity/database/
storage/hosting categories, Field Operations sequencing, first report type,
initial media limits, support ownership, manual fallback, success metrics, stop
conditions, and customer-pilot evidence requirements. Specific vendors,
production implementation, retention periods, customer/legal approvals,
malware-scanner implementation, production restore proof, monitoring, incident
response, and detailed report-template specification remain future work.

Founder-approved direction: Option A, simplified managed pilot architecture.
It should use managed Next.js-compatible hosting, managed PostgreSQL, managed
private object storage, managed identity, protected secrets, provider-level
logging/monitoring, and minimal background processing. Specific vendors are not
approved; Phase 5I must compare the smallest viable shortlist using current
official pricing, capabilities, lock-in, security, and operational burden.

## Current Readiness

| Area | Current result | Readiness |
| --- | --- | --- |
| Local/test technical foundation | Phase 5D through Phase 5G verified users, memberships, roles, office scope, dispatch records, audit events, private media, upload sessions, derivatives, signed reads, and browser acceptance. | Ready for the next bounded local/test implementation phase. |
| Production technical foundation | Development auth and local-test storage are disabled or rejected in production-like runtimes. No production provider, deployment, secret store, backups, monitoring, IAM, or storage lifecycle exists. | Not ready. |
| Governance | Founder decisions are recorded for architecture category, Field Operations sequencing, report governance baseline, media limits, support ownership, success metrics, stop conditions, and production evidence. Vendor selection, implementation, legal/customer retention, budget, and detailed report templates remain pending. | Phase 5I authorized; production still not approved. |
| Pilot operating model | Tomorrow Readiness and Coverage Pilot V1 remains separate. Field Operations will start as an internal alpha, then a separately authorized customer pilot after alpha acceptance and production-readiness gates. | Sequencing approved; alpha and customer pilot not yet authorized. |
| Field Operations readiness | P2 durable records, local/test P3 audit, and local/test P4 media prerequisites are technically complete. P1 production identity, P4 production storage/scanning/retention, detailed P5 report templates, and Phase 5I production foundation remain incomplete. | FR-1 remains blocked. |

## Decisions Already Established

| Established decision | Source | Consequence |
| --- | --- | --- |
| CMTCommand is an Engineering Testing Operations Command Center. | Founder decision, 2026-07-13. | Product direction remains operations-command-center oriented. |
| The first operational wedge is Tomorrow Readiness plus Coverage Decision System. | Founder decision, 2026-07-13. | Field Operations must not silently replace the initial pilot. |
| Pilot V1 is a 90-day, single-office pilot. | Founder decision, 2026-07-13. | Multi-office and Field Operations pilots require new approval. |
| Customer systems remain source of truth for underlying operational records. | Founder decision, 2026-07-13. | CMTCommand records decisions and operational projections unless an integration contract changes this. |
| Operational vNext is a Next.js App Router modular monolith in `apps/operational/`. | ADR-001 through ADR-003. | The root static demo remains preserved. |
| PostgreSQL plus Drizzle is the selected relational foundation. | ADR-002. | Exact managed PostgreSQL provider remains unresolved. |
| Managed identity plus app-owned RBAC is the authorization model. | ADR-004 and ADR-007. | Exact production identity provider remains unresolved. |
| Server-derived organization, office, role, and assignment scope are mandatory. | ADR-007 through ADR-010. | Browser-supplied actor, tenant, office, key, or permission claims are untrusted. |
| Dispatch assignments are the Field Operations handoff. | ADR-008. | Future field sessions must start from durable authorized assignments. |
| Material mutations write transactional append-only audit events. | ADR-009. | Retention, legal hold, read auditing, and SIEM remain production work. |
| Assignment media uses private object storage, immutable originals, separate derivatives, and short-lived reads. | ADR-010. | Production storage, malware scanning, object lock, retention, and IAM remain unresolved. |
| Original field evidence is immutable; AI extraction is advisory. | ADR-006. | Human review and provenance remain mandatory for reports. |

## Decision Area Register

| Area | Recommendation | Decision status |
| --- | --- | --- |
| Production identity | Use a managed identity provider category that supports invitations, MFA, revocation, stable provider subject IDs, multi-organization membership, emergency recovery, auditability, and future provider migration. | Founder-approved category; specific vendor deferred to Phase 5I. |
| Hosting and runtime | Use managed Next.js-compatible hosting with separate preview and production environments, TLS, controlled promotion, rollback, health checks, and restricted production access. | Founder-approved category; specific vendor deferred to Phase 5I. |
| Production PostgreSQL | Use managed PostgreSQL with encrypted connections, restricted networking, separate application and migration roles, automated backups, point-in-time recovery, monitoring, and tested exports. | Founder-approved category; specific vendor deferred to Phase 5I. |
| Production object storage | Use managed private object storage with public access blocked, encrypted transport and storage, server-generated keys, restricted CORS, short-lived signed operations, lifecycle support, and provider-export capability. | Founder-approved category; specific vendor deferred to Phase 5I. |
| Malware and file safety | Require malware scanning before customer uploads. Internal alpha may proceed without a commercial scanner only through explicit temporary risk acceptance, image-only formats, private storage, and manual operator review. | Founder decision recorded; implementation deferred to Phase 5I or later alpha gate. |
| Retention and deletion | Final retention periods require customer and legal review. No customer pilot begins before approval. No ordinary user deletion; controlled purge requires organization-admin authorization plus a designated CMTCommand production operator and audit. | Founder decision recorded; legal/customer review still required. |
| Privacy and monitoring | Continuous employee monitoring is prohibited. GPS is deferred. EXIF metadata is minimized; embedded GPS is not used automatically; unnecessary metadata is stripped from derivatives. | Founder decision recorded; privacy notices still require legal/customer review. |
| Backup and recovery | Target database RPO of one hour or less and service RTO of four hours or less, pending provider-cost confirmation. Production-like database restore and media/database reconciliation are mandatory before customer pilot authorization. | Provisional founder decision recorded; Phase 5I must validate cost and implementation. |
| Monitoring and incident response | Monitor app availability, database health, storage/upload/audit/backup failures, authorization anomalies, cross-tenant attempts, capacity, and credential compromise indicators. Written incident-response runbook is mandatory. | Founder decision recorded; implementation deferred to Phase 5I. |
| Pilot operating model | Field Operations is excluded from the original Tomorrow Readiness and Coverage pilot. It starts as internal alpha, then a separately authorized customer pilot after alpha acceptance and production-readiness gates. | Founder decision recorded; alpha and customer pilot not yet authorized. |
| Report and template governance | Concrete placement is first. Assigned technician owns and attests draft; designated technical reviewer approves; operations manager may return but not technically approve by role alone; AI is advisory; approved reports are immutable; initial export is PDF plus JSON; customer reporting platform remains official. | Founder decision recorded; detailed template specification still required. |
| Production authorization gate | Require approved production providers, identity with MFA/revocation, managed PostgreSQL, private storage, malware scanning, media limits, retention/deletion policy, backup/restore proof, monitoring, incident runbook, onboarding/offboarding, production-like E2E, report rules, customer agreement, fallback, support owners, and founder go/no-go. | Founder decision recorded; execution deferred to Phase 5I and later gates. |

## Production Architecture Options

| Option | Description | Security | Reliability | Complexity | Cost | Lock-in | Pilot suitability |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. Simplified managed pilot | Managed Next.js hosting, managed PostgreSQL, managed private object storage, managed identity, protected secrets, minimal background processing. | Strong if provider defaults are locked down and app-owned RBAC remains primary. | Good enough for pilot with backups, restore test, and monitoring. | Lowest. | Predictable fixed baseline plus usage. | Moderate. | Founder-approved architecture category for Phase 5I. |
| B. Cloud-vendor consolidated | App runtime, database, storage, key management, monitoring, and security controls concentrated in one cloud. | Strong if IAM and network boundaries are configured well. | High with integrated backup and monitoring. | Medium to high. | Can be efficient at scale, but setup and governance overhead are higher. | High. | Useful if customer compliance requires one cloud posture. |
| C. Portability-focused | Provider-neutral app deployment, managed PostgreSQL, S3-compatible storage, external managed identity, explicit exit controls. | Strong if portability does not weaken provider-native controls. | Good, but more operational stitching. | Highest for pilot. | Harder to forecast; portability controls add effort. | Lower. | Better after pilot learning validates long-term requirements. |

Founder-approved option: Option A, simplified managed pilot. It best matches
the selected Next.js architecture, low-operations pilot goal, and current
provider-neutral code boundaries. Specific vendors remain unapproved; Phase 5I
must compare the smallest viable shortlist using current official pricing,
capabilities, lock-in, security, and operational burden before provisioning.

## Identity Recommendation

Requirements:

- Stable provider subject IDs independent of email.
- Invite-only onboarding with acceptance tracking.
- MFA support for administrators and privileged users; founder decision needed
  for technician MFA and passwordless policies.
- Session expiration, revocation, and account deprovisioning.
- Multi-organization users with server-side active-organization revalidation.
- Organization-admin recovery and emergency access with audit.
- Provider outage behavior that fails closed for protected mutation paths.
- Provider migration plan that preserves internal user IDs and maps new
  provider subjects explicitly.

Recommended category: managed identity provider with OIDC-compatible token
verification, hosted sign-in or passwordless options, MFA, invitation flows,
session revocation, and audit/admin APIs. Do not implement a custom password
store.

Decision status: founder-approved category; specific provider selection
deferred to Phase 5I.

## Hosting And Runtime Recommendation

Production runtime must provide:

- Separate development, staging, and pilot-production environments.
- TLS by default and no public development auth adapter.
- Region/residency selected before any real customer data enters the system.
- Environment promotion with explicit migration and rollback steps.
- Deployment history, pinned runtime versions, and owner-approved releases.
- Readiness health checks for app, database, and storage dependencies.
- Background work only where measured need exceeds request/transaction limits.
- Maintenance windows and incident communication owner.

Decision status: founder-approved category; specific provider selection
deferred to Phase 5I.

## PostgreSQL Recommendation

Production PostgreSQL should be managed unless a later compliance requirement
demands self-hosting. Managed selection criteria:

- Region/residency alignment with customer contract.
- Encryption at rest and TLS in transit.
- Restricted network access and protected connection strings.
- Separate migration and application roles.
- Least-privilege grants for application runtime.
- Connection pooling compatible with the selected host.
- Automated backups, point-in-time recovery, and restore-test schedule.
- Monitoring for connections, latency, locks, storage, slow queries, and failed
  backups.
- Provider export and exit path.
- RLS evaluation as defense in depth after app-owned authorization remains in
  place.

Decision status: founder-approved category; specific provider selection
deferred to Phase 5I.

## Object Storage Recommendation

Production storage must not assume MinIO. Provider selection criteria:

- Private bucket by default with public access blocked.
- TLS in transit and encryption at rest.
- Key ownership and rotation policy.
- Short signed URL expiration and no permanent public URLs.
- Restrictive CORS scoped to the approved production origin.
- Server-generated object names with tenant/assignment prefixes.
- Versioning and optional object lock decision for originals.
- Lifecycle tiers, egress-cost forecasting, and media-heavy limits.
- Backup/replication expectation and provider-exit export.
- Region/residency matching the database and customer agreement.

Decision status: founder-approved category; specific provider selection
deferred to Phase 5I.

## Malware And File-Safety Recommendation

Current Phase 5G controls:

- Declared media allowlist.
- Server-side byte-size and SHA-256 verification.
- Magic-byte media detection independent of extension.
- Declared/detected media compatibility check.
- Image dimension and pixel-count limits.
- Private originals with separate derivatives.
- No public bucket or permanent public URL.

Residual risk:

- No antivirus or malware scanner exists.
- No quarantine workflow exists.
- PDFs are detected by header but not deeply inspected.
- Password-protected files, archives, active SVG/HTML content, and decompression
  bombs require explicit policy controls.

Founder decision: malware scanning is required before customer uploads are
authorized. An internal alpha may proceed without a commercial scanner only
through explicit temporary risk acceptance, restricted image-only formats,
private storage, and manual operator review.

Founder-approved alpha media limits:

- Permitted alpha media types: JPEG, PNG, and WebP.
- HEIC/HEIF remains disabled until reliable decoding and derivative generation
  are proven in the production environment.
- Maximum original image size: 25 MB for the alpha and initial pilot.
- Audio and video are deferred from the first Field Operations release.
- SVG, HTML, archive, executable, and active content remain excluded from the
  initial image-only UI.

Decision status: founder decision recorded; implementation and scanner
selection deferred to Phase 5I or the later alpha gate.

## Data Lifecycle And Privacy Recommendation

Use the [Data Lifecycle And Retention Draft](../policies/DATA_LIFECYCLE_AND_RETENTION_DRAFT.md) as the framework, not as final legal policy.

Boundaries:

- Continuous/background GPS and employee productivity surveillance remain
  prohibited by existing documentation.
- Location, if later approved, must be explicit, optional, event-based, and
  scoped to an assignment action.
- EXIF and other metadata should be minimized; retain only fields required for
  evidence integrity, customer obligation, or approved operational use.
- Audit events should retain safe metadata and exclude signed URLs, credentials,
  tokens, full media content, transcripts, and report bodies.
- Controlled deletion requires policy, authorization, audit tombstones, backup
  expiration handling, and legal-hold override.

Founder decisions recorded:

- Continuous employee monitoring is prohibited.
- GPS and location are deferred. No continuous or background location tracking
  is allowed. A later proposal may support optional, explicit, event-based
  assignment location.
- Preserve only EXIF metadata required for evidentiary integrity.
- Do not use embedded GPS automatically.
- Strip unnecessary metadata from derivatives.
- Final retention periods require customer and legal review. Until approved, no
  customer pilot begins.
- Internal-alpha data requires a separately documented temporary retention
  policy.
- No ordinary user deletion exists. Controlled purge requires
  organization-admin authorization plus a designated CMTCommand production
  operator, with a durable audit event.
- Architecture must support a future legal-hold state. A formal legal-hold
  workflow is not required for internal alpha but must be resolved before a
  customer contract requires it.

Decision status: founder decision recorded; legal/customer review still
required for customer retention and contract terms.

## Backup And Recovery Recommendation

Founder provisional recovery objective:

- Target database RPO: one hour or less.
- Target service RTO: four hours or less.
- Phase 5I must confirm provider cost before final approval.

Required minimums for pilot:

- PostgreSQL automated backups with point-in-time recovery.
- Restore test before pilot launch and on a recurring schedule.
- Media/database reconciliation procedure that verifies every ready media asset
  has reachable original and derivative objects.
- Backup encryption and limited recovery authority.
- Cross-service recovery runbook covering database, object storage, identity,
  and deployment rollback.
- Corruption detection and incident-recovery checklist.

Decision status: provisional founder decision recorded; Phase 5I must validate
cost and implementation.

## Monitoring And Incident Response Recommendation

Production pilot must include:

- Application errors, request rates, latency, and health.
- Database connection, storage, backup, and migration alerts.
- Object storage availability, capacity, request errors, public-access drift,
  and egress/cost thresholds.
- Failed upload and derivative processing alerts.
- Audit-write failure alerts.
- Authorization-denial anomaly and cross-tenant attempt alerts.
- Credential compromise procedure.
- Data exposure procedure.
- Incident severity levels, notification responsibility, evidence preservation,
  and post-incident review.

Decision status: founder decision recorded; implementation deferred to Phase
5I.

## Pilot Operating Model Recommendation

Founder decision:

- Field Operations will not be included in the original Tomorrow Readiness and
  Coverage pilot.
- Field Operations will begin as an internal alpha and then become a separately
  authorized customer pilot.
- Internal alpha is required before any customer field technician uses uploads
  or field-reporting workflows.
- The customer Field Operations pilot is separately authorized only after
  internal-alpha acceptance and all production-readiness blocking gates pass.

Initial Field Operations alpha limits:

- One internal organization.
- One office.
- Named users only.
- Concrete placement only.
- Images only.
- Maximum 25 MB per image.
- No GPS.
- No external integrations.
- Existing reporting workflow remains available.

Pilot support decisions:

- Cory is the initial CMTCommand product and escalation owner.
- The customer must designate one organization administrator and one operational
  contact before a customer pilot.
- Customer organization administrators manage ordinary membership changes.
- CMTCommand controls initial organization provisioning and verified final
  offboarding.
- The customer's existing dispatch and reporting process remains available
  throughout the pilot.

Decision status: founder decision recorded; internal alpha and customer pilot
remain unauthorized until later gates pass.

## Report And Template Governance Recommendation

Founder decisions recorded:

- First report type: concrete placement inspection report.
- The assigned technician owns the draft and must attest that it accurately
  reflects their observations and test results.
- A designated technical reviewer must approve a concrete report before it is
  treated as finalized or exported during the alpha and pilot.
- Operations managers may monitor status and return reports for correction, but
  do not receive technical-approval authority solely because of their
  operational role.
- AI remains advisory. Extracted and drafted information must be reviewed by a
  human. AI cannot attest, approve, sign, or submit a report.
- Approved reports are immutable. Corrections create a new version with an
  amendment reason, actor, timestamp, and link to the previous version.
- Initial export is versioned PDF plus structured JSON.
- Direct submission to external systems remains deferred.
- The customer's existing reporting platform remains the official destination
  during the pilot. CMTCommand prepares, reviews, versions, and exports the
  report but does not initially replace the customer's system of record.

Still required before FR-1:

- Detailed concrete-placement field list, units, bounds, evidence requirements,
  exception rules, and template versioning.
- Customer/client-specific requirements and disclaimer language.
- Alpha acceptance criteria and production-like test fixtures.

Decision status: founder decision recorded; detailed report-governance
specification still required.

## Production Authorization Gate

Pilot-production implementation is not authorized until all blocking gates in
the [Pilot Production Readiness Checklist](../checklists/PILOT_PRODUCTION_READINESS.md)
are complete or explicitly accepted by the founder with documented risk.
Customer Field Operations pilot is not authorized. FR-1 coding is not
authorized until Phase 5I defines and implements the approved production
foundation and the report-governance specification is completed.

## Cost Model

No current official vendor price research was performed for Phase 5H, and no
precise vendor prices are claimed. Founder should approve a monthly budget cap
before vendor selection.

Variables:

- `HOST_FIXED`: app hosting fixed cost.
- `DB_FIXED`: managed PostgreSQL baseline.
- `DB_STORAGE_GB`: database storage.
- `OBJ_STORAGE_GB`: original and derivative media storage.
- `OBJ_REQUESTS`: PUT/GET/HEAD/list requests.
- `EGRESS_GB`: browser/download egress.
- `IDP_USERS`: identity users or monthly active users.
- `LOG_GB`: log and monitoring ingest/retention.
- `SCAN_FILES`: malware-scanned files.
- `BACKUP_GB`: backup storage.
- `EMAIL_EVENTS`: invitation/notification delivery.
- `SUPPORT_HOURS * SUPPORT_RATE`: human support.

| Scenario | Fixed cost drivers | Usage cost drivers | Optional controls | Unknowns |
| --- | --- | --- | --- | --- |
| Small internal alpha | Low `HOST_FIXED`, low `DB_FIXED`, no production customer support. | Low users, low media, low egress. | Malware scanning may be manual or disabled only by explicit founder risk acceptance. | Staff time and test-media limits. |
| One-office customer pilot | `HOST_FIXED`, `DB_FIXED`, identity, monitoring, backup, support. | Technician uploads, storage, signed reads, logs, email. | Malware scanning, object lock, enhanced monitoring. | Actual field media volume, support demand, customer retention terms. |
| Five-office pilot | Larger database/storage, more identity users, higher monitoring/support. | More assignments, uploads, reads, audit events, logs. | SIEM, enhanced backups, stronger support coverage. | Cross-office training and customer-admin effort. |
| Media-heavy pilot | Storage and egress dominate. | High `OBJ_STORAGE_GB`, `OBJ_REQUESTS`, `EGRESS_GB`, `SCAN_FILES`. | Lifecycle tiers, compression/derivative policies, cost alerts. | Average media size, duplicate rate, read frequency, retention duration. |

Cost classification:

- Fixed: hosting baseline, database baseline, identity baseline, monitoring
  baseline, domain/certificates where applicable.
- Usage-based: storage, requests, egress, log ingest, malware scanning, email,
  backups, support hours.
- Optional controls: object lock, SIEM, advanced monitoring, enhanced backup
  geography, managed WAF.
- Cannot yet estimate: vendor-specific discounts, customer contractual
  retention, support SLA, legal review, data residency, and malware scanning
  provider model.

## Founder Decision Register

| Decision | Recommended option | Alternatives | Consequence | Deadline or prerequisite | Status |
| --- | --- | --- | --- | --- | --- |
| Field Operations timing | Internal alpha, then separately authorized customer pilot. | Same 90-day pilot or indefinite deferral. | Keeps Field Operations out of the original Tomorrow Readiness and Coverage pilot. | Recorded before Phase 5I. | Founder decision recorded. |
| Internal alpha | Required before customer field technician use. | Skip alpha. | Prevents customer exposure before upload/report workflow proof. | Before customer field use. | Founder decision recorded; alpha not yet authorized. |
| First report type | Concrete placement inspection report. | Other report types deferred. | Sets initial domain and template scope. | Before FR-1 specification. | Founder decision recorded. |
| Report ownership | Assigned technician owns draft and attests observations/test results. | Manager-owned or reviewer-owned draft. | Preserves field accountability. | Before FR-1 specification. | Founder decision recorded. |
| Technical review | Designated technical reviewer approval required before finalized/exported alpha or pilot report. | Technician-only or operations-manager approval. | Separates operations management from technical authority. | Before FR-1 specification. | Founder decision recorded. |
| Operations-manager authority | Monitor status and return reports for correction; no technical approval by operational role alone. | Grant technical approval to operations manager. | Prevents accidental authority expansion. | Before FR-1 permissions. | Founder decision recorded. |
| AI authority | Advisory only; cannot attest, approve, sign, or submit. | AI-populated or AI-submitted reports. | Preserves human professional review. | Before extraction/report features. | Founder decision recorded. |
| Amendments | Approved reports immutable; corrections create new version with reason, actor, timestamp, and prior-version link. | In-place edits. | Preserves report history. | Before report versioning. | Founder decision recorded. |
| Initial export | Versioned PDF plus structured JSON. | Direct external submission. | Provides reviewable/exportable package while integrations remain deferred. | Before FR-1 export. | Founder decision recorded. |
| Official report destination | Customer's existing reporting platform remains official during pilot. | CMTCommand as official system of record. | Defines source-of-truth boundary. | Before customer pilot agreement. | Founder decision recorded. |
| Malware scanning before customer upload | Mandatory. | Internal alpha exception only. | Controls customer media risk. | Before customer uploads. | Founder decision recorded. |
| Internal alpha scanner exception | May proceed without commercial scanner only with explicit temporary risk acceptance, image-only formats, private storage, and manual operator review. | Require scanner even for internal alpha. | Allows controlled learning without customer data. | Before alpha start. | Founder decision recorded; risk acceptance still required. |
| Pilot media types | JPEG, PNG, and WebP. | HEIC/HEIF, PDF, audio, video. | Keeps initial media processing simple and inspectable. | Before alpha implementation. | Founder decision recorded. |
| Maximum image size | 25 MB per original image for alpha and initial pilot. | Smaller or larger limit. | Controls UX, cost, and DoS risk. | Before media implementation change. | Founder decision recorded. |
| Audio and video | Deferred from first Field Operations release. | Include voice/video capture. | Reduces privacy, storage, processing, and review complexity. | Before FR-1 scope. | Founder decision recorded. |
| GPS/location | Deferred; no continuous/background tracking. Later proposal may support optional explicit event-based assignment location. | Background GPS or required location. | Avoids surveillance and notice risk. | Before field pilot. | Founder decision recorded. |
| Continuous employee monitoring | Prohibited. | Passive productivity/location monitoring. | Protects worker privacy boundary. | Ongoing. | Founder decision recorded. |
| EXIF metadata | Preserve only metadata required for evidentiary integrity; do not use embedded GPS automatically; strip unnecessary derivative metadata. | Preserve all metadata. | Minimizes privacy exposure. | Before production media processing. | Founder decision recorded. |
| Pilot retention | Final periods require customer and legal review; no customer pilot begins until approved. | Invent fixed duration now. | Prevents accidental legal commitment. | Before customer pilot. | Founder decision recorded; legal/customer review required. |
| Internal-alpha retention | Use separately documented temporary retention policy. | Reuse customer policy or leave undefined. | Keeps alpha data bounded. | Before alpha start. | Founder decision recorded; policy still required. |
| Deletion authorization | No ordinary user deletion; controlled purge requires organization-admin authorization plus designated CMTCommand production operator and durable audit. | Ordinary user delete. | Protects evidence and audit integrity. | Before purge feature. | Founder decision recorded. |
| Legal hold | Architecture must support future legal-hold state; formal workflow not required for internal alpha but required when customer contract requires it. | Ignore legal hold. | Keeps future compliance path open. | Before customer contract requiring hold. | Founder decision recorded. |
| Architecture option | Option A simplified managed pilot. | Option B consolidated cloud, Option C portability-focused. | Controls Phase 5I provider shortlist. | Before Phase 5I. | Founder decision recorded. |
| Hosting category | Managed Next.js-compatible hosting with preview/production environments, TLS, promotion, rollback, health checks, and restricted production access. | Self-hosting or unmanaged runtime. | Sets production runtime criteria. | Phase 5I. | Founder decision recorded. |
| Database category | Managed PostgreSQL with encrypted connections, restricted networking, separate app/migration roles, backups, PITR, monitoring, and tested exports. | Self-hosted DB. | Sets production database criteria. | Phase 5I. | Founder decision recorded. |
| Storage category | Managed private object storage with blocked public access, encryption, server-generated keys, CORS restrictions, short-lived signed operations, lifecycle support, and export. | MinIO as production default or public bucket. | Sets production storage criteria. | Phase 5I. | Founder decision recorded. |
| Identity category | Managed identity with invitations, MFA, revocation, stable subject IDs, multi-org membership, emergency recovery, auditability, and migration path. | Custom auth. | Sets production identity criteria. | Phase 5I. | Founder decision recorded. |
| Provider selection | Phase 5I compares smallest viable shortlist using current official pricing, capabilities, lock-in, security, and operational burden. | Select vendor silently. | Prevents accidental vendor lock-in. | Phase 5I. | Founder decision recorded. |
| Recovery objective | Database RPO one hour or less and service RTO four hours or less, provisional pending provider cost. | Stricter or looser objectives. | Drives provider cost and runbooks. | Phase 5I provider comparison. | Provisional founder decision recorded. |
| Restore testing | Production-like database restore and media/database reconciliation required before customer pilot. | Best-effort backups. | Proves recoverability. | Before customer pilot. | Founder decision recorded. |
| Outage behavior | Never falsely report saved/submitted data; fail clearly and preserve manual fallback. | Silent queue or optimistic success. | Protects data integrity. | Before production workflows. | Founder decision recorded. |
| Manual fallback | Customer's existing dispatch and reporting process remains available throughout pilot. | CMTCommand-only operations. | Keeps continuity. | Before customer pilot. | Founder decision recorded. |
| Monitoring | Cover app availability, database health, storage/upload/audit/backup failures, authorization anomalies, cross-tenant attempts, capacity, and credential compromise indicators. | Minimal health check only. | Supports pilot operations. | Phase 5I. | Founder decision recorded. |
| Incident response | Written runbook, severity model, notification owner, credential rotation, evidence preservation, and customer notification path required. | Ad hoc response. | Establishes operational accountability. | Before customer pilot. | Founder decision recorded. |
| Support owner | Cory is initial CMTCommand product and escalation owner; customer names org admin and operational contact. | Undefined support ownership. | Names escalation path. | Before alpha/customer pilot. | Founder decision recorded. |
| Onboarding/offboarding | Customer org admins manage ordinary membership changes; CMTCommand controls initial provisioning and verified final offboarding. | Customer-only or internal-only. | Clarifies access ownership. | Before pilot operations. | Founder decision recorded. |
| Initial alpha limits | One internal organization, one office, named users, concrete placement only, images only, 25 MB max, no GPS, no external integrations, existing reporting workflow available. | Broader alpha. | Keeps alpha bounded. | Before alpha start. | Founder decision recorded; alpha not yet authorized. |
| Customer Field Operations pilot | Separately authorized after internal-alpha acceptance and all blocking production-readiness gates pass. | Immediate customer pilot. | Creates explicit release gate. | After alpha. | Founder decision recorded. |
| Infrastructure budget | Founder must set monthly caps for internal alpha, one-office customer pilot, and five-office pilot. | No budget cap. | Prevents cost drift. | Before Phase 5I final provider selection. | Founder decision still required. |
| Success metrics | Report-prep time, media rework time, missing-field rate, report-return rate, dispatch follow-up burden, upload success, technician satisfaction, reviewer time, security/privacy incidents. | Unmeasured alpha/pilot. | Defines learning goals. | Before alpha. | Founder decision recorded. |
| Pilot stop conditions | Cross-tenant exposure, audit loss, unrecoverable report/media loss, repeated bad auth, malware failure, failed backup/restore controls, material privacy violation, no manual fallback, or customer stop request. | Informal stop policy. | Defines hard safety stops. | Before alpha/customer pilot. | Founder decision recorded. |
| Customer pilot evidence | Approved providers, identity with MFA/revocation, DB/storage controls, malware scanning, media limits, retention/deletion, restore proof, monitoring, incident runbook, onboarding/offboarding, production-like tests, report rules, customer agreement, fallback, support owners, founder go/no-go. | Ad hoc production approval. | Prevents accidental launch. | Before customer pilot. | Founder decision recorded. |

## ADR Position

No Phase 5H ADR is created. The founder decisions approve categories,
sequencing, and gates, but specific production vendors, legal/customer
retention terms, temporary alpha retention, budget caps, and detailed
report-template rules remain implementation, legal/privacy, customer-specific,
or vendor-selection questions. They should not be marked as accepted
architecture decisions until Phase 5I or a later scoped phase produces
evidence.

## Next Executable Gate

Phase 5I production-readiness implementation is authorized after these founder
decisions are recorded. Phase 5I should compare the smallest viable provider
shortlist using current official pricing, capabilities, lock-in, security, and
operational burden; define production-like secrets, identity, database,
storage, backup, restore, monitoring, incident-response, and malware-scanning
controls; and preserve provider-neutral application boundaries.

Phase 5I must not implement Field Operations FR-1. Internal Field Operations
alpha remains unauthorized until Phase 5I and alpha-specific retention/risk
acceptance gates pass. Customer Field Operations pilot remains unauthorized
until internal-alpha acceptance and all customer pilot blocking gates pass.

## Remaining Founder Decision

1. What maximum monthly infrastructure budget is acceptable for the internal
   alpha, one-office customer pilot, and five-office pilot scenarios?
