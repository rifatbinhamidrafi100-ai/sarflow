# Experimental water-candidate workflow

Open `/water`. The globe, rendered NISAR imagery and teaching lab remain separate. With no registered HDF5 inputs the page intentionally shows an empty state. There is no silent synthetic fallback.

## Local setup

From the SARFlow directory, using PowerShell:

```powershell
python -m venv .venv-water
.venv-water/Scripts/python.exe -m pip install -r scripts/water-requirements.txt
npm run dev
```

No credentials are read or saved. Obtain authorized source files yourself; authentication must be manual. No private input is uploaded by this pipeline.

## Register measurements

Create `data/water-inputs/brahmaputra.json`. Paths resolve relative to that manifest. Example paths below must be replaced with actual local files; this is not a supplied dataset:

```json
{
  "dataType": "calibrated-measurements",
  "location": "Brahmaputra study window",
  "files": ["baseline-1.h5", "baseline-2.h5", "baseline-3.h5", "target.h5"],
  "row": 0, "col": 0, "height": 512, "width": 512,
  "frequency": "A", "co": "HHHH", "cross": "HVHV",
  "terrain": {
    "file": "terrain-exclusions.tif",
    "source": "Documented source and acquisition/geometry applicability",
    "method": "Documented derivation of layover/shadow and unknown pixels"
  }
}
```

Use `synthetic-software-fixture` only for constructed software-test inputs. Products are sorted chronologically; the latest is the target and all previous dates form the baseline. Require 4–30 unique dates/IDs. Window size is 16–1024 pixels per axis, processed in 256-pixel tiles. One active subprocess is permitted; timeout is 120 seconds. Twenty on-disk job directories is the storage gate. Failed/cancelled outputs are withheld; jobs are not resumed after a server restart. Review/archive artifacts manually when the limit is reached.

The reader currently supports reviewed GCOV specification **1.2.1 only**. It requires exact native grids, projected metre CRS, matching track/frame/look/orbit direction, frequency/polarizations, product version, software version and selected processing flags. It checks explicit linear gamma0 radiometry, RTC applied, dimensionless real diagonal power, fill values, positive finite power and numberOfLooks. Unknown versions/conventions are rejected, not guessed. Metadata checks are not independent radiometric calibration validation.

## Terrain schema and masks

The terrain raster must exactly match the selected window's CRS, transform and dimensions. No resampling is performed. Codes: **0 explicitly clear; 1 layover; 2 shadow; 3 both; 255 unknown**. It is read with `masked=True`; masked/nodata pixels and every unsupported code are normalized to 255 after promotion to a compatible dtype. Therefore a raster declaring `nodata=0` has **unknown**, not clear, zero pixels. Internal or external masks override stored zero values. Source and associated mask-file hashes are exported.

GCOV's own `mask` is different: 1–5 are valid subswaths, 0 is invalid/partially focused, and 255 is outside radar bounds. It is not a layover/shadow mask. Missing product quality excludes pixels. Missing terrain evidence or cross polarization prevents water candidacy; it does not prevent explicitly labeled generic backscatter comparison where product support exists.

## Method and outputs

All dates and available selected channels share a valid-pixel intersection. No interpolation or spatial filtering is applied. A median pre-target co-pol baseline provides signed change; all pre-target observations must consistently satisfy dual-pol low-return or high-return conditions. Default thresholds (co −17 dB, cross −24 dB, change 3 dB, separation margin 1 dB) are **experimental, not locally calibrated**. Outputs distinguish persistent, new and receding water candidates, non-water-like signals, exclusions and insufficient evidence. No inundated-vegetation capability is asserted.

The retained baseline flags absolute target-minus-previous co-pol change on the same all-date product support. Its count is reported separately; it is not a water classifier or a comparative accuracy score. Terrain reasons are exported separately from generic signal changes.

Outputs are tiled, compressed native-CRS GeoTIFFs (`classes`, `reasons`, `anomaly`, `baseline`, `target`, `delta`), display PNG tiles and JSON containing exact effective parameters, input/output hashes, metadata, masks, dates, support and limitations. PNG tiles are only previews of computed values; numerical processing never starts from browse colors. Area and accuracy remain null. These GeoTIFFs are not claimed to be optimized COGs.

Reruns clear the previous job/result, abort prior requests and invalidate older generations. Late submissions, polls and cancellation responses cannot update a newer run. Unmount aborts client requests; a submitted server job may continue until timeout unless explicitly cancelled.

## Validation and limitations

Software tests use constructed HDF5 and terrain files. They establish arithmetic, mask, API, export and state-machine behavior—not real NISAR product integration or Earth-event accuracy. No real calibrated GCOV measurements or independent reference labels were supplied. No accuracy evaluator, trained model, independent event validation, calibrated probability, terrain-mask generation, or justified physical-area estimation is implemented.

Next inputs: at least three compatible pre-event GCOV acquisitions plus a later target over Brahmaputra; documented product maturity/calibration and source URLs; aligned terrain exclusions with validity metadata; independent dated water/non-water reference labels with their source, resolution and uncertainty. Reserve disjoint location/event/date groups for evaluation before tuning. Precision, recall, F1, IoU and false-detection rates must not be reported until that reference evaluation is performed.

## Sources and OPERA decision

- JPL GCOV Rev E, specification 1.2.1, §4.3.3 and metadata tables: https://nisar.asf.earthdatacloud.nasa.gov/NISAR-SAMPLE-DATA/DOCS/NISAR_D-102274_RevE_NASA_SDS_Product_Specification_L2_GCOV_Nov8_2024_w-sigs.pdf
- ASF GCOV guide: https://nisar-docs.asf.alaska.edu/gcov/
- Actual OPERA NISAR entry point inspected: https://github.com/opera-adt/DSWX-SAR/blob/main/src/dswx_sar/dswx_ni.py
- Dependencies inspected: https://github.com/opera-adt/DSWX-SAR/blob/main/docker/requirements.txt

The OPERA NISAR entry point invokes mosaicking, preprocessing, threshold estimation, fuzzy computation, region growing, ancillary masking, bimodality refinement, optional inundated vegetation and MGRS output. Dependencies include GDAL, SciPy, scikit-image, OpenCV, rasterio and geospatial libraries. Its existence does not establish readiness for the supplied environment or inputs. SARFlow does not vendor or invoke it and does not claim official OPERA output; this is a smaller independently implemented experimental baseline.

## Test commands

```powershell
npm test
.venv-water/Scripts/python.exe -m unittest discover -s tests -p test_water.py -v
npm run build
npx playwright test tests/e2e/water.spec.ts tests/e2e/earth-investigation.spec.ts tests/e2e/workflow.spec.ts
```
