# Automatic monitoring design and execution plan

## Objective
Automatically update known locations with acquisition dates, and operate a bounded calibrated-data processing service whose public results remain gated by independently reviewed evidence.

## Architecture
Vercel serves the existing application. A separate explicitly started Linux container runs one scheduled worker, a read-only HTTP status API and SQLite on a mounted disk. One JSON collection policy is consumed by the TypeScript routes and Python worker. Collection discovery detects changes; only reviewed collection names/reader specifications are eligible. A metadata record is not a downloaded or compatible measurement.

The worker stores source revisions, statuses, attempts, checksums and result identities durably. Downloads are limited by per-file and total-disk budgets. Restart retries unfinished work. Each processing identity includes input content hashes, window, terrain and parameters. New incompatible processing versions form separate groups and need their own baseline. Public API excludes paths, remote authentication details and unreviewed numerical output.

## Tasks and test contracts
1. `shared/collection-policy.json`, server routes, browser live-date hook: all live routes use the same reviewed collection; refresh preserves prior observations on failure and ignores stale responses. Tests reject malformed dates and collection drift, and verify new dates do not reset a selected historical date.
2. `processor/store.py`, `catalog.py`, `ingest.py`, `worker.py`: SQLite revision tracking, bounded CMR pagination, safe HTTPS source validation, verified HDF5 metadata, chronological compatible groups. Test deduplication, restart recovery, rejected new versions, budget limits and idempotent jobs using synthetic software fixtures only.
3. `processor/validation.py`: evaluate independently labeled same-grid rasters with source/date/hash provenance, held-out event groups and terrain/season strata. Count TP/FP/FN/TN and abstentions; no all-negative perfect-score shortcut. Tests verify known confusion matrices, insufficient sample gates, reference misalignment/leakage rejection and publication refusal without review.
4. `processor/service.py`, `deploy/`, backend proxy and status panel: container health/read-only endpoints, explicit scheduling, persistent disk, no automatic credential persistence. Tests ensure disabled backend is explicit and failed upstream does not become success.
5. Run JS unit tests/build, Python regression and integration tests, browser rendering checks and bounded public NASA metadata smoke query. Document differences between fixture checks, live metadata discovery, actual ingestion and scientific validation.

## Release policy
No scientific output is called validated solely because software tests pass. Release requires independent reference evaluation, reviewed thresholds/strata/scope, matching algorithm and input evidence, explicit human approval, and geodesic area calculation with stated support. In-app alerts only; no external email/message integration. No deployment or recurring operation is claimed until actually running and checked. Hosting/account setup must be performed by the user when credentials or billing are needed.
