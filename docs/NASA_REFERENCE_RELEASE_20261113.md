# NASA reference discovery and comparison release

## Checklist and audit

| Capability | Finding | Delivered |
|---|---|---|
| Comparison camera | Two existing MapLibre views synchronize camera state | Preserved existing geography and image loading |
| On-map comparison | Handle was decorative and had pointer-events disabled | Shared draggable, touch and keyboard slider in map and archive viewers |
| Playback | Existing chronological acquisition playback waits for imagery-loaded state, cancels on data changes and pauses in background tabs | Preserved; existing browser regression passed |
| Global search | Requests could finish after query editing; selected coordinates were absent from URL | Cancel on editing, ignore aborted responses, preserve precise coordinates and browser Back state |
| Numerical lab | Parameter changes already invalidate prior evidence and worker request IDs reject stale results | Preserved; fixed zero-count histogram producing NaN geometry |
| NASA reference data | Catalogue candidates existed only in previous manual discovery | Public bounded CMR endpoint, Water-page search and downloadable discovery receipt |
| Water accessibility | Inline real-data link was distinguishable only by color | Underline and wrapping; desktop/mobile accessibility regression passed |
| Public scientific processing | No persistent Python runtime or registered multitemporal inputs | Still unavailable; no misleading status changes |

## NASA API used

`GET /api/water-references?lat=25.15&lon=89.8&start=2026-09-01&end=2026-10-31`

Queries the official NASA Earthdata CMR granules API with the documented JPL PO.DAAC collection `OPERA_L3_DSWX-HLS_V1`, longitude/latitude point, inclusive UTC dates, latest-first ordering, and a maximum of 50 records. Validates dates, coordinates and source records, bounds response bytes to 1 MB, uses a 15-second timeout and explicit error/empty states. Unknown metadata is not filled with invented values. Larger result sets are explicitly marked truncated; narrow the date interval.

The receipt records the actual request, retrieval timestamp, unchanged source identifiers and acquisition timestamps, original CMR record links, limits and not-evaluated status. No credentials, NASA API Portal key or large raster downloads are involved.

Official references:
- https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html
- https://podaac.jpl.nasa.gov/dataset/OPERA_L3_DSWX-HLS_V1

OPERA optical water records are reference candidates, not validated flood labels. Cloud/shadow quality, temporal correspondence, independence and categorical grid alignment must be reviewed before evaluation. Nothing in this release changes calibrated SAR classification formulas or converts browse imagery into measurements.

## Executed verification

- New tests first failed because the implementation modules did not exist. Implemented them and reran successfully.
- Zero-count histogram regression first failed with NaN height/y attributes, then passed after correcting the denominator.
- Full Vitest suite: 142 passing tests across 34 files.
- Python unittest discovery: 79 passing tests.
- ESLint, Prettier check, TypeScript and Vite production build: passed.
- Observatory browser suite: 3 passed, including actual archived imagery, comparison, source evidence, export, failure/recovery and region selection.
- Release interaction and water browser suites: 10 passed. Initial run exposed an inline-link accessibility violation; fixed it and reran successfully.
- Deployed Chrome smoke test: 1 passed. Used the actual NASA query through the public Water page, verified returned records and downloaded the discovery receipt; no mock catalogue results used for this production check.
- Production health: HTTP 200.
- Production reference query above: HTTP 200, 38 source records, evaluation not-evaluated.
- Production latitude 91 request: HTTP 400.
- Vercel runtime log query for this deployment, level:error, last 20 minutes: zero returned error records. This limited window is not a general uptime guarantee.

Known build warnings remain in third-party Zod annotations and the large MapLibre bundle; Python reports affine deprecation and an intentionally ungeoreferenced test fixture. Browser tests are not physical Android-device validation or flood accuracy measurements.

## Deployment

Existing Vercel project and environment preserved. Production deployment `dpl_GejwNcWsToa1cnS4PjcVCBmBk8XT` is READY.

- Public site: https://sarflow-earth-rbhr.vercel.app/
- Reference search: https://sarflow-earth-rbhr.vercel.app/water
- Deployment: https://sarflow-ml2aw0ajz-rbhr1.vercel.app

## Still incomplete

Public asynchronous water execution, persistent hosted monitoring, compatible multitemporal calibrated inputs, independent reference preparation/evaluation, and Android production signing/device testing. Generic NASA API registration does not supply these dependencies. The existing monitoring status service alone does not execute the Express water API jobs.

This increment does not implement the entire requested animation redesign, automatic numerical recomputation, debounced global suggestions or persistent search history. Existing manual analysis controls and explicit search remain operational. Do not describe this increment as completion of every requirement in the broader specification.
