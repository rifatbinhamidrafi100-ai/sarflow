# Automatic observations and calibrated processing

## Implemented behavior

The selected study location and global radar viewer check NASA automatically on opening, every five minutes while visible, and on returning to the page. A manual retry remains available. Existing images survive upstream failures; historical selections and interpretation notes survive new dates. Study-region updates stay in their original browse track/frame/mode and collection. At most 30 dates are retained in the current study session. This is live browse discovery, not quantitative analysis of PNG colors. Bundled archive files are not rewritten by browser refreshes.

All live TypeScript catalog routes and archive generation scripts use `shared/collection-policy.json`. The Python worker inventories CMR collections before discovery. PROVISIONAL is reviewed, BETA retired, and newly named collections are reported for review. Missing active collection stops ingestion. GCOV specification 1.2.1 remains the only supported reader. Collection maturity alone does not prove compatibility or local accuracy.

## Persistent scientific backend

The worker is a separate Python service with SQLite on a persistent disk. It runs one cycle at startup and every six hours while explicitly running. Defaults watch Puget Sound, Brahmaputra, Sacramento and Rasuwa. Discovery covers the last 365 days, up to five pages of 100 records per location; truncation is reported. Download capacity rotates between locations. Downloads are optional and bounded to four attempts/cycle, 12 GB/file and 80 GB total storage. These are safety limits, not estimates of required hosting costs. No source files are deleted to make room.

SQLite stores collection review state, acquisition revisions, download attempts, source hashes, compatibility groups, jobs, outcomes and publication gates. Interrupted work is retried on restart; one OS lock protects each volume. Completed jobs are keyed by location, source hashes, exact window, compatibility, terrain and parameters. Changed source bytes are quarantined. HTTP endpoints expose sanitized public state only, never file paths or credentials.

Downloads accept only approved HTTPS ASF/NISAR HDF5 links, no URL credentials or signed query strings. Actual HDF5 identity, specification, radiometry, geometry and polarization are checked against the catalog. A native 256 x 256 window is selected around the location. At least three earlier compatible dates plus a target are required. Missing terrain support yields insufficient evidence; no terrain mask is invented. The existing water algorithm is reused unchanged.

## Local commands

Use the existing Python environment or create a separate environment and install `processor/requirements.txt`. Run from the repository root:

```powershell
.venv-water/Scripts/python.exe -m pip install -r processor/requirements.txt
# One public metadata cycle; no sign-in, large download or background service:
.venv-water/Scripts/python.exe -m processor.service --once
.venv-water/Scripts/python.exe -m processor.cli status
# Explicit running service; stop with Ctrl+C:
.venv-water/Scripts/python.exe -m processor.service
# Enable calibrated downloads after manually signing in in your terminal:
.venv-water/Scripts/python.exe -m processor.service --ingest --earthdata-login
```

The final command calls `earthaccess.login(strategy='interactive', persist=False)`. Enter credentials yourself. They remain only in the running process; no `.netrc`, environment token, browser cookie extraction or credential file is used. An authenticated restart requires manual sign-in again. Fully unattended authenticated restarts would need a separately approved credential-management policy; this implementation does not bypass the user's no-persistence requirement. NASA HTTP authentication/download behavior is not certified by the public metadata smoke test.

Customize a copy of `processor/config.json` and pass `--config PATH`. Use an absolute path for `terrain.file` and `referenceManifest`. Terrain must exactly match the selected window CRS, shape and transform and have documented source/method. `parameters` supports only `co_db`, `cross_db`, `change_db`, `margin_db` in existing validated ranges. The HTTP API cannot change configuration, launch jobs or upload files.

## Linux deployment

`deploy/Dockerfile.processor` and `deploy/compose.yaml` provide a non-root, read-only application container with a writable named volume, two CPU and 4 GB memory limits, and a health check. Docker is not installed on the development PC, so the Linux image has not been built or remotely deployed here.

On an authorized Linux backend with Docker Compose:

```sh
docker compose -f deploy/compose.yaml build
docker compose -f deploy/compose.yaml up
curl http://127.0.0.1:8090/health
curl http://127.0.0.1:8090/status
```

This runs metadata monitoring by default. For an interactive, non-persisted Earthdata session with calibrated ingestion:

