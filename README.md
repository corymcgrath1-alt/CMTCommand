# CMTCommand

CMTCommand is a local, static MVP for an operations command center serving CMT, geotechnical, inspection, drilling, and materials laboratory firms.

## Run locally

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

## What's included

- Command Center dashboard with risk alerts and resource readiness
- Dispatch map with work order recommendation ranking
- Projects, work orders, technician readiness, certifications, and equipment modules
- Lab, geotechnical, reports, billing, and settings preview modules
- Role-based navigation
- Global search
- Sortable and filterable tables
- Realistic sample data generated fully in-browser
- Field Status & Dispatch Location with work-hour-only operational visibility
- Cascading coverage analysis for emergency dispatch decisions
- Approved partner firm recommendations using local demo vendor data
- Outsource decision support for when internal coverage would leave critical work uncovered
- Escalation summary for manager review
- Emergency Dispatch Decision Log created from local action-button clicks and shown in Dispatch plus Command Center activity
- Data Intake Center for local CSV import/export, document upload staging, and smart extraction preview
- CSV import previews with required-column validation and local apply/cancel controls
- Future OCR/AI extraction roadmap placeholder with review-assisted confirmation before saving

This MVP is local-only and does not call any external APIs.
