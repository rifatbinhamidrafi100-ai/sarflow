# Evidence foundation verification — October 16, 2026

## Working copy and recovery
Working directory: `C:\Users\rifat\Downloads\files\sarflow\sarflow-recovery-20261016`.

The parent folder contained directories but zero source files in src, shared, server, tests, data, dist, and .git. Git returned `fatal: not a git repository (or any of the parent directories): .git`. No attempt was made to overwrite or delete that structure. A separate shallow clone of the public SARFlow repository was recovered at commit `33e94b24933bf811dd59b004e4487d272e78b20f`. This is the public snapshot, not a recovery of unavailable uncommitted work.

## Implemented
- Version 1.0.0 numerical evidence builder with source identifiers, dates, reproducible settings, method, metrics, evidence labels, limitations and unavailable validation.
- Same memoized package in both existing analysis and evidence JSON downloads. Failed validation withholds export and displays the error.
- Reject altered/stale result arrays, counts or settings through deterministic recomputation.
- Withhold synthetic physical area in the numerical engine and export. Reorder area arithmetic to avoid intermediate overflow for finite permitted input.
- Update three vulnerable transitive development dependencies through compatible lockfile changes; no package.json version ranges changed.
- Set up ignored project-local Node dependencies and `.venv-water` Python dependencies. No system policies, startup tasks, services, credentials or paid accounts changed.

## Verification
| Command/check | Result |
|---|---|
| `npm run check` | 18 test files, 70 tests passed; TypeScript and production Vite build passed |
| `.venv-water\Scripts\python.exe -m pytest tests/test_water.py tests/test_validation.py tests/test_monitoring_worker.py -q` | 35 tests and 9 subtests passed |
| `npx playwright test tests/e2e/evidence-package.spec.ts tests/e2e/workflow.spec.ts` | 5 browser tests passed, including actual downloads at 1440px/390px, stale-result invalidation, existing critical flow, all listed major routes at desktop/mobile widths, accessibility, and service-error/retry states |
| `npm audit --audit-level=high` | 0 vulnerabilities |
| `git diff --check` | Passed; Git emits a Windows LF/CRLF normalization notice |
| Local API health | `status: ok` |
| Data readiness | 3 synthetic quantitative datasets; 0 observed quantitative datasets; 0 registered water inputs; local water worker available |

Screenshots: `artifacts/evidence-package-1440.png` and `artifacts/evidence-package-390.png`. Mobile screenshot visually inspected. Tests use synthetic fixtures for numerical software verification; these results do not establish hazard accuracy.

## Resolved failures
Baseline JavaScript suite: 61 passed, 1 failed because the expected local Python executable was missing (`ENOENT`). Installing the declared water dependencies in the project-local environment resolved it.

The first wider browser run found an ambiguous confidence-text locator after new drawer wording, and a live-date update invalidated an archive-only expectation. Adjusted drawer wording and isolated the archive UI regression from live discovery; final run passed. Dedicated live-refresh tests are unchanged; their external live behavior was not independently validated here.

## Remaining limits
No calibrated real observation pair was imported or processed. No hazard detection, accuracy, official reference-map agreement, external deployment or competition eligibility was validated. RGB browse and separate water-processing exports have not yet migrated to the new evidence package. Assistant, PDF reports, offline briefs and remaining roadmap features need subsequent integration.

Build warnings remain for Zod third-party annotation removal and the roughly 1 MB MapLibre chunk. Python emitted deprecation warnings and a missing-georeference warning for an intentional software fixture. Maximum-size export performance has not been benchmarked; the package currently parses and recomputes on the main thread when its inputs change.

## Run and review
From the working directory, run `npm run dev`. Frontend: `http://127.0.0.1:5186/analysis`; API: `http://127.0.0.1:5187/api/health`. Run analysis, inspect evidence, and download either JSON to inspect the shared package. Development servers were left running for local review. No changes were pushed or published.

## Modified and new project files
Modified: `package-lock.json`, `shared/analysis.ts`, `src/data/Workspace.tsx`, `src/components/Evidence.tsx`, `src/pages/Analysis.tsx`, `tests/analysis.test.ts`, `tests/e2e/workflow.spec.ts`.

New: `shared/evidence-package.ts`, `tests/evidence-package.test.ts`, `tests/e2e/evidence-package.spec.ts`, `docs/EVIDENCE_PACKAGE.md`, `docs/implementation/2026-10-16-evidence-foundation.md`, and this report. Local planning records live under ignored `.planning/global-readiness/`.
