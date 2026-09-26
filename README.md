# SARFlow — See Earth Move.

An independent Earth-change investigation application built around the supplied NASA Space Apps 2026 **Dancing with the SARs** brief. This directory is a separate application; the existing EMFLARE project in `../app` is preserved.

**Scientific status:** A working research/education demonstrator with **15 actual NISAR visualization scenes** from NASA GIBS, matching provisional GCOV catalog records, and preserved source requests/hashes. The real-observation workspace supports geographic exploration, playback, synchronized swipe comparison, and investigation export. Built-in quantitative analyses use clearly labeled **synthetic teaching arrays**, not orbital NISAR measurements. RGB visualization colors are never treated as calibrated power. No real-event classification has been validated.

## Real-observation workspace

Open `/observatory` (or choose **Explore**). Three regions—Brahmaputra floodplain, Puget Sound, and Sacramento Valley—each contain four actual dated daily mosaics. Scenes are archived locally for a reliable judge experience; this is not a live satellite feed. Features include scene search, geographic pan/zoom, full screen, matching-granule footprints, coordinate inspection, time playback, shared-camera swipe comparison, layer opacity, user interpretation notes, original-image downloads, and evidence export.

`public/data/observatory.json` records the collection, full acquisition identifiers, exact NASA WMS requests, bounds, dates, and file hashes. The daily mosaic can contain multiple products; a matching granule does not establish the source of every displayed pixel. The archive chooses repeated track/frame/mode groups, but this alone does not establish quantitative comparability of rendered mosaics.

Reproduce the public archive with `node scripts/archive-observatory.mjs`, then `node scripts/archive-thumbnails.mjs`. These scripts access public NASA services without credentials. They overwrite only the generated archive assets; keep a copy if retaining a particular snapshot matters.

## Start locally

Requires Node 22.12+ (tested with Node 24.19), npm, and a modern WebGL-capable browser.

```powershell
cd C:\Users\rifat\Downloads\files\sarflow
npm ci
npm run dev
```

Open **http://127.0.0.1:5186/**. API: **http://127.0.0.1:5187/api/health**. On Windows, `START-SARFLOW.cmd` starts both services after dependencies are installed. Keep the terminal open. Avoid starting duplicate servers on these ports.

Production locally:

```powershell
npm run build
npm start
```

Open **http://127.0.0.1:5187/**. This serves both the built SPA and its API. `npm run preview` serves only frontend assets and is not the supported full-product launch command.

## Three-minute judge path

1. Home: open a real radar observation from Bangladesh, Puget Sound, or Sacramento Valley.
2. Explore: step/play actual dates, zoom into geography, compare two dates, and export the evidence.
3. Before / after: move the swipe, change opacity, zoom/pan both views together.
4. Run analysis: inspect log-ratio, counts, histogram, and threshold sensitivity.
5. Evidence: inspect provenance and download inputs, settings, and outputs together.
6. Data / science: distinguish actual RGB imagery and catalog metadata from synthetic numerical inputs.

Three teaching cases cover wetland-like, agricultural-like, and surface-disturbance signals. These are controlled numerical experiments, **not reports of events at the displayed locations**.

## Architecture and technology

```text
React / TypeScript / Vite
  ├─ Lazy routes: home, explore, time machine, comparison, analysis,
  │  cases, science, data, methodology, about
  ├─ Shared workspace state → timeline, pair, parameters, evidence
  ├─ MapLibre → local Natural Earth context + raster overlay
  ├─ Accessible SVG charts + exact data tables
  ├─ IDataProvider → NISARDataProvider (API) / DemoProvider (local fixtures)
  └─ Web Worker → pure raster analysis

Express API
  ├─ /api/health
  ├─ /api/datasets → validated demo + optional imported datasets
  └─ /api/catalog?bbox=W,S,E,N → bounded NASA CMR query / cache

shared/ → Zod contracts, deterministic fixtures, processing, bounded answers
scripts/ → catalog archiving, GCOV importer, production browser audit
```

Raster requests are bounded at 256 × 256 cells and 30 observations per dataset. Map and route code are loaded lazily. Quantitative work runs in a Web Worker. Public CMR queries have a 15-second upstream timeout, five-minute cache, bounded geographic extent, and rate limit. No browser credentials or secrets are used.

