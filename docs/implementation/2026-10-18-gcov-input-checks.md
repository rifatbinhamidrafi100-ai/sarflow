# Local GCOV input checks

The importer now supports a read-only compatibility check before writing or registering a numerical dataset. It uses the same metadata, coordinates, timestamps and validity checks as the processing reader. It never downloads data or handles credentials.

From the repository root, replace the example paths and window with actual local products:

```powershell
.\.venv-water\Scripts\python.exe scripts/import_gcov.py 'C:\radar\before.h5' 'C:\radar\after.h5' --id study-window --title 'Study window' --location 'Selected study area' --row 0 --col 0 --size 128 --check-only
```

The JSON printed to the terminal reports acquisition IDs/dates, each observation's valid cells, all-date common support, and limitations. It does not write a dataset. `compatible: true` describes the checked grid/metadata contract; it does not assert temporal suitability, calibration validity, event accuracy, or nonzero common support. No local file paths appear in a successful check report. Complete source files are read for SHA-256 provenance, so large products can take time.

For import, remove `--check-only` and add `--output` with a new JSON filename. Existing output files are refused. Review the resulting dataset through SARFlow before analysis. This check supports a single intensity channel, not a complete water-processing readiness assessment. Water processing additionally requires its separate manifest, at least four dates, dual polarization, and documented aligned terrain support.

Corrections:

- Unsuffixed product timestamps use the product's UTC convention rather than the PC time zone.
- Acquisition identity comes from `granuleId`, not an operator-renamed filename. Duplicate product identities are rejected.
- Coordinate regularity uses the processing reader's absolute tolerance rather than a relative tolerance that could accept small irregularities.

Verification: 43 Python tests passed, including six new importer checks for UTC/product identity, no-write CLI behavior, disjoint support, irregular grids, duplicate IDs and absent quality masks. Fixtures are synthetic software tests, not NASA measurements. Existing Rasterio/Affine deprecation and ungeoreferenced preview-image warnings remain.

No calibrated HDF5 or terrain/reference GeoTIFF files were found in this checkout during the October 18 inspection. Real-event processing and independent accuracy evaluation remain outstanding. No deployment or authenticated download was performed.
