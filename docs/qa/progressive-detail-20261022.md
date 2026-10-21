# Progressive radar display and image detail

## Change

The previous update limited interactive requests to 768 pixels. Large map views enlarged this preview, and selecting another date cleared the map until its download completed.

The geographic viewer now displays a 384-pixel preview before requesting the selected detail. Detailed is the default and retains up to the source's 1536-pixel on-demand size. Balanced and Quick remain available. The valid preview stays visible during the detail upgrade, with explicit status; a failed upgrade retains the preview with a warning. A small preview that lacks coverage is checked at the requested detail before declaring a gap.

Playback uses quick previews, prefetches only the next date, and upgrades the paused date to the selected detail. Concurrent prefetch and visible requests share a download; canceling one consumer does not cancel the other. Existing bounded decoded-image caching remains in place. Original evidence and separate preview/detail request URLs are retained in reports.

Satellite photo links to the exact study center. This is optical context with varying source dates, separate from the dated false-color radar observation. No smoothing, invented detail, calibrated processing or quantitative detection was added.

## Verification

- Real Rome query at 41.9036, 12.5088, acquisition August 18, 2026: preview visible after 2.469 seconds; full detail loaded after 6.789 seconds in the local app using real NASA requests. These are individual measurements, not guarantees.
- 111 unit/API tests passed, including cache lifetime, memory bounds, cancellation and shared in-flight consumers.
- Browser regressions cover immediate preview while detail is delayed, quality controls, same-location photo link, cached mode/date changes, empty coverage, desktop/mobile accessibility and existing evidence flows.
- Code review found a late-preview race during comparison fallback. A per-phase generation check now prevents a delayed preview from replacing detailed content. A browser screenshot regression verifies that the detailed image remains displayed.
- TypeScript, Vite build, ESLint and formatting checks passed. Existing upstream annotation and bundle-size warnings remain non-fatal.

## Files

- `shared/observatory.ts`
- `src/components/observationImage.ts`
- `src/components/ObservationMap.tsx`
- `src/components/ArchiveCompare.tsx`
- `src/pages/Observatory.tsx`
- `src/pages/observatory-workspace.css`
- `tests/observation-cache.test.ts`
- `tests/e2e/observation-speed.spec.ts`
- This report.

Commands: `npm run check`, `npm run lint`, `npm run format:check`, and Playwright tests for observation-speed, satellite-view and earth-investigation. Screenshots and local diagnostics under `artifacts/satellite-view-20261022/` are excluded from publication.

## Remaining limits

Full-size first-time imagery still depends on NASA and network bandwidth. Radar browse colors and grain are not photographic detail; zooming does not add sensor resolution. Empty or delayed browse coverage remains possible. No Windows network or security settings were changed.
