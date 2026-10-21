# SARFlow roadmap evidence status — October 17, 2026

This describes the recovered local working copy. Software fixture tests do not establish real hazard accuracy. No publication, deployment, payment, credential collection or authenticated download was performed.

| Requested capability | Current evidence and remaining work |
|---|---|
| Multi-hazard engine | Existing experimental local water workflow and generic threshold analysis. Neither flood nor a second hazard has been validated on real input here. No claim of two completed hazard workflows. |
| L-band / C-band lens | Existing mission-context guide. Real paired NISAR/Sentinel-1 result comparison requires suitable products and separate processing; not delivered as a measured comparison. |
| Multilingual assistant | Implemented deterministic English/Bangla evidence explanations, conservative unsupported-question refusals and numerical checks. No external model. Not an unrestricted chatbot. |
| Ground-truth layer | Archived official EMSR927 Rasuwa optical landslide reference with source/date/provenance, map overlay and export. It is not a floodwater label set or a completed quantitative evaluation. Saved hypotheses remain interpretations, not verified field reports. No public community-report layer. |
| Low-bandwidth mode | Implemented self-contained offline HTML evidence brief, with no external dependencies. Sample 5,715 bytes; one A4 page in print regression. Entire application is not offline-enabled. |
| Shared evidence package | Implemented versioned numerical package and shared consumers for validated analysis display, assistant, quality, hotspots, PDF, brief, saved snapshots and full evidence export. RGB browse and separate water outputs retain their existing contracts. |
| Earth timeline | Existing dated observation playback, pair selection and archived/live browse dates. Not a continuous record; no fabricated dates. |
| Multi-mission validation | Contextual mission resources exist. Independent multi-mission measurement agreement remains untested. |
| Confidence and limitations | Synthetic/observed labels, processed-result status, source warnings, calibration caveats, null event confidence and null unrun metrics. No calibrated event probability model. |
| Evidence report | Implemented downloadable client-side PDF with native-grid mask, dates, sources, methodology and limitations. Sample two pages. PDF Latin text only; Unicode names retained in HTML/JSON. Snapshot is not a georeferenced disaster map. |
| SAR learning | Existing teaching lab/science pages retained. New explanatory templates do not invent measurements. Coherence/interferometry processing not implemented by the intensity detector. |
| Change hotspots | Implemented exact same-sign four-connected native-grid groups, counts, dB ranges, exclusive cell extents and row-run rectangles. No geographic polygons or event attribution. |
| Impact and exposure | Not implemented with actual population/infrastructure/crop data; no exposure or damage statistics generated. |
| Data quality inspector | Implemented observation interval, counts/support, grid/unit/CRS, polarization/track, pixel-area availability, calibration and resolution caveats, source warnings. Exact ground resolution not independently established. |
| Investigation workspace | Implemented bounded browser-local evidence snapshots, title, hypothesis, notes, review page, full notes export/reimport, strict result validation. Existing date comparison retained. No map-region drawing or cloud synchronization added. |
| Monitoring and alerts | Existing local processor code and public catalog discovery tested. One metadata-only cycle found 176 public catalog records across four configured places. No calibrated data downloaded/processed, no validated event alerts. Persistent processor not connected to a public host here. |

## Actual catalog readiness
The local metadata cycle returned 21 records for Brahmaputra, 47 for Rasuwa, 80 for Sacramento and 28 for Puget Sound. Counts are catalog records, not unique compatible acquisitions, disaster observations, or processed images. The access-plan file groups filename metadata into possible download sets; the actual HDF5 geometry/radiometry/masks and temporal/event suitability remain to be reviewed.

Public source guide: https://nisar-docs.asf.alaska.edu/earthaccess/ . It documents PROVISIONAL GCOV and the Earthdata login needed for downloading/streaming. Any authentication must be entered manually by the user and must not be persisted by SARFlow.

## Next required evidence
October 20 Place Observatory update: added source-catalog discovery independent of repeated browse pairs, a shared lifecycle/evidence ledger across global search/globe/prepared studies, candidate numerical-input matching with point support explicitly unverified, and source-ledger export. Live CMR check returned 20 Brahmaputra metadata records. A failing HDF5-import/API contract test revealed a UTC-format mismatch; canonical `Z` timestamps now pass. See `implementation/2026-10-20-place-observatory.md`. No real calibrated processing or event validation was completed.

October 20 update: backend hardening, origin policy, bounded generated-job retention, lint/CI configuration, corrected documentation, and lossless display derivatives are implemented locally. Image viewing transfers decreased 32.42% with exact RGBA equality and preserved originals. See `implementation/2026-10-20-hardening-and-display.md` for verification, modified files and remaining science/cloud work. This does not establish a real quantitative observed example or operational multi-hazard monitoring.

October 18 update: both World and Observatory now use collapsible location/data, map and results panels with mobile layouts and advanced controls. The local GCOV importer has a no-write `--check-only` mode for compatibility and valid-cell support; see `implementation/2026-10-18-gcov-input-checks.md`. No calibrated HDF5 or terrain/reference GeoTIFF input files were found in this checkout. The archived optical reference does not remove this measurement-data requirement.

Supply existing local GCOV paths or download candidate products using official NASA/ASF tools with manual sign-in. Check calibration, exact compatible grid, dates, polarization and quality. Provide documented aligned terrain support and independent event/date-matched reference labels. Only then run real processing, inspect exclusions and evaluate results. A second hazard needs a separately justified method and validation case.

The original November 5 target remains an internal milestone; competition eligibility/reuse rules and the full official challenge requirements have not been independently resolved here.
