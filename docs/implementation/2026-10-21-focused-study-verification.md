# Focused investigation: changes and verification

## Changed

- `shared/study-readiness.ts`: assesses declared numerical inputs conservatively; no source-byte authentication, event confidence or independent validation is inferred.
- `src/pages/Study.tsx` and `study.css`: focused Brahmaputra investigation with dated source imagery, measurement requirements, explicit evaluation gaps and portable JSON export.
- `src/App.tsx`: lazy `/study` route.
- `src/pages/RealHome.tsx`: primary action opens the focused investigation; global tools remain available.
- `src/components/ui.tsx`: "registered datasets" replaces a loading message that previously implied scientific validation.
- `tests/study-readiness.test.ts`: eight contract and scientific-boundary tests.
- `tests/e2e/study.spec.ts`: five desktop/mobile/error/export/navigation checks.
- `docs/submission/USABILITY_PROTOCOL.md`: unfilled human evaluation protocol.
- `docs/submission/CONTRIBUTIONS_AND_ELIGIBILITY.md`: truthful prior-work/AI record and organizer clarification draft.
- `docs/data-access-plan-2026-10-21.json`: current report from the existing local metadata catalogue; not downloaded measurements.
- Planning/design records under `.planning/evidence-readiness/`, `docs/superpowers/plans/`, and `docs/implementation/2026-10-21-focused-study-design.md`.

Existing application files were backed up before edits under ignored `artifacts/backups/evidence-readiness-20261021/`. The unrelated existing working-tree changes were preserved.

## Tested

- `npx vitest run tests/study-readiness.test.ts`: eight passed after an initial expected failure before the implementation existed.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run check`: 24 test files, 99 tests passed; TypeScript and production build passed.
- `npx playwright test tests/e2e/study.spec.ts --reporter=list`: five passed. Includes 1440px and390px views, no horizontal overflow, no serious/critical axe violations, exported evidence, missing-registry and missing-study archive states.
- Separate screenshots of actual local rendering: `artifacts/study-review/study-1440.png`, `study-390.png`.
- A read-only second review found the missing-study perpetual loading issue; fixed with a regression test. No additional blocking findings were reported.

Existing nonfatal map bundle-size and Zod dependency annotation warnings remain. Tests establish software behavior, not scientific accuracy or usability with human participants.

## Scientific access check and remaining work

Queried the current public NASA CMR record and attempted only an eight-byte range from the approved HDF5 source. The source requires manual Earthdata authentication. No full product, credential, cookie or token was read or stored. At inspection C: had about1.7GB free and D: about40GB. A user-supplied measurement location and manual sign-in remain necessary before a real run. Filename candidate grouping does not establish actual grid/calibration compatibility.

No real calibrated result or independent reference evaluation has been completed. This task did not run a human usability study, receive organizer eligibility guidance, select a software license, push GitHub or publish the new local changes. The previously published production version is unchanged.

Local preview: http://127.0.0.1:5186/study while the local dev server is running.
