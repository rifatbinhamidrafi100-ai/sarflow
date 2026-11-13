# Release verification — 13 November 2026

## Verified in this increment

GitHub feature/mobile-nisar-upgrade-20261107 at f69c2999736257324b9107883f945186ca6482b6 matches the previously tested release tree. Source synchronization is complete for that release. The older COMPLETION_STATUS_20261113.md describes the earlier authentication failure and is historical.

Public checks returned HTTP 200:
- /api/water/inputs: inputs=[], workerAvailable=false. No calibrated measurements registered.
- /api/monitoring: configured=false, status=not-configured.

GitHub Actions run 43374899608 passed install, Python setup and lint, then failed format:check. Subsequent tests were skipped. Corrected formatting in ten existing files without changing the processing architecture or scientific status.

Local verification in D:/SARFlow-upgrade-20261107:
- npm run format:check: passed after correction.
- npm run lint: passed.
- npm run check: 137 tests passed and TypeScript/production build succeeded.
- Python unittest discovery: 79 tests passed.
- Build warnings: third-party Zod comment annotations and large MapLibre bundle.
- Python warnings: affine multiplication deprecation and intentionally ungeoreferenced test fixtures.

These software tests do not measure real flood accuracy. No new deployment or hosted worker was created in this increment.

## Exact outstanding dependencies

1. Public calibrated water API: a host executing the Express/Python water runner with a persistent data/water-inputs directory, artifacts/water-jobs directory, required Python environment, bounded resources and HTTPS access controls. The existing processor.service exposes only read-only monitoring /status and /health; deploying it alone does NOT enable /api/water jobs. Do not point the water API at this status service and claim success.
2. Public scheduled monitoring: a persistent host for processor.service, durable volume, approved HTTPS base URL, and SARFLOW_PROCESSOR_URL in Vercel. Current local process is not a public service. Existing container files and runbook are preparation, not deployment evidence.
3. Independent water evaluation: actual compatible multitemporal calibrated products; reviewed AOI, grids, polarizations and terrain inputs; independent aligned reference labels with source/date/quality metadata and held-out sampling. Execute processor.validation and preserve its receipt before reporting agreement.
4. Android: existing APK is a development-signed website wrapper. Production signing must be managed by the owner. No physical-device verification or offline scientific processing has been established.

Only Vercel hosting is currently available. No separate host/account, subscription, public tunnel, background Windows installation or credential storage was created. Existing Vercel API has a 60-second function limit; the current long-running Python worker architecture is not made durable by that limit.
