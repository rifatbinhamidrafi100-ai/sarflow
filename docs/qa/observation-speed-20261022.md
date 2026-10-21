# Radar comparison loading performance

## Cause and change

The on-demand geographic comparison fetched 1536-pixel PNGs and decoded them again after date/mode changes. A region-card thumbnail could also fetch an original-resolution image.

- Interactive NASA GIBS previews now request at most 768 pixels per side, preserving aspect ratio, bounding box, acquisition date, layer and projection.
- Region cards request 160-pixel on-demand thumbnails.
- Inspected, visible ImageData is reused in an LRU cache capped at 32 MiB, with a five-minute lifetime. Errors and empty coverage are not cached. Cancellation is checked even on cache hits.
- Original requests and archived hashes remain unchanged. Reports include actual display requests separately, and the UI identifies the lower-resolution preview.

## Evidence

Real NASA GIBS requests at the reported Sylhet area, September 24, 2026:

| Request | Bytes | Elapsed in this check |
| --- | ---: | ---: |
| 1536 x 1536 | 7,683,303 | 5.15 s |
| 768 x 768 | 1,922,330 | 3.79 s |

Both contained visible pixels. The preview used about 75% fewer bytes. These are individual network measurements, not guaranteed loading times.

A fresh local app browser check using real upstream images measured September 24 first load at 4.589 s and initial comparison with June 20 at 3.136 s. Subsequent Observe/Compare mode changes took 0.354 s combined, with zero further GIBS downloads. Diagnostics are in `artifacts/satellite-view-20261022/observation-speed-real.json`, excluded from publication.

## Verification

- `npm run check`: 110 tests passed; TypeScript and Vite production build passed.
- `npm run lint`, `npm run format:check`, and `git diff --check`: passed.
- `npx playwright test tests/e2e/observation-speed.spec.ts tests/e2e/satellite-view.spec.ts tests/e2e/earth-investigation.spec.ts --timeout=30000`: 7 passed. Checks include no original-sized map/card downloads, date reuse, empty-coverage recovery and desktop/mobile behavior.
- An initial browser test used the wrong accessible date-selector label and was interrupted; the corrected test passed.
- Read-only code review found no actionable issues in preview provenance or cache handling.

## Modified files

- `shared/observatory.ts`
- `src/components/observationImage.ts`
- `src/pages/Observatory.tsx`
- `tests/observatory.test.ts`
- `tests/observation-cache.test.ts`
- `tests/e2e/observation-speed.spec.ts`
- This report.

## Remaining limits

First-time observations still require an upstream NASA download. Low-resolution browse previews are visualizations, not calibrated measurements. The existing Vercel connection-route issue is separate; no Windows network or security settings were changed. Existing bundle-size and upstream Zod build warnings remain non-fatal.
