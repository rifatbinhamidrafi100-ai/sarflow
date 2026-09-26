# Scientific notes

## Real visualization workspace

The primary observatory now displays actual archived NISAR provisional GCOV daily mosaics from NASA GIBS. The source service performs false-color visualization and reprojection; SARFlow positions each WMS image at the exact requested geographic bounds and synchronizes cameras for comparison. It does not recover calibrated power from PNG colors, apply thresholds to RGB, or report dB/area/confidence from these images.

The acquisition list contains matching CMR records. A daily mosaic can contain multiple contributing products, so those records are not a complete pixel-level source inventory. Prepared temporal groups share catalog track/frame/direction/mode tokens, but mosaic composition and processing can still vary. Visual change invites investigation and is not event validation. See the ASF Worldview guide: https://hyp3-docs.asf.alaska.edu/nisar-docs/worldview/ .

## Scope and terminology

SAR measures microwave echoes. Synthetic-aperture processing uses platform motion to form imagery. Backscatter intensity responds to roughness, moisture, structure, polarization, and geometry. Radar is useful at night and through most clouds; it is not unaffected by every atmospheric condition.

NISAR combines NASA L-band and ISRO S-band instruments. NASA's mission overview gives approximately 24 cm and 9.4 cm wavelengths. GCOV is a geocoded covariance product; diagonal terms provide intensity information. GUNW contains geocoded unwrapped interferometric phase and associated layers. Phase-based displacement inference is not implemented here.

## Implemented algorithm

1. Validate bounded arrays of positive finite power or null and chronological dates.
2. Intersect both validity masks before processing.
3. Optionally apply a 3 × 3 arithmetic mean in linear power. Invalid centers remain invalid; edges average available common-valid neighbors.
4. Compute `Δ = 10 log10(P_after) − 10 log10(P_before)`.
5. Flag `abs(Δ) >= threshold`, separating increase and decrease. Threshold range: 0.5–10 dB.
6. Report counts, common support, mean signed difference, a conserved histogram with open tails, and threshold sensitivity at ±0.5 dB (clamped).

This is deterministic numerical analysis, not an AI model, calibrated statistical detector, or attribution method. Spatial filtering correlates neighboring values. Counts are cells, not independent samples.

The temporal chart now intersects valid pixels across all selected dates, computes each date's mean linear power on that fixed support, then converts to dB. An empty intersection produces no mean. It is distinct from the paired mean of per-cell differences shown in analysis.

## Uncertainty

No arbitrary probabilities are assigned. The uncertainty lens identifies values near the threshold boundary, and the sensitivity plot shows how counts respond to a changed rule. Neither is a confidence interval. Missing data is reported, never filled with invented observations. Real SAR interpretation requires assessment of calibration, speckle, geometry, temporal decorrelation, terrain effects, and environmental confounders.

## Real-data integration limits

The JSON schema validates syntax and bounded dimensions, not scientific truth. A trusted operator must verify provenance, radiometric units, compatible polarization/track/look geometry, processing version, masks, and common spatial support. The HDF5 importer is conservative and does not replace that review. Its geographic display envelope approximates projected-grid rotation; native array arithmetic remains on the original common grid. Physical area is withheld by default.

No real HDF5 product pair was available in this environment. Real-event accuracy, displacement, flood extent/depth, crop yield, and causation are not established. An application can be demonstrable and technically tested without its real-world scientific outcomes being validated.

## Sources checked during implementation

- NASA mission: https://science.nasa.gov/mission/nisar/
- NASA SAR introduction: https://science.nasa.gov/mission/nisar/get-to-know-sar/
- Product descriptions/specifications: https://science.nasa.gov/mission/nisar/sample-data/
- ASF discovery: https://nisar-docs.asf.alaska.edu/earthdata-search/
- ISRO release: https://www.isro.gov.in/NISARS_Band_SAR_Data_Products_Release.html
- NASA CMR: https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html

The supplied challenge title is used as the project brief. Official challenge-page retrieval failed; registration or acceptance is not asserted.


## Experimental multi-date water workflow

See WATER_WORKFLOW.md for the implemented GCOV reader, terrain schema, multi-date rules, exact resource limits, outputs and current limitations. Product-mask validity is separate from terrain exclusions. Rasterio masked terrain pixels (including nodata=0 and internally masked zeros) become unknown code 255, not clear terrain. All unsupported terrain codes also remain unknown. The existing pairwise signal threshold remains a baseline, not an event classifier.

The current Python reader validates reviewed specification 1.2.1, compatible acquisition metadata, linear gamma0 radiometry and documented product validity. Unknown product specifications are rejected. The legacy importer now applies subswath validity and positive finite numberOfLooks; --quality-reviewed is not scientific evidence. Terrain evidence is still required separately for water candidates.

Software fixtures exercise HDF5 reading, masks, native GeoTIFF exports and API jobs. No real GCOV measurement series or independent water reference labels were processed. Area, probability and real-event accuracy remain unavailable. No official OPERA output or production scientific validation is claimed.
