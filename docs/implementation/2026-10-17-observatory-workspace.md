# Simplified NISAR observatory — 17 October 2026

Applied the user's three-panel brief to `/observatory`, the page they were viewing. The previously simplified `/world` page remains in place. This work uses the existing application, state, datasets and processing behavior.

## Changes

- Left: prepared-location search, recent prepared locations for the current session, compact observation-date selection, available NISAR dataset description, comparison action and links to location discovery/calibrated analysis.
- Center: geographic NISAR imagery, Observe/Compare, timeline/playback, and existing navigation controls. Both synchronized canvases resize when the side panels collapse.
- Right: selected location, readable acquisition date and UTC time, imagery status, uncalculated inundated area, actual comparison reference, data limitations, interpretation notes and export.
- Advanced Settings retains image-viewer fallback, rendering opacity, scene footprint, technical lenses, detailed acquisition archive and product guide.
- Blue point marks the prepared study center. Dashed white boundary marks the prepared image extent. Neither represents a detection. Both can be switched off together in Advanced Settings.
- Extra investigation summaries, Change DNA receipts and processing-connection status are disclosures below the map. Official reference-map tools remain available for Rasuwa.
- Mobile puts the map first, with independently expandable panels underneath. Narrow desktop toolbars wrap; archived images fit the allocated map height.
- Automatic catalog refresh remains active. Its status/manual refresh is under Observation updates. No changes to scientific calculations, acquisition identity, reference selection or evidence export schema.

## Files changed for this continuation

Application:

- `src/pages/Observatory.tsx`
- Added `src/pages/observatory-workspace.css`
- `src/components/ObservationMap.tsx`

Browser coverage:

- Added `tests/e2e/observatory-panels.spec.ts`
- Updated `tests/e2e/observatory.spec.ts`
- Updated `tests/e2e/archive-fallback.spec.ts`
- Updated `tests/e2e/automatic-updates.spec.ts`
- Updated `tests/e2e/external-reference.spec.ts`
- Updated `tests/e2e/earth-investigation.spec.ts`
- Updated `tests/e2e/change-tracker.spec.ts`

Added this report. Existing uncommitted changes outside this continuation remain preserved. No dependency, account, Windows setting, production site or remote repository was changed.

## Verified

- `npm run check`: 20 unit-test files / 79 tests passed; TypeScript and production build passed.
- `npx playwright test tests/e2e/observatory-panels.spec.ts tests/e2e/observatory.spec.ts tests/e2e/archive-fallback.spec.ts tests/e2e/automatic-updates.spec.ts tests/e2e/external-reference.spec.ts tests/e2e/earth-investigation.spec.ts tests/e2e/change-tracker.spec.ts tests/e2e/workflow.spec.ts`: final run **18 passed**.
- Covered collapse/reopen without lost selections; resizing both canvases; synchronized date/reference display; recent locations; mobile expansion; archived fallback/retry; dynamic catalog updates without lost history or notes; comparison controls; exports; reference overlay after map retry; major routes and honest API error handling.
- New layout checked at 1440, 900, 801 and 390 pixels for horizontal overflow and automated WCAG A/AA violations. Existing observatory check also covers dark theme.
- Separate Chrome visit without tile/API interception loaded actual NASA imagery. Visually inspected `artifacts/observatory-workspace-preview.png`; full viewport is `artifacts/observatory-panels-live-desktop.png`. These show the application's actual processed browse imagery, not calibrated change measurements.
- `git diff --check`: passed, with existing Windows LF/CRLF normalization notices.
- Independent source review checked date/reference state, recent-location lifetime, marker meaning and ResizeObserver cleanup. Its two responsive concerns—archive minimum height and narrow toolbar clipping—were addressed and covered by browser checks.

## Failures resolved

- An intermediate build ran before the new CSS file had been written: `Could not resolve "./observatory-workspace.css"`. Created the stylesheet and verified the final build.
- Archived-data tests initially raced automatic discovery of newer NASA acquisitions. Fixed test fixtures to isolate archived behavior; live updates retain their dedicated test. The archive test's broad network handler also needed `route.fallback()` so it would not bypass the specific discovery fixture. Final tests pass without suppressing production refresh.
- Existing tests now explicitly open newly disclosed settings/receipts before interacting with them.

## Boundaries

Inundated area is still not calculated from browse colors; no damage, flood cause, confidence or evaluation score is invented. The observatory search covers prepared studies; global location discovery remains available through its link and `/world`. Recent locations are in-memory session state. Existing MapLibre bundle-size and third-party Zod annotation warnings remain. No publish, deployment or Git push was performed.
