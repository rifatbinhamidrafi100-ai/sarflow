# Using investigation delivery

Open `/analysis`, select a dataset and observation pair, then run analysis. The existing teaching datasets remain explicitly synthetic.

## Explain and inspect
The Ask the data panel supports English and Bangla through fixed templates. It reads the current evidence package and checks every numeric token against package values. Unsupported damage, casualty and prediction questions are refused. This is a deterministic explanation tool, not an external language model. A number allow-list alone does not establish scientific truth; the fixed templates, source labels and event limitations remain essential.

The data quality inspector shows dates, interval, available acquisitions, grid, units, common/excluded support, polarization/track and supplied pixel area. It states when calibration or resolution is unverified.

## Hotspots
Four-connected, same-sign groups are extracted from the computed change mask. The preview and table show the largest ten; JSON exports all groups. Rows and columns use zero-based native grid coordinates with exclusive right/bottom bounds. Exported runs specify exact selected cell rectangles. Bounding extents are not event outlines. No geographic polygons, hazard classification or ground area is inferred from these groups.

## Deliver results
- **Download evidence PDF:** generates locally in the browser, with dates, source details, processing method, warnings and a native-grid mask image. PDF uses Latin characters and substitutes a visible reference for other characters. Unicode original names remain in HTML and JSON.
- **Download offline brief:** a self-contained HTML artifact containing an embedded SVG mask and evidence summary. Opens without the app or network. Source-document links require internet only when clicked. No scripts, external fonts, images or trackers. Maximum 256 KB; unusually fragmented masks are explicitly omitted to keep the brief small. Typical verified sample: 5,715 bytes and one A4 page when printed. Arbitrary long source text can require more print pages.
- **Download full evidence package:** retains input arrays and source hashes when supplied, settings and results for reproduction. The PDF/brief complement this file; they do not contain the full input arrays.

## Save and review
Enter a title, hypothesis and notes, then select **Save investigation locally**. Storage is specific to this browser and origin; maximum five entries / 4 MB. No automatic upload or cloud sync. Open `/investigations` to review snapshots, notes, reports and hotspots. **Export investigation with notes** backs up the full saved entry. Import either this file or a raw evidence package through the local file selector; calculations and schema are revalidated. Imported derived labels are rebuilt and cannot promote a result to validated status. Notes remain user interpretations. Browser clearing removes local saves, so export a backup.

## Real-data access preparation
Run the public metadata-only processor command documented in `docs/automatic-monitoring.md`, then:

```powershell
.\.venv-water\Scripts\python.exe scripts/prepare_study_plan.py --output docs/my-new-access-plan.json
```

The script reads the project's metadata database in read-only mode and refuses an existing output filename. It groups public filenames to prepare access candidates. That is not a substitute for inspecting actual HDF5 geometry, calibration, quality and event relevance. No download or authentication occurs.

The dated access snapshot in `docs/data-access-plan-2026-10-17.json` is metadata only. For calibrated inputs follow the [official ASF Earthaccess guide](https://nisar-docs.asf.alaska.edu/earthaccess/) with manual Earthdata authentication. Do not paste credentials into code, files or chat.
