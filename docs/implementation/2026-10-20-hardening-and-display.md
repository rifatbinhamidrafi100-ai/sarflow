# Backend hardening and image delivery — October 20, 2026

## Delivered locally

- Common security headers run before every API router. Observatory failures no longer inherit a successful-response cache directive.
- Successful discovery JSON advertises `s-maxage=300` and bounded stale revalidation. Errors and water results remain non-cacheable. This is a cache policy, not proof of a deployed CDN.
- Discovery cooldowns are per client IP. Explicit `SARFLOW_TRUSTED_PROXIES` supports controlled reverse proxies; forwarded headers are untrusted by default. Reverse-geocoding keeps its shared upstream service protection. Caches and limits are still process-local.
- Dataset loading isolates invalid, oversized and duplicate imports. A bad file does not suppress valid files. `X-SARFlow-Skipped-Imports` reports a count without exposing file paths.
- Water mutations require a configured exact Origin and reject missing origins and cross-site browser requests. Public origins can be configured. This is not authentication: non-browser callers can forge Origin. A public processing host still requires access control.
- Marked generated job directories expire after 24 hours on a subsequent submission. Running and unmarked directories are preserved. Failed submissions do not accumulate registry entries. Existing unmarked artifacts need manual review.
- Removed unused `topojson-client`, `world-atlas`, and their type package. Their historical Natural Earth attribution remains. Unused `src/pages/Home.tsx` was moved to ignored `artifacts/maintenance-backup/Home.tsx`; the active `RealHome.tsx` remains.
- Added an ESLint correctness baseline and a GitHub Actions workflow for lint, build, JavaScript and Python tests. CI has not executed remotely; no push or publication was performed.
- README now names the provisional collection and four regions, removes the personal path, fixes the broken QA link, and describes actual test/authentication boundaries.

## Smaller images, unchanged evidence

Fifteen archived scenes now have lossless WebP display derivatives. Original PNG bytes and SHA-256 values remain intact and downloadable. Display encodings have separate hashes and byte counts in the manifest.

| Aggregate | Bytes |
|---|---:|
| Original PNGs | 41,103,700 |
| Display WebP copies | 27,777,376 |
| Saved per complete set of viewing transfers | 13,326,324 (32.42%) |

All decoded RGBA pixels and dimensions match the originals. Both formats are retained, so repository/disk size increases; ordinary map/comparison transfers decrease. Live NASA images still use their original URLs. The display is still browse imagery, not quantitative radar power.

## Verification

- `npm run lint`: passed.
- `npm run check`: 85 JavaScript tests passed; TypeScript and Vite production build passed.
- `.venv-water/Scripts/python.exe -m unittest discover -s tests -p 'test_*.py'`: 44 tests passed, including RGBA equality for all 15 display images.
- Six Playwright tests passed across archive fallback/playback/export, image-error recovery, coverage-date selection, responsive Observatory panels, and water-page state/empty inputs.
- `npm audit --omit=dev`: zero reported vulnerabilities.
- `git diff --check`: passed; Windows line-ending notices remain.
- Browser screenshot `artifacts/brahmaputra-archive-1440.png` inspected. No public deployment was performed.

Existing non-fatal build warnings concern the large MapLibre chunk and Zod annotation placement. Python reports Rasterio/Affine warnings for existing test paths. These are not presented as new scientific findings.

## Remaining work and acceptance evidence

1. **Real observed numerical example:** acquire compatible calibrated GCOV products with manual Earthdata authentication or supply existing local files; verify UTC, exact geometry, radiometry and masks; run the importer and compare a bounded window against an independent implementation. Record product IDs, full hashes, settings, valid support and actual output. No calibrated HDF5 or terrain/reference GeoTIFF inputs were found in this checkout on this pass.
2. **Water validation:** choose an event/date-matched reference, generate documented terrain exclusions, evaluate a spatially/temporally held-out case, and then test filtering and local threshold alternatives. Adding a filter or adaptive threshold without evaluation would not establish a robust classifier. The current experimental method remains unchanged.
3. **Drought/heat context:** select actual rainfall, soil-moisture, vegetation and land-surface-temperature products with explicit missions, units, resolution, QA and available dates. Define anomaly baselines by seasonal period and comparable support; withhold anomalies when a sufficient baseline is absent. Add the switcher only alongside operational adapters and source-aware series. Surface temperature is not air temperature, and a contextual anomaly is not confirmed disaster damage. These adapters and series are not implemented here.
4. **Whole-Earth processing:** move bounded derived outputs to object storage, use a persistent queue plus workers near the source data, publish tiled COG/summary products, and use a shared cache/rate-limit store. Preserve provenance and idempotent job keys. Benchmark data access, processing time and cost before enabling automatic ingestion. No cloud account, storage, billing or deployment was changed.
5. **Public compute security:** use authenticated access and per-account quotas on the processing API; exact Origin checks alone do not authorize a user. The default remains local hosting.

The supported claim remains a tested local research/education application with real visualization archives and experimental quantitative workflows—not validated whole-Earth multi-hazard monitoring.

## Modified files in this pass

`server/app.ts`, `server/http-policy.ts`, `server/job-retention.ts`, `server/water.ts`, `server/places.ts`, `server/global-radar.ts`, `server/coverage.ts`; `tests/http-hardening.test.ts`, `tests/water-api.test.ts`, `tests/observatory.test.ts`, `tests/test_display_derivatives.py`, `tests/e2e/archive-fallback.spec.ts`; `shared/observatory.ts`, `src/components/ObservationMap.tsx`, `src/components/ArchiveCompare.tsx`; `public/data/observatory.json` and 15 `public/observations/*.webp`; `scripts/optimize_observation_display.py`, `scripts/image-requirements.txt`; `eslint.config.js`, `.github/workflows/ci.yml`, `package.json`, `package-lock.json`, `README.md`, `WATER_WORKFLOW.md`, this report, roadmap and ignored planning progress. `src/pages/Home.tsx` was moved to the local backup noted above. Other working-tree changes predate this pass.
