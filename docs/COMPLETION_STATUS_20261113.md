# Completion work — 13 November 2026

## Executed and verified

- Started the existing Python catalogue scheduler locally on 127.0.0.1:8090 with durable SQLite state under artifacts/completion-20261113/monitor. It runs in the explicitly launched process, checks every six hours and stops when that process or PC stops. No Windows startup task, system service or public tunnel was installed.
- Connected the local Express API using process-only SARFLOW_PROCESSOR_URL=http://127.0.0.1:8090. Verified /api/monitoring and the Observatory's expandable Processing connection panel in Chrome. An initial visibility assertion failed because the panel was inside a closed details element; opening the existing panel resolved the check. Screenshot retained locally.
- First actual cycle: Brahmaputra 22, Puget Sound 29, Sacramento 80, Rasuwa 51 catalogue records. Every location is metadata-only; downloaded=0, processed=0, alerts=0. These are catalogue counts at the configured points, not detected events.
- The scheduler detected NISAR_L2_GCOV_V1 as an unreviewed collection. Official ASF documentation identifies it as the validated GCOV collection: https://nisar-docs.asf.alaska.edu/earthdata-search/ . The running policy remains provisional until actual reader/measurement compatibility is reviewed.
- Extended scripts/discover_water_study.py with an explicit --collection choice for documented provisional or validated GCOV. Unknown collections fail before network access; maturities are never silently mixed. Existing default behavior is preserved.
- A separate query at 25.15 N, 89.8 E returned 20 provisional metadata records and two filename candidate groups. The validated collection returned three records and no four-date candidate group. No new HDF5 was downloaded or verified.
- OPERA_L3_DSWX-HLS_V1 reference discovery at the same point, 1 September–31 October 2026, returned 38 records without hitting the 100-record bound. These are optical reference candidates only, not downloaded labels or independent flood validation. Grid, cloud/shadow validity, temporal correspondence and sampling remain unreviewed. Official product information: https://podaac.jpl.nasa.gov/dataset/OPERA_L3_DSWX-HLS_V1 .
- Full Python suite: 79 tests passed. Targeted monitoring API suite: nine tests passed. Tests establish software behavior, not flood accuracy.

## GitHub block

Terminal push failed: Cannot prompt because user interactivity has been disabled / could not read Username. Connected GitHub blob upload failed with HTTP 403, Resource not accessible by integration. No branch or repository files were changed remotely. User selected reconnecting GitHub write access; completion of that reconnection has not been confirmed. No credentials, cookies or tokens were read or stored.

## Public deployment block

User confirmed only Vercel hosting is available. The existing long-running Python/SQLite/raster architecture is not deployed there. Its persistence and execution model needs a suitable separate host or a tested redesign. Local scheduler activity does not make the public worker available. Public monitoring remains unconfigured.

## Scientific block

Only the previously verified single Arctic GCOV acquisition was found; the Downloads copy is the same acquisition. No compatible four-date local series, reviewed aligned terrain input or independently prepared reference labels are available. Candidate metadata and OPERA catalogue matches do not replace these inputs. No flood accuracy, flood extent or scientific sign-off is fabricated.

## Local startup for this configuration

From the D: checkout, keep both explicitly launched processes open:

```powershell
.venv-water/Scripts/python.exe -m processor.service --storage artifacts/completion-20261113/monitor --port 8090
```

In a second PowerShell session:

```powershell
$env:SARFLOW_PROCESSOR_URL='http://127.0.0.1:8090'
npm run dev
```

Open http://127.0.0.1:5186/observatory and expand Processing connection. Do not start duplicate processes on these ports. Downloads are deliberately not enabled without manual authorized access and suitable inputs.

## Remaining actions

1. Complete GitHub write authentication, publish and verify the tested source.
2. Choose/authorize a persistent worker deployment or a separately specified Vercel-compatible processing redesign. No paid service was created or subscribed to.
3. Obtain actual compatible calibrated products and verify AOI, grids, processing versions, channels and support.
4. Prepare and review appropriate independent labels; execute the evaluator and report actual agreement/exclusions.

The Android preview remains a website wrapper; physical-device testing and standalone processing were not claimed or completed in this increment.
