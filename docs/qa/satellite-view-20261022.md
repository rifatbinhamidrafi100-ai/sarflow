# Satellite view and observation discovery verification

## Changes

- Default optical background: Esri World Imagery, optional geographic labels, retained EOX Sentinel-2 mosaic. Visible provider attribution and provider-specific export terms.
- URL coordinates initialize the map precisely. A main-toolbar zoom action recenters on the selected point; coordinate submission opens a close-up. Discovery cache keys retain exact coordinates.
- Successful discovery scrolls to its dated observation workspace.
- Browse images are decoded and checked for nonzero alpha before display. Empty HTTP-200 images have an explicit coverage warning and previous-observation action. Playback stops on unavailable coverage.
- The inspected image pixels go directly to MapLibre, avoiding a second download and an old-image/new-date race.
- 4K export preserves horizontal geographic extent rather than clamping its camera to the source's native tile zoom.

## Verification

- `npm run check`: 104 unit/API tests passed; TypeScript and Vite production build passed.
- `npm run lint` and `npm run format:check`: passed.
- `npx playwright test tests/e2e/satellite-view.spec.ts tests/e2e/world.spec.ts tests/e2e/world-panels.spec.ts tests/e2e/earth-investigation.spec.ts`: 9 passed, including desktop/mobile precise coordinates, transparent-image recovery, export provenance, accessibility and existing comparison flows.
- `git diff --check`: passed.
- Read-only code review found and prompted correction of export framing and a second-fetch image race; no actionable findings remained in the revised loading path.
- Real-network optical check at 24.895, 91.887, zoom 18.95: buildings and streets rendered on desktop and mobile. Unsupported level-20 provider tiles had returned gray placeholders despite HTTP 200; native tile requests now stop at 19 and use `blankTile=false`.
- Real-network discovery at 24.89287, 91.90012: October 18, 2026 returned a fully transparent 1536-by-1536 NASA GIBS image. The previous-date action loaded visible September 24, 2026 radar browse imagery, with no page errors. A CMR acquisition is not proof of browse pixel availability.

## Files

- `shared/basemaps.ts`
- `server/global-radar.ts`
- `src/pages/World.tsx`, `src/pages/world.css`, `src/pages/Observatory.tsx`, `src/pages/Knowledge.tsx`
- `src/components/LocationInvestigation.tsx`, `src/components/ObservationMap.tsx`, `src/components/observationImage.ts`, `src/components/exportEarth.ts`
- `tests/global-radar.test.ts`, `tests/observation-image.test.ts`, `tests/export-earth.test.ts`
- `tests/e2e/satellite-view.spec.ts`, `tests/e2e/world.spec.ts`, `tests/e2e/world-panels.spec.ts`, `tests/e2e/earth-investigation.spec.ts`
- `README.md`, `docs/submission/API_REFERENCE.md`, `docs/submission/API_INVENTORY.csv`, `scripts/package_submission.py`

## Limits

Optical basemap acquisition dates vary; it is not live NISAR imagery. Deep zoom does not add sensor detail. A visible radar browse image is not a calibrated temporal change result or flood validation. Upstream catalog and image coverage can differ or be delayed. The build retains existing MapLibre bundle-size and upstream Zod annotation warnings; these did not fail the build.

Local browser screenshots and diagnostics are under `artifacts/satellite-view-20261022/`, excluded from publication. A deployment uses a hash-verified source allowlist; local HDF5 files, credentials, environments and existing `output/` are excluded.
