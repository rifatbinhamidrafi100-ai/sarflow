# Manual real-data workflow preparation

The user requested preparation only and will arrange Earthdata access and storage. No authentication or ingestion was attempted by this task.

## Added

- `scripts/run_study.py`: explicit check, prepare, discover, ingest and status commands around the existing one-cycle processor. No credential arguments, automatic sign-in, captured authentication transcript, scheduler or startup registration.
- `tests/test_run_study.py`: seven workflow contract tests, including a disconnected-drive regression.
- `docs/REAL_DATA_RUNBOOK.md`: storage/budget setup, manual-authentication steps, measurement review and separate independent evaluation.

The helper requires a dedicated absolute storage path and rejects drive/home/source roots, parent traversal and symlink/junction paths. Defaults: 24GiB total storage budget, 8GiB/file, two attempted downloads per explicit cycle and a 3GiB preflight reserve. These are configurable bounds, not a guarantee that a compatible scientific series will fit. Existing configurations are preserved.

## Verification

- `python -m unittest discover -s tests -p test_run_study.py -v`: seven passed.
- `python -m unittest discover -s tests -p 'test_*.py'`: 51 passed; existing rasterio deprecation/non-georeferenced fixture warnings remain.
- `python scripts/run_study.py --help`: passed.
- `python scripts/run_study.py check --storage 'D:\SARFlow-study'`: read-only preflight completed and reported storageReady true at inspection. `Test-Path` confirmed the example folder was not created.

These checks do not test actual Earthdata authentication, a calibrated download, processing of real measurements or independent scientific validation. No app deployment or unrelated file changes were made.

Read-only review identified an infinite parent-walk risk on an unavailable Windows drive. Added an explicit unavailable-drive error and a regression test. No drive was mounted or changed.
