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

This MVP is local-only and does not call any external APIs.