## Scientific method

Inputs are positive linear power or null. Intersect valid support before optional 3 × 3 linear-power averaging. Calculate `10 log10(after / before)` and flag cells with absolute change at or above a user-selected threshold. Report valid/excluded counts, signed changes, histogram, and threshold sensitivity. The comparison view uses the same paired mask as the analysis.

Synthetic fixtures have no calibrated physical area; km² outputs are withheld. Threshold sensitivity is **not** a probability or confidence interval. Intensity change is **not** a displacement estimate or event attribution. See [SCIENTIFIC_NOTES.md](SCIENTIFIC_NOTES.md).

## AI / ML

No model runs in the product. “Ask the data” is a deterministic question router, with answers drawn from current metrics and metadata. Unknown questions return an explicit unsupported response. No external LLM, fabricated confidence, or hidden prediction is used.

## Real NISAR data

Live discovery currently queries `NISAR_L2_GCOV_BETA_V1`, up to 20 newest records per selected extent. An empty result only concerns that collection/query, not all mission coverage. The global archived catalog contains six actual CMR records. ASF browse access required authentication during preparation; those images were not cached or analyzed.

The optional importer accepts compatible **local** L-SAR GCOV HDF5 products. It does not download products or manage authentication. Obtain products manually through official NASA/ASF tools, then independently review product calibration, geometry, and quality masks.

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r scripts/requirements.txt
.\.venv\Scripts\python scripts/import_gcov.py --help
```

Example with your actual paths, offsets, and scientifically reviewed pair:

```powershell
.\.venv\Scripts\python scripts/import_gcov.py before.h5 after.h5 --id my-study --title "Reviewed GCOV window" --location "Study location" --row 100 --col 100 --size 128 --quality-reviewed --output data/imported/my-study.json
```

The API validates imported JSON. The importer rejects differing grids/tracks/frames/look directions, non-GCOV input, irregular grids, and existing output paths. It records full-file SHA-256 hashes. It does not automatically apply RFI/layover/shadow masks or verify operator review. Its map envelope is approximate for projected-grid rotation; physical area remains withheld. **Only CLI help and Python syntax have been tested here; no real HDF5 pair was available for end-to-end importer validation.**

## Configuration and security

| Variable | Default | Purpose |
|---|---|---|
| `SARFLOW_PORT` | `5187` | API / production server port |
| `SARFLOW_HOST` | `127.0.0.1` | Bind interface |

No credentials are required. No environment file is read automatically. Local imports remain on the server; there is no upload route. All API routes are read-only. Source links must be HTTPS. Never put Earthdata credentials in frontend variables. Public deployment needs TLS and host-level rate limiting; the in-memory limiter is intended for a small single-process application.

## Tests

```powershell
npm test
npm run build
# Start npm run dev separately, then:
npm run test:e2e
# With a fresh production build and npm start:
node scripts/browser-audit.mjs
npm audit
```

Playwright uses installed Chrome. Tests cover numerical invariants, missing-data handling, contracts, API failures/cache/validation, components, the full judge flow, downloads, retries, all major pages at desktop/mobile widths, and automated accessibility. See [QA_REPORT.md](QA_REPORT.md) for measured outcomes and limits. Screenshots/reports are stored in ignored `artifacts/`, `test-results/`, and `playwright-report/` directories.

## Deployment

Vercel deployment is configured in `vercel.json`: Vite builds the frontend, `api/index.ts` hosts the Express API, and SPA routes work when opened directly. Import this GitHub repository into Vercel, use the repository root, and deploy with the configured build command. No secrets or environment variables are needed for the public exploration and teaching workflows. The archived observatory manifest is included in the API function bundle.

The serverless release excludes local datasets, logs, and Python environments. The calibrated-water processor requires registered local inputs, Python, persistent artifacts, and a long-lived process; it is not available on Vercel. The application reports this unavailable state rather than presenting generated measurements. Public upstream service availability and hosting quotas still apply; in-memory rate limits and caches are per function instance, not global abuse protection.

For a full Node host: run `npm ci` and `npm run build`, set `SARFLOW_HOST=0.0.0.0` and a suitable `SARFLOW_PORT`, and run `npm start` behind an HTTPS reverse proxy with compression. Keep the working directory at `sarflow`. Serve frontend and `/api` from the same origin and use a persistent, access-controlled directory for reviewed imports. A static-only host is insufficient with the current API provider.

## Sources, attribution, and limits

See [DATA_PROVENANCE.md](DATA_PROVENANCE.md) and the in-app Science page. NASA and ISRO names identify sources, not endorsement. No NASA logo is used.

Next scientific milestone: acquire and quality-review a real calibrated temporal pair; validate importer output against a trusted geospatial pipeline; assess threshold behavior against independent event evidence. Further work includes precise projected-raster reprojection, multiple product maturity collections, larger tiled rasters, richer geographic search, and validated event-specific algorithms.


## World Explorer

Open `/world` for a globe/flat map with EOX Sentinel-2 cloudless 2024 optical imagery, zoom-dependent tiles, global place search, coordinate navigation, full screen, and attributed PNG/view-metadata export. This is a multi-acquisition optical mosaic, not NISAR data or current flood imagery. Zoom is capped at 14; polar caps and source gaps are not represented as observed coverage. Exports preserve the rendered canvas resolution, not a promised sensor ground resolution.

Source: https://maps.eox.at/ and https://eox.at/2025/03/sentinel-2-cloudless-2024/. Attribution: Sentinel-2 cloudless ? https://s2maps.eu by EOX IT Services GmbH https://eox.at (Contains modified Copernicus Sentinel data 2024). Layer license: CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/. This setup is for non-commercial research/education; commercial use requires an appropriate imagery arrangement. Tiles load from the provider; the application does not bulk-download them.

Place search uses the server-side `/api/places` adapter for https://open-meteo.com/en/docs/geocoding-api (GeoNames attribution). Search terms are sent to that provider when submitted. The endpoint validates queries and upstream coordinates, limits uncached requests, applies a timeout, and caches up to 100 result sets for one hour. There is no API key or personal-location tracking. Internet is required for these services; archived regional NISAR workflows remain local.


## Worldwide radar animation

`/global-radar` searches a place name or supplied coordinates, discovers up to eight repeated NISAR acquisition dates from NASA CMR, and opens the full radar timeline/comparison workspace. `/world` links the selected coordinates into this flow. Searches are supported within latitude ?84.8 and longitude ?179.8. Availability is not guaranteed: the latest 100 records at a point may not contain a repeated group.

The server `/api/global-radar` validates coordinates, bounds each request to 0.3 degrees, selects a repeated track/frame/mode group, rate-limits uncached discovery, and caches at most 30 responses for five minutes. It returns exact NASA GIBS WMS requests for 1536 ? 1536 geographic browse images. These are on-demand images, not locally archived byte snapshots; hash and byte-count fields are null. Images load from NASA only when viewed. Daily mosaics can combine acquisitions and show transparent gaps. Pixel count is not claimed ground resolution. No calibrated numerical result is derived.

Playback advances through discrete acquisitions after rendering; it does not synthesize intermediate ground motion. The existing archived workflows are unchanged. NASA visualization documentation: https://hyp3-docs.asf.alaska.edu/nisar-docs/worldview/


## HD Earth viewing and 4K export

World Explorer now defaults to HD: at least 2? canvas pixel density (capped at 3?) and a smaller display tile size that requests finer available pyramid tiles. Standard mode uses 1? density and fewer tiles. Quality changes preserve center, zoom, bearing, pitch, and projection. Both modes use the existing EOX 2024 optical mosaic; no new acquisition or ground-resolution claim is implied.

Save 4K Earth PNG renders a separate 3840 ? 2160 map, then adds a 160-pixel attribution strip (final PNG 3840 ? 2320). It waits for rendering and rejects tile failures or a 60-second timeout. The export keeps the current center and approximate horizontal extent, adapting to a 16:9 map aspect ratio. It does not upscale a screenshot or synthesize detail. Higher quality uses more network and GPU resources. Existing CC BY-NC-SA attribution and use restrictions apply.


### Experimental Brahmaputra water candidates

Open `/water`. Read [WATER_WORKFLOW.md](WATER_WORKFLOW.md) for project-local Python setup, measurement registration, GCOV/terrain-mask rules, bounded server jobs and exports. No real calibrated input series is bundled; the empty state is intentional. Software fixtures and browser tests are not real-event validation.
