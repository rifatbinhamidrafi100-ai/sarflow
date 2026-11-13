# Water result integrity — 10 November 2026

## Completed

Added shared/water-result.ts and connected it to both the completed-job API response and the Water page's restored/new-job result paths. Previously those paths accepted arbitrary JSON as a typed result without runtime checks.

The current worker's display contract checks its algorithm and provenance type, finite nonnegative integer cell counts, all six class counts summing to the window, common/per-date support consistency, temporal array lengths, finite or explicitly unavailable means, candidate counts bounded by common support, supported artifact names, unique output/observation identifiers, and preview tile bounds/names. The current method must report area and embedded accuracy as null; separately generated independent evaluation remains unchanged.

Unknown provenance fields are preserved at the root and within observation, window, threshold and preview objects. The exported receipt therefore retains source identifiers, hashes, parameters and processing metadata. This is a display/integrity contract, not the complete cross-domain Investigation schema or scientific compatibility validation.

Invalid completed results return HTTP 422 through the job-status API. The UI independently withholds the result panel and its exports if it receives invalid result data. Existing raw artifact endpoints are unchanged for inspection; no claim is made that invalid source files are deleted or repaired.

## Verification

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` passed.
- Targeted ESLint across all eight changed TypeScript files passed.
- Production Vite build passed; existing Zod annotation and map-bundle-size warnings remain.
- Full Vitest suite: 31 files, 137 tests passed. This includes 14 new contract tests, API rejection of damaged retained JSON, and schema acceptance/provenance preservation for actual Python pipeline output generated from explicitly synthetic HDF5 fixtures.
- Playwright water suite: seven tests passed, including corrupted result withholding, corrected-result reload, rerun race protection, retained jobs, empty/failure states, evaluation, mobile layout and accessibility.
- Initial TypeScript check found enum-record indexing errors, corrected with typed class keys. The first full unit run found two outdated UI fixtures missing required fields; fixtures were brought into agreement with the worker format, then the complete suite passed. No checks were weakened or skipped.

## Files

shared/water-result.ts; src/pages/Water.tsx; server/water.ts; tests/water-result.test.ts; tests/water-evaluation.test.ts; tests/water-job-store.test.ts; tests/water-rerun.test.tsx; tests/e2e/water.spec.ts; this report.

## Scientific and release status

No real satellite products were downloaded or newly validated. No scientific thresholds, classification algorithm, physical-area method or evaluation scores changed. A compatible calibrated water-study series and independent references remain necessary for the flagship investigation. The Python fixture test proves software interoperability only.

Local increment only: no GitHub push or production deployment. Existing destination files are backed up under artifacts/before-water-contract-20261110 on D: before syncing the source change set to the original repository.
