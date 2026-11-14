# Scientific readiness — 14 November 2026

SARFlow is a working research and education demonstrator. Discovery, calibrated-reader code and compatibility checks are implemented. A real multitemporal flood study and independent scientific accuracy evaluation remain incomplete.

This record updates the scientific gaps identified in the 13 November documentation. It does not mark missing evidence as completed.

## Requirements and current evidence

| Scientific requirement | Current status | Evidence and remaining work |
| --- | --- | --- |
| NASA NISAR data discovery | Implemented | Public NASA CMR queries returned metadata candidates; discovery is separate from access to measurements. |
| Calibrated GCOV reader | Implemented; one real acquisition checked | The published Arctic reader verification covers one acquisition and a bounded window. It does not demonstrate temporal change or a floodplain investigation. |
| Product compatibility checks | Implemented | Code checks measurement metadata and grids. Filename-compatible catalog groups still need actual HDF5 inspection. |
| Multi-date real observations | Insufficient | Two possible four-date provisional groups were found. No compatible four-date measurement series has been downloaded and verified for this investigation. |
| Terrain validity support | Incomplete for a real study | The workflow supports explicit terrain and quality exclusions, but suitable AOI-specific inputs and their support have not been established for the shortlisted series. |
| Independent reference data | Candidates only | Six nearby-date OPERA DSWx-HLS catalog records were found. Their raster pixels, clouds/shadows, coverage, temporal suitability and independence have not been reviewed. |
| Real flood case study | Not completed | No completed calibrated flood-analysis case with reviewed baseline and event evidence is available. |
| Independent accuracy evaluation | Not completed on real data | Evaluation software exists, including false-positive/miss reporting in the publication gate. No measured detection accuracy or false-positive rate has been established for a real SARFlow flood case. |

## Refreshed discovery and access checks

Checks were performed on **14 November 2026** at **25.15° N, 89.8° E**, with a 180-day NISAR lookback, 100 records per page and a three-page cap.

- `NISAR_L2_GCOV_PROVISIONAL_V1`: **20 metadata records**, with **two groups** containing at least four distinct acquisition times under the existing filename-grouping rules. Pagination was not truncated.
- `NISAR_L2_GCOV_V1`: **four metadata records**, with **no four-date group** under those rules. Pagination was not truncated.
- Actual unauthenticated GET requests asking for bytes 0–7 of both shortlisted target files returned **HTTP 401 Unauthorized**. Neither HDF5 signature was verified and no measurements were obtained.
- OPERA query: `OPERA_L3_DSWX-HLS_V1`, same point, **12–18 October 2026 UTC**, 100-record cap: **six metadata candidates**. The closest catalog acquisition time is approximately **5.05 hours after** the ascending target below. This is a time offset, not evidence of usable reference coverage.

The selected access shortlist is the ascending group `069_A_014_4005_DHDH_A_P05023`:

| Acquisition start (UTC) | Exact catalog product title |
| --- | --- |
| 2026-09-10 23:21:31 | `NISAR_L2_PR_GCOV_030_069_A_014_4005_DHDH_A_20260910T232131_20260910T232206_P05023_N_F_J_001` |
| 2026-09-22 23:21:32 | `NISAR_L2_PR_GCOV_031_069_A_014_4005_DHDH_A_20260922T232132_20260922T232206_P05023_N_F_J_001` |
| 2026-10-04 23:21:32 | `NISAR_L2_PR_GCOV_032_069_A_014_4005_DHDH_A_20261004T232132_20261004T232206_P05023_N_F_J_001` |
| 2026-10-16 23:21:32 | `NISAR_L2_PR_GCOV_033_069_A_014_4005_DHDH_A_20261016T232132_20261016T232206_P05023_N_F_J_001` |

These four consecutive 12-day catalog candidates are an acquisition shortlist, not an established flood event, verified common grid or calibrated result. Collection maturity does not validate SARFlow's interpretation.

The alternative descending group is `019_D_076_2005_DHDH_M_P05023`, with shortlisted acquisition dates of 9 July, 7 September, 1 October and 13 October 2026 UTC. It remains unverified in the same way.

See the [sanitized discovery/access record](evidence/scientific-readiness-20261114.json) for query parameters, catalog records and the two HTTP checks. Only public metadata and status information are included; there are no credentials, cookies or authenticated redirect URLs.

## Reproduce public discovery

From the repository root, using a Python environment with the processor dependencies installed:

```powershell
python scripts/discover_water_study.py --lat 25.15 --lon 89.8 --output provisional-discovery.json
python scripts/discover_water_study.py --lat 25.15 --lon 89.8 --collection NISAR_L2_GCOV_V1 --output validated-discovery.json
```

Use new output filenames: the script refuses to overwrite an existing report. These commands discover metadata only and never log in or download measurements. Counts can change with collection updates and the moving lookback window.

NASA/ASF documents the required manual Earthdata authentication for [downloading or streaming NISAR products](https://nisar-docs.asf.alaska.edu/earthaccess/). Do not commit credentials or extract browser sessions. A browser login does not automatically authenticate a separate Python process.

## Work required before scientific claims

1. Obtain the four authorized HDF5 measurements and retain source IDs, acquisition times and SHA-256 hashes.
2. Inspect actual grid/CRS, geometry, calibration/radiometry, processing versions, polarization, common coverage and quality support. Catalog filenames are insufficient.
3. Define a study AOI and document terrain, shadow, layover, invalid-data and missing-polarization exclusions.
4. Independently prepare suitable reference labels, document their acquisition times and uncertainty, and explicitly align categorical labels to the prediction grid.
5. Run the existing calibrated workflow and [target-water evaluator](WATER_EVALUATION.md). Preserve parameters, prediction/reference hashes, confusion counts, evaluated support and exclusions.
6. Keep threshold calibration separate from held-out evaluation. Report false positives and misses, not only a favorable accuracy figure.
7. Assess flood change using suitable baseline and event evidence. OPERA target-date water agreement alone does not establish new flooding, event cause, damage or safety.
8. Complete broader independent cases and review before passing the existing scientific publication gates. Do not lower those gates to release one case.

## Software verification and its limits

The local checkout was checked on 14 November 2026:

- `python -m unittest discover -s tests -p 'test_*.py'`: **79 passed**.
- `npx vitest run tests/water-evaluation.test.ts tests/water-reference.test.ts`: **7 passed**.
- `npx vitest run tests/monitoring.test.ts`: **9 passed**.

These are local software checks, not GitHub Actions results or scientific validation. The Python suite emitted existing Rasterio georeferencing and affine-operation warnings. No real-data accuracy result was produced by these tests.

This documentation update does not modify the algorithm, thresholds, terrain inputs, validation policy or scientific outputs.
