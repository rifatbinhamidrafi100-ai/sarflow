# Place Observatory implementation plan

**Goal:** Make a selected place answer what NISAR records exist and which evidence steps have actually been completed.

**Architecture:** Keep the current React/MapLibre workspace. Add one bounded NASA CMR catalog adapter and shared Place Observatory contract, then render its evidence ledger inside the existing location investigation. Visualization archive and local numerical datasets remain distinct. No new disconnected pages or generic multi-sensor score.

**Scope:** Existing surface-water investigation is the first scientific workflow. Catalog metadata provides observation identity and time, not pixel support or analysis compatibility. Missing source-publication, ingestion, processing and validation timestamps remain explicitly unknown. No paid service, credential handling, public publishing or default synthetic scientific result.

- [x] Validate and repair importer/API interoperability using HDF5 software fixtures.
- [x] Implement bounded place catalog: chronological records, acquisition/CMR-update timestamps, source links, footprints, explicit truncation and omitted-record counts.
- [x] Integrate operator-supplied observed subsets separately, requiring exact ID/time and candidate display-envelope overlap; point support stays unverified. Never infer raw download time or validation from a subset.
- [x] Build expandable Place Observatory in the existing global investigation: timeline, catalog age, sensor meaning, evidence lifecycle, readiness and JSON export.
- [x] Test schema boundaries, malformed NASA records, single-date catalogs, pagination/truncation, numeric-input candidates, failed/replaced requests, export and mobile accessibility.
- [x] Run live public metadata check and existing workflow regressions, request code review, and document proof boundaries.

**Visual direction:** Reuse the app's light blue/navy palette and typography. Keep the globe primary. Present the observation timeline as a chronological list with a selected-record detail view; use an expandable evidence section rather than additional fixed sidebars. No animated dashboards, invented hazard statistics or seven-page navigation rewrite.

**Dependency requiring user action:** Official calibrated NISAR downloads/streaming require manual Earthdata authentication. Real processing remains dependent on calibrated files and aligned terrain/reference evidence; the new catalog must show that gap honestly.
