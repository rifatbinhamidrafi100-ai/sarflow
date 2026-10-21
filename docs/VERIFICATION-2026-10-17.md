# Investigation delivery verification — October 17, 2026

Working copy: `C:\Users\rifat\Downloads\files\sarflow\sarflow-recovery-20261016`. Previous evidence-foundation changes remain preserved and uncommitted. No production change, push, deployment, payment, credential collection or authenticated data download occurred.

## Implemented this continuation
- Shared-package English/Bangla deterministic explanations, explicit unsupported-question handling, and numerical allow-list checks.
- Data-quality panel with dates, interval, grid/unit/CRS, support, polarization/track, pixel-area availability and calibration/resolution caveats.
- Same-sign, four-connected native-grid hotspot groups with exact counts, dB ranges, cell extents and row-run rectangle export. No geographic event polygons.
- Browser-local PDF report generation with dynamically loaded jsPDF, source/date/method/limitations and native-grid mask snapshot; preserved rectangular raster proportions.
- Self-contained HTML offline brief. Typical sample is 5,715 bytes; printing regression confirms one A4 page. Full app is not offline-enabled.
- Five-entry / 4 MB local investigation workspace with hypotheses and notes, review page, full-notes export/reimport and strict computed-result validation. No cloud sync or public field-report submission.
- Read-only public metadata cycle and a reproducible access-plan helper. No science-approved temporal pair or actual disaster evidence selected by filename grouping.

## Verification commands and results
| Command/check | Verified result |
|---|---|
| `npm run check` | 19 files / 76 JavaScript tests passed; TypeScript and production build passed |
| `.venv-water\Scripts\python.exe -m pytest tests/test_study_plan.py tests/test_water.py tests/test_validation.py tests/test_monitoring_worker.py -q` | 37 tests and 9 subtests passed |
| `npx playwright test tests/e2e/investigation-delivery.spec.ts tests/e2e/evidence-package.spec.ts tests/e2e/workflow.spec.ts` | 7 tests passed: desktop/mobile reports, local persistence, note export/reimport, bilingual explanations, actual downloads, offline brief with network disabled, one-page print preview, accessibility, existing major routes and error/retry states |
| `npm audit --audit-level=high` | 0 vulnerabilities |
| `git diff --check` | Passed; Windows LF/CRLF normalization notices remain |
| PDF reopen / rendering | Both final downloaded PDFs reopened; 2 pages each, expected synthetic label and candidate count extracted. Pages rendered via project-local PyMuPDF; final desktop report pages and mobile brief visually inspected |
| Public metadata cycle | 21 Brahmaputra, 47 Rasuwa, 80 Sacramento, 28 Puget Sound records; 0 calibrated downloads or processed results |

## Resolved failures and review findings
- Offline safety test initially rejected an ordinary source hyperlink as if it were an automatic resource dependency. Corrected the test to check resource-loading elements; offline browser test verifies no dependency on the network.
- Mobile accessibility check found the horizontal hotspot table lacked keyboard focus. Added a named, focusable scroll region and reran accessibility checks.
- Independent review identified arbitrary extra imported result fields and false-valued results passing an unknown-type boundary. Added a strict numerical result schema and regression cases; malformed and invented fields reject.
- Added conservative English/Bangla casualty/unsupported-subject guards and mixed-intent regression cases.
- Fixed PDF snapshot aspect ratio for rectangular grids.
- Bundled Python lacked a PDF renderer. Installed PyMuPDF only into ignored project-local `.venv-water`, then rendered and reopened the final outputs.

## Remaining limitations
There are still zero registered observed quantitative datasets in the app and zero registered local water inputs. Actual calibrated inputs require existing local file paths or user-controlled Earthdata access. Real-event flood evaluation, a second hazard, geographic event polygons, actual L/C-band comparison, official reference-map agreement, exposure statistics, public community layers and validated alerts are not established by these changes. See `ROADMAP-STATUS-2026-10-17.md` for all requested capabilities.

No whole-app offline support or general-purpose chatbot is claimed. PDF uses Latin-character text; original Unicode source names remain available in HTML/JSON. Highly fragmented masks can be explicitly omitted from the brief to enforce size bounds. Long metadata can make other briefs exceed one print page. Browser-local notes disappear if browser storage is cleared; full notes export/reimport is available. Existing MapLibre bundle and Zod annotation warnings, plus rasterio fixture/deprecation warnings, remain nonblocking.

## Changed files in this continuation
Modified: `package.json`, `package-lock.json`, `src/App.tsx`, `src/components/AskData.tsx`, `src/pages/Analysis.tsx`.

Added code: `shared/evidence-answers.ts`, `shared/evidence-report.ts`, `shared/hotspots.ts`, `shared/saved-investigations.ts`, `src/components/InvestigationTools.tsx`, `src/components/exportReport.ts`, `src/components/investigation-tools.css`, `src/pages/SavedInvestigations.tsx`, `scripts/prepare_study_plan.py`.

Added tests: `tests/investigation-delivery.test.ts`, `tests/e2e/investigation-delivery.spec.ts`, `tests/test_study_plan.py`.

Added documentation: `docs/INVESTIGATION-DELIVERY.md`, `docs/ROADMAP-STATUS-2026-10-17.md`, `docs/implementation/2026-10-17-investigation-delivery.md`, `docs/data-access-plan-2026-10-17.json`, and this report. Updated the existing ignored planning records.

Generated artifacts: `output/pdf/sarflow-evidence-1440.pdf`, `output/pdf/sarflow-evidence-390.pdf`; ignored `artifacts/sarflow-offline-1440.html`, `artifacts/sarflow-offline-390.html`, rendered PDF pages, and desktop/mobile screenshots. The sample numbers are synthetic software-test output and are labelled accordingly.

## Review locally
Development servers are running on frontend `http://127.0.0.1:5186` and API `http://127.0.0.1:5187`. Open `/analysis`, run the teaching analysis, select an explanation language, inspect the quality/hotspot panels and try report/brief exports. Save an investigation, then review it at `/investigations`. To restart from the working directory use `npm run dev`. The public metadata processor was run once, not installed as a Windows service or startup task.
