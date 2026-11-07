# Evaluate a computed water result

The local evaluator measures binary **target-date water candidate agreement**, not flood-event accuracy. It accepts an existing `water_pipeline.py` result and a separately prepared reference raster. It does not alter scientific outputs or automatically mark an investigation validated.

## Inputs

1. A completed `result.json` with its original `classes.tif` and checksum.
2. A single-band reference GeoTIFF: 0 = not water, 1 = water; unknown pixels must use declared nodata or a valid raster mask. CRS, affine transform and dimensions must exactly match the prediction. Prepare alignment explicitly with a documented categorical resampling method; the evaluator never silently resamples.
3. Reference metadata JSON containing nonempty `source`, `acquisitionTime` (ISO timestamp with timezone), `samplingMethod`, `preparationMethod`, `limitations`, and `independentOfPrediction: true`. Supply actual source identifiers/links and disclose label uncertainty, sampling bias and temporal mismatch. Do not generate labels from the predictions being assessed.

## Run

From the repository root, with the scientific Python environment activated:

```powershell
python scripts/evaluate_water.py path/to/result.json path/to/reference.tif path/to/reference-metadata.json path/to/evaluation.json
```

The output must not already exist. To display it in the existing water investigation, save it as `evaluation.json` beside that job's `result.json` under `artifacts/water-jobs/<job-id>/`, then reopen `/water?job=<job-id>`. Evaluation computation is still an explicit local CLI operation, not a cloud job.

The completed-job API `/api/water/jobs/<job-id>/evaluation` validates the receipt schema, support arithmetic, metrics, observation identifiers/dates, window size, processing-receipt hash and actual prediction-file hash before serving it. Missing receipts return pending; invalid or mismatched receipts return 422 and withhold metrics. The UI shows reference source/date, evaluated and excluded counts, metrics, methods, limitations and a separate JSON export. It never marks agreement as confirmed flooding or independently reviewed scientific validation. Reload the page after generating a receipt.

Prediction sidecars (including external masks) are rejected because the existing processing report does not checksum them. Reference raster dependencies reported by Rasterio are individually checksummed. Preserve these files with the receipt.

## Interpretation

Prediction classes 1 and 2 represent target-date water candidates; 3 and 4 represent target-date non-water-like classifications. Classes 0 and 5 and masked pixels are excluded. Reference nodata is also excluded. Metrics use only their joint supported pixels.

The receipt reports true/false positives and negatives, precision, recall, F1, intersection over union, accuracy, sample size, excluded counts, CRS/bounds, source observation metadata and file checksums. Undefined ratios are `null`, not zero or perfect agreement. Raster cells are spatially correlated, so sample size is a pixel count, not an independent statistical sample count. Physical area and statistical confidence intervals are not calculated.

`agreement-computed` means arithmetic completed on measured-data predictions. It does not certify reference independence, temporal suitability or scientific validity. Those require review. `software-fixture-only` must never be presented as real-world validation. `no-evaluable-support` means no supported comparison was possible.

Keep independently prepared labels separate from calibration/training labels. A good score on selected classified pixels can conceal poor coverage: always report excluded pixels alongside the metrics.
