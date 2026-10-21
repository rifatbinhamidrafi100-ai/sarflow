# Simplified globe workspace — 17 October 2026

Implemented the user's three-area layout in the existing `/world` page. The satellite map, source attribution, discovery API, comparison methods and exports remain in use. No dependency added for this change.

## Behavior

- Left panel: place search, up to five named recent locations for this session, dataset descriptions, available acquisition dates, catalog footprints, overlay toggles, prepared investigations and radar-animation link.
- Center: interactive Earth with a small toolbar for whole-world view and fullscreen. Both side panels collapse independently. A ResizeObserver resizes the map without recreating it when its container changes.
- Right panel: selected location, observation-discovery action, actual selected acquisition UTC, comparison reference, imagery status, separately labelled footprint query date/global footprint sample, uncalculated inundation area, and limitations.
- Advanced Settings retains coordinates, zoom scales, projection, random-location exploration, rendering quality, map PNG, 4K PNG, metadata export and source details.
- The discovered full observation workspace renders below the globe, retaining playback, comparison, receipts and exports. Selection/status callbacks keep the right panel synchronized; changing coordinates or restarting discovery clears its old selection.
- Mobile uses the globe first and independently expandable panels below it. Panel contents scroll; the document has no horizontal overflow in the checked 390px viewport. Recent locations are held in memory, not persistently stored.

## Files modified for this UI task

- `src/pages/World.tsx`
- `src/pages/world.css`
- `src/components/WorldLayers.tsx`
- `src/components/LocationInvestigation.tsx`
- `src/pages/Observatory.tsx` — optional selection-reporting callback; existing callers unchanged
- `tests/e2e/world.spec.ts`
- `tests/e2e/earth-investigation.spec.ts`
- `tests/e2e/coverage-dates.spec.ts`
- Added `tests/e2e/world-panels.spec.ts` and this document.

## Verification

- `npm run check`: 20 files / 79 unit tests passed, TypeScript and build passed. A final `npm run build` after CSS consolidation also passed.
- `npx playwright test tests/e2e/world-panels.spec.ts tests/e2e/world.spec.ts tests/e2e/earth-investigation.spec.ts tests/e2e/coverage-dates.spec.ts`: final run 7 passed. Checks panel collapse/reopen and map resize, retained date state, search/recent location, actual acquisition/reference synchronization, coordinate reset, discovery errors/empty results, attributed PNG exports including 3840 x 2320 4K output, desktop/mobile overflow and WCAG A/AA automated checks.
- The three `workflow.spec.ts` checks also passed during this change: major routes, accessibility/layout, critical workflow and error recovery.
- `git diff --check`: passed; existing LF/CRLF normalization notices remain.
- A separate headless Chrome visit without tile interception loaded the live EOX optical globe successfully. Screenshot: `artifacts/world-panels-live-desktop.png`, visually inspected. Interaction-test screenshots use deterministic tile fixtures and are UI test evidence, not new satellite observations.
- Source review found a potentially misleading date label and global footprint count; corrected them and separately wired the actual acquisition selection. Review also confirmed the callback identities are stable and cannot cause repeated discovery resets.

## Failures resolved and boundaries

- First browser run depended on live date availability after a random location. Stopped it and added an explicit catalog-date fixture to the interaction test.
- Accessibility check found that the OpenStreetMap attribution link relied on color. Added underlining and reran the tests successfully.
- Reporting the same load status in Results and the full workspace made an old unscoped test locator ambiguous. Scoped it to the named imagery explorer; both visible statuses remain functional.
- Build retains existing large MapLibre chunk and third-party Zod annotation warnings.

This task changes the local interface. It does not calculate inundation, validate a disaster, download calibrated data, add alerts, or deploy/push the app. Existing uncommitted research/evidence changes remain preserved.
