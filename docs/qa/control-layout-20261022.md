# Control and layout audit — 22 October 2026

## Confirmed fixes

- The observation toolbar had a fixed-width group that pushed Compare behind the results panel at 801px and clipped it on small phones. Quality, Observe, and Compare now wrap within their panel.
- The map keeps a 320px minimum height on desktop; the central panel can scroll when comparison controls need more space, keeping zoom, fit, and fullscreen reachable.
- The preview progress label is bounded to the map width.
- Catalog search wording no longer calls the active GCOV search a beta collection.
- Vite no longer watches generated artifacts, output, test-results, or playwright-report. Copying a deployment previously caused an EBUSY watcher crash; generated HTML exports also triggered unwanted reloads.

## Verification

- 111 unit/API tests passed.
- 55 browser tests passed across the full run (50 passed before the watcher crash) and the five reruns after fixing the watcher.
- New regression checks at 1440, 900, 801, 390, and 320px verify control bounds, comparison modes, quality selection, zoom, fit, fullscreen, and horizontal overflow. The 801px bounds assertion failed before the CSS fix.
- Existing tests cover search, observation discovery, date changes, playback, retries, comparison, evidence dialogs, exports, notes, water-job state, responsive panels, and accessibility.
- Additional mobile checks clicked all seven main navigation links and both theme controls at 320px and 390px, with no page errors.
- A visible-control overlap scan covered twelve routes at five viewport widths. Hidden details and scroll-clipped elements were excluded to avoid false positives.
- TypeScript/Vite build, ESLint, formatting, and diff checks passed. Review found no actionable regression.

Older tests were corrected to intercept the actual lossless WebP requests and current accessible link names. No expected functionality was removed to make tests pass. Concurrent test runs initially collided in their shared trace directory; final verification ran browser suites sequentially.

## Changed files

- src/pages/observatory-workspace.css
- src/pages/Explore.tsx
- vite.config.ts
- tests/e2e/control-layout.spec.ts
- tests/e2e/animation.spec.ts
- tests/e2e/external-reference.spec.ts
- tests/e2e/nepal.spec.ts
- tests/e2e/observatory.spec.ts
- tests/e2e/workflow.spec.ts
- This report

Commands: npm run check; npm run build; npm run lint; npm run format:check; npx playwright test --timeout=60000; npx playwright test --last-failed --timeout=60000; git diff --check. Screenshots and exploratory scripts remain under ignored artifacts/.

## Limits

This is a tested regression and layout audit, not a guarantee that every possible state is bug-free. External imagery and catalog availability remain upstream dependencies. Existing non-fatal MapLibre bundle-size and upstream annotation warnings remain. Scientific measurements, source data, and Windows security/network settings were not changed.
