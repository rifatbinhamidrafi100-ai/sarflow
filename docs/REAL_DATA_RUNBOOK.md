# Run the first calibrated study when access is ready

This workflow is prepared, not a completed scientific result. No account, storage folder, downloaded measurement, terrain mask or independent reference is supplied by these instructions.

The helper `scripts/run_study.py` reuses the existing Python processor. It accepts no credential arguments, records no sign-in transcript and starts no scheduled service. Each discovery/ingestion command runs one cycle and exits. Stop an interactive run with Ctrl+C. Authentication is manual and non-persisted; another run may need another sign-in.

## 1. Choose storage and check it without creating anything

Open PowerShell in the repository root. Use a dedicated absolute folder on a suitable drive. The example below is only a suggested new folder; preparation did not create it or select it on your behalf.

```powershell
.\.venv-water\Scripts\python.exe scripts/run_study.py check --storage 'D:\SARFlow-study'
```

Read `freeBytes`, `remainingConfiguredBudgetBytes` and `storageReady`. The default configuration caps stored data at **24 GiB**, each source file at **8 GiB**, and each explicit cycle at **two download attempts**. The preflight also reserves **3 GiB** of free space. These are safety budgets, not a promise that the full required series will fit. Files above the cap are rejected; storage is never cleared automatically.

When preparing a new configuration you can use `--budget-gib`, `--max-file-gib` and `--downloads` within the helper's bounds. Once a configuration exists, it is used as written; command-line preparation defaults do not silently replace it.

If `.venv-water` is absent, create a Python environment on a drive with sufficient space and install `processor/requirements.txt`. Do not install a large environment on a nearly full C: drive. Substitute that environment's Python executable in subsequent commands.

## 2. Prepare one-location configuration

After choosing the folder:

```powershell
.\.venv-water\Scripts\python.exe scripts/run_study.py prepare --storage 'D:\SARFlow-study'
```

This creates only a local non-secret configuration in the chosen folder. It selects the focused Brahmaputra point, latitude25.15/longitude89.8, and preserves the processor's measurement checks. It refuses to replace an existing configuration. Review `sarflow-study-config.json` before ingestion. No login or download occurs in this step.

## 3. Discover public source records first

```powershell
.\.venv-water\Scripts\python.exe scripts/run_study.py discover --storage 'D:\SARFlow-study'
.\.venv-water\Scripts\python.exe scripts/run_study.py status --storage 'D:\SARFlow-study'
```

Discovery needs Internet access but no calibrated-product sign-in. Catalogue records are metadata, not measured pixels. The initial cycle can succeed while actual measurement inputs remain unavailable. Source collection review, missing coverage, truncated searches and incompatible products must remain visible.d

## 4. Explicitly opt into a bounded download

Use your own interactive terminal after arranging an Earthdata account:

```powershell
.\.venv-water\Scripts\python.exe scripts/run_study.py ingest --storage 'D:\SARFlow-study'
.\.venv-water\Scripts\python.exe scripts/run_study.py status --storage 'D:\SARFlow-study'
```

Enter credentials yourself only in the interactive sign-in flow. Do not place them in commands, environment variables, source files, chat, saved transcripts or configuration. The helper does not capture subprocess output or extract browser sessions. The existing processor calls interactive Earthaccess with `persist=False`.

The helper checks free space before starting. The processor applies its additional per-file, total-storage and download checks. A completed cycle can contain authentication, compatibility, insufficient-input or processing failures: inspect actual status rather than treating exit0 as scientific success. The authenticated transfer has not been tested by the preparation task.

## 5. Inspect actual measurement compatibility

Check supported product specification, radiometry, polarization, acquisition identity, source hashes, exact grid and valid pixel support. Filename grouping alone is insufficient. At least two compatible dates support an intensity-change comparison; the existing water workflow requires at least three earlier compatible dates plus a target, appropriate polarization and terrain support.

Use `scripts/import_gcov.py --help` for the reviewed native-window importer. Start with its `--check-only` mode. Select offsets from the actual product grid; do not copy arbitrary example offsets and call them your study area. Imported numerical JSON must be registered in `data/imported/` only after source/provenance review. The processor does not automatically publish a dataset to the Vercel web release.

## 6. Keep water inference and independent evaluation separate

Do not invent terrain masks. If using the experimental water workflow, supply a documented aligned terrain mask through a reviewed configuration. Missing terrain or polarization support must yield insufficient evidence. See [water workflow](../WATER_WORKFLOW.md) and [processor details](automatic-monitoring.md).

Choose an independently reviewed, date-matched reference for the actual location, phenomenon and grid. The Rasuwa optical landslide reference is not Brahmaputra flood truth. Follow the existing reference-manifest contract and evaluator tests; do not make a favorable mask from the classifier's own output.

```powershell
.\.venv-water\Scripts\python.exe -m processor.cli evaluate 'PATH-TO-ACTUAL-RESULT' 'PATH-TO-REVIEWED-REFERENCE-MANIFEST.json'
```

Those two paths are placeholders, not files included in this package. Preserve source provenance, reference timing, excluded pixels, confusion counts and errors. Evaluation/publication gates remain unchanged. Do not reduce gates simply to make a demonstration pass, and do not equate one-case evidence with general validation across events or terrain.

## What a successful evidence handoff needs

- Actual product IDs, acquisition times, calibrated input hashes and compatibility checks.
- Grid/CRS, native window, valid support, masks and exact processing parameters.
- A reproducible numerical result that distinguishes measured intensity change from inferred cause.
- A suitable independent reference and evaluation, with limitations and failed cases.
- Human review and truthful public labeling. No confirmed damage claim from radar difference alone.

Official access documentation: [ASF NISAR Earthaccess guide](https://nisar-docs.asf.alaska.edu/earthaccess/). Source login and download behavior may change; consult that guide if manual authentication fails.