```sh
docker compose -f deploy/compose.yaml run --rm --service-ports processor --bind 0.0.0.0 --storage /var/lib/sarflow --ingest --earthdata-login
```

Stop the ordinary container first; one worker can own the volume. Keep the public endpoint behind the host's HTTPS reverse proxy. Only `/health` and `/status` exist; no scientific files or write operations are exposed. Set **SARFLOW_PROCESSOR_URL** on the existing Vercel project to the approved HTTPS base URL and redeploy. The website proxies `/status` through `/api/monitoring`, validates its schema, and shows connection/freshness, acquisitions, counts, review status and eligible in-app alerts. Without a connected host it explicitly says processing is inactive. Local development accepts `http://127.0.0.1:8090` for this non-secret URL.

Persist and back up the volume using the hosting provider's approved backup mechanism. Do not copy a live SQLite database without its WAL; use SQLite's backup API or stop the service first. Storage quotas pause ingestion instead of deleting sources. No billing, domain, firewall, Windows startup or account settings are changed by this repository.

## Independent validation and release

`processor.validation.evaluate(result_dir, reference_manifest)` checks exact grid alignment, output hashes, target date, algorithm and parameters. References must represent **new water relative to baseline**, not just water presence. Labels are integer GeoTIFF values 0 (not new water), 1 (new water), 255 (unknown). Source/method, reviewer, independence statement, held-out event ID, terrain and season are required. These attestations must be supplied honestly by the reviewer; code cannot prove that a reference is independent or a reviewer is qualified.

A reference manifest has a `cases` array. Each case requires `id`, `eventId`, `split: "held-out"`, `dataType: "independent-reference"`, `source`, `method`, `reviewer`, `independenceStatement`, `date`, `terrain`, `season`, and paths `labels`, `classes`, `result` (relative to the manifest). `result` identifies an existing calibrated `result.json`, and `classes` its original `classes.tif`. No reference observations or approval are supplied with the repository.

```sh
python -m processor.cli evaluate /volume/results/JOB/ATTEMPT /volume/references.json
```

The first evaluation writes `evaluation.json` with its digest and withheld publication. Review source provenance, temporal correspondence, sampling design, event/terrain/season representativeness, exclusions and accuracy. Only an authorized scientific reviewer should add an `approval` object with that exact `evaluationDigest`, `signedOffBy` and `statement`, then rerun evaluation. Any change in evidence, evaluator, policy or measurements invalidates that approval. The running worker re-evaluates completed jobs and serving checks reference/result/review hashes again. Future acquisitions require their own matching evidence and review.

Reported metrics include TP/FP/FN/TN, conditional precision/recall, false-positive rate, misses including abstained positives, coverage, and terrain, season and combined strata. Defaults require six cases, three events, two terrain categories and two seasons; each stratum needs at least 100 positive and 100 negative labeled pixels, 95% coverage, 0.90 Wilson lower precision/recall, false-positive rate at most 0.05 and miss rate at most 0.10. These are configurable review gates, not universal scientific acceptance criteria. Pixel Wilson bounds do not account for spatial correlation or establish event-level confidence. The release remains scoped to each explicitly referenced result.

Only a passing, approved result can expose a **reference-evaluated new-water candidate**, geodesic candidate-pixel area and an in-app alert. Area is an unadjusted mapped candidate area, not flood depth/damage or an accuracy-adjusted area confidence interval. No email/SMS is sent. Synthetic fixtures, missing references, mismatched grids, duplicates, changed files, failed review or stale heartbeat withhold publication.

## Verification and remaining external requirements

Unit/integration tests use synthetic software fixtures and mocked metadata. They test controls and calculations, not real-world accuracy. Public CMR discovery was exercised for all four locations; calibrated NASA files have not been downloaded or independently validated in this run. Production scientific processing still needs an authorized persistent host, manual Earthdata authentication, suitable terrain support and independent references across events, terrain and seasons.

Official references: [CMR API](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html), [ASF NISAR Earthaccess guide](https://nisar-docs.asf.alaska.edu/earthaccess/), [Earthaccess authentication](https://earthaccess.readthedocs.io/en/latest/user/explanation/authenticate/).
