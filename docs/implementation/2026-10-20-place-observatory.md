# Place Observatory and importer interoperability — October 20, 2026

The first scientific workflow remains a calibrated radar surface-water investigation. This increment supplies its source-catalog foundation and repairs an importer/API boundary; it does not establish event accuracy or complete the seven-system vision.

## Delivered

`GET /api/place-observatory?lat=…&lon=…&page=…` queries the reviewed provisional GCOV collection at a point. It retains single acquisitions, unlike browse animation, which needs a repeated group. Each page has at most 100 records; pages are bounded to 1–10. Responses include actual acquisition times, separate catalog-update times, original NASA links, safe simple footprints, source totals when available, omitted malformed/duplicate record counts and explicit pagination limits. Data are chronological, without interpolated dates.

The adapter validates coordinates, timestamps, identities, URLs and response structure. It bounds upstream time and bytes, caches public metadata for five minutes, and uses the existing client cooldown and discovery-cache policy. A catalog response contains no local file or numerical-dataset information.

The same Place Observatory component is connected to:

- `/global-radar`: discover radar dates or load place evidence.
- `/world`: the selected-location investigation, using the same discovery action.
- `/observatory`: the expandable **Place evidence record** for the selected prepared region.

Users can select an acquisition, inspect observation age and the gap to the prior record on that page, review source/product meaning and lifecycle status, inspect water-workflow readiness, and export the ledger. First source publication, raw-download receipts, analysis receipts and event validation remain explicitly unrecorded. A catalog update is never substituted for source publication or processing time.

Local numerical-input availability is checked separately. A candidate association requires observed status, file provenance, an exact product ID and UTC-instant match, plus overlap with the subset's approximate geographic display envelope. Native-window containment and valid point support remain unverified. Exports state `pointSupportVerified: false` and preserve subset provenance. If input checking fails, availability is unknown rather than zero.

Coordinate changes clear the previous place's visible record and abort pending requests. Requests wait 1,600 ms for editing to settle, beyond the API's 1,500 ms cooldown. A failed refresh at the same place retains earlier checked evidence with an explicit warning.

## Importer bug reproduced and fixed

A new integration test generated synthetic HDF5 software fixtures, ran the actual Python importer, and validated the output with the API's `datasetSchema`. Before the fix it failed with `Invalid ISO datetime`: Python emitted `+00:00`, while the numerical-dataset contract required the canonical UTC `Z` representation.

The importer now writes millisecond UTC timestamps with `Z`. The regression then passed. This verifies interoperability using software fixtures; no actual calibrated measurement input is implied.

## Live source check

The local adapter successfully returned **20 public CMR records** for **25.15° N, 89.8° E**, checked **2026-10-20T07:14:52.939Z**. The oldest listed acquisition was **2026-06-18T23:21:35Z** and newest **2026-10-16T23:21:32Z**. These counts describe catalog products, potentially from different acquisition configurations, not compatible raster windows or evaluated water detections.

The first live request returned 502; retry succeeded. The UI preserves failure/retry behavior. The successful raw ledger is saved in ignored `artifacts/place-observatory/brahmaputra-live.json`; the real-data browser screenshot is `artifacts/place-observatory/brahmaputra-live-desktop.png`. UI regression screenshots bearing `fixture` in their filenames use mocked metadata.

## Verification

- `npm run check`: **91 JavaScript tests passed** across 23 files; TypeScript and production build passed.
- `npm run lint`: passed.
- `.venv-water/Scripts/python.exe -m unittest discover -s tests -p 'test_*.py'`: **44 Python tests passed**.
- Ten Playwright checks passed: the new ledger, export, single-acquisition availability, failed local-input check, refresh recovery, changed coordinates, typing against a simulated real cooldown, plus existing global/globe/investigation/responsive Observatory behavior.
- Desktop and 390-pixel layouts have no horizontal page overflow in the tested flows; WCAG A/AA automated checks passed for the new ledger.
- Code review identified coordinate-throttle and display-envelope overclaim issues; both were corrected and re-reviewed.
- Existing MapLibre/Zod build warnings and Rasterio warnings remain. No deployment, push, paid cloud resource or credential handling occurred.

## Next acceptance condition

The source-catalog path is operational. The first **scientific** proof still requires compatible calibrated products, documented terrain support and independent date-matched water/non-water evidence. Run both importer and water workflow on those actual inputs, examine native-grid exclusions, compare against an independent implementation/reference, and retain the measured result with provenance and limitations. Thermal, optical, precipitation and vegetation adapters and a distributed processing service remain separate unfinished capabilities.

Official ASF documentation states that calibrated provisional GCOV is available and that downloads/streaming require Earthdata authentication. Authentication must be entered manually by the user; SARFlow does not collect it. No real calibrated input files were supplied during this increment.

Sources: [GCOV/product availability](https://nisar-docs.asf.alaska.edu/products-overview/), [provisional product limitations](https://nisar-docs.asf.alaska.edu/provisional-known-issues/), [official data-access guide](https://nisar-docs.asf.alaska.edu/earthaccess/), [CMR API documentation](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html).

## Files changed in this increment

New: `shared/place-observatory.ts`, `server/place-observatory.ts`, `src/components/PlaceObservatory.tsx`, `src/components/place-observatory.css`, `tests/place-observatory.test.ts`, `tests/import-api.test.ts`, `tests/e2e/place-observatory.spec.ts`, this report and the companion plan.

Updated: `server/app.ts`, `scripts/import_gcov.py`, `tests/test_import_gcov.py`, `src/components/LocationInvestigation.tsx`, `src/pages/GlobalRadar.tsx`, `src/pages/Observatory.tsx`, README, roadmap and ignored planning files. Other changes in this working tree predate this increment.
