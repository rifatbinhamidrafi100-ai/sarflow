# Data provenance and attribution

## Real-imagery upgrade: NASA GIBS archive

`public/data/observatory.json` and `public/observations/` contain fifteen actual NASA GIBS daily false-color NISAR GCOV images: four each for the three initial regions, and three for Nepal?s Rasuwa corridor. Collection: `NISAR_L2_GCOV_PROVISIONAL_V1`. Layer: `NISAR_L2_Geocoded_Polarimetric_Covariance`.

The archive script queries CMR at the region center, groups matching track/frame/direction/mode identifiers, selects four chronological dates, and requests 1024 × 900 WMS images in EPSG:4326 for fixed geographic bounds. The original returned PNG bytes are retained with SHA-256 hashes and exact URLs. Thumbnail requests use the same NASA layer/date/bounds at 320 × 281; thumbnails are display-only and separately source-linked. No generated scenery or image-to-power conversion is used.

NASA's daily mosaics can combine products with different acquisition characteristics. Each listed CMR granule is a matching record, not an exhaustive pixel-source inventory. Dates shown are actual catalog acquisition dates and WMS daily-mosaic request dates. Differences in rendering/mosaic composition can affect visual comparisons. There is no validated event classifier or quantitative inference from these colors.

Authoritative documentation: https://hyp3-docs.asf.alaska.edu/nisar-docs/worldview/
Layer metadata: https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/NISAR_L2_Geocoded_Polarimetric_Covariance.json

Original NASA requests and hashes are exportable through the observation evidence panel. User notes are labeled user interpretation, retained only in component memory until exported, and are not sent to an external service.

## 1. Synthetic analytical fixtures

`shared/demo.ts` creates three deterministic 48 × 48 grids over six illustrative dates, 12 days apart, starting 1 June 2026. These dates are mathematical labels, not satellite acquisitions. Geographic bounds provide context only.

Generator v1 uses smooth sinusoidal base values and programmed wetland-like, field-like, and disturbance-like changes in dB, converts to linear power, and explicitly masks border/selected cells. It is not a stochastic radar simulator or generated satellite image. Every view labels the arrays **DEMO DATA / SYNTHETIC**. Fixture content is project-authored and dedicated under CC0-1.0. No physical pixel-area metadata is assigned.

Transformations are common-valid masking, optional linear-power mean, log-ratio and threshold. Exports include arrays, source identifiers, selected pair, processing settings, limitations, and results.

## 2. Genuine archived NISAR metadata

`public/data/catalog.json` contains six NASA CMR GCOV beta records retrieved with the exact public query saved in its `source` field. It preserves CMR ID, granule title, acquisition UTC date, collection, footprint coordinates, source URL, and available browse URL. Retrieval time is stored in the file. These are actual metadata, not synthetic acquisitions.

The snapshot is global, not evidence of coverage at any teaching-case coordinates. A Bangladesh query returned zero beta collection entries. This does not establish absence in other mission collections. Browse download attempts did not yield accessible image content; no ASF browse pixels were retained. `scripts/archive-catalog.mjs` reproduces public metadata archiving, without handling credentials.

## 3. Official NASA context image

`public/images/nisar-seattle.jpg` is an official NISAR Views Seattle visualization linked from the NASA mission page, credited NASA/JPL-Caltech. The exact download URL and retrieval time are in `public/data/image-source.json`. The requested image is resized through NASA's image endpoint and cropped by CSS for display. It is not an analysis input; JPEG color/brightness is not converted to SAR power.

Source: https://science.nasa.gov/mission/nisar/
Usage guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/

NASA imagery use does not imply endorsement. No NASA insignia or fabricated logos are included.

## 4. Geographic context and typography

The bundled `public/data/land.json` is Natural Earth 1:110m land geometry converted from `world-atlas` TopoJSON using `topojson-client`. Natural Earth geographic data is public domain. This coarse context layer is not local cartographic ground truth.

Optional street tiles are requested only when enabled, from OpenStreetMap; attribution is displayed on the map. No street tiles are bundled. Source/terms: https://www.openstreetmap.org/copyright and https://operations.osmfoundation.org/policies/tiles/ .

Inter is locally hosted from the existing project asset. Inter is distributed under the SIL Open Font License 1.1: https://github.com/rsms/inter/blob/master/LICENSE.txt .

## 5. Future/local imported observations

The importer creates a new JSON file and refuses overwriting. Original HDF5 files remain unchanged. Output includes original basenames and SHA-256 hashes, acquisition identifiers, coordinates, polarization, track, processing notes, and limitations. No secrets are read or stored. Imported source data is not uploaded externally. Operator-supplied records require review before scientific interpretation.


## Nepal Rasuwa event investigation

Event reporting is separate from satellite imagery. Reviewed 24 September 2026:
- NSET: https://nset.org.np/disaster/rasuwa-flood/ ? reported 26 August event and hazard sequence.
- UNICEF: https://www.unicef.org/nepal/reports/nepal-floods-2026-humanitarian-situation-reports ? dated response reports.
- UNFPA: https://www.unfpa.org/resources/situation-report-nepal-flood-28-august-%E2%80%93-3-september-2026 ? humanitarian impacts.

Brief attributed paraphrases are used; third-party photos and full reports are not redistributed. Consult each source for its reuse terms. No emergency or casualty totals are maintained here.

`node scripts/archive-nepal.mjs` appends or refreshes the Nepal region without changing the initial regions. If regenerating the entire archive, run it after `archive-observatory.mjs`. Exact CMR query: point 85.3,28.0; 1 August?20 September 2026. Selected acquisitions: 19 August, 31 August, 12 September; ascending track 098, frame 016, mode 4005 DHDH, processing identifier P05023. These catalog matches do not prove homogeneous daily-mosaic composition.

NASA GIBS requests use bounds [85.05,27.75,85.55,28.4], 1024 ? 900 PNGs. Original bytes, SHA-256 hashes, record IDs, and exact WMS requests are retained in the manifest. NASA/ASF attribution applies; no endorsement implied. The 320 ? 281 preview is a separate NASA WMS request. No pixel processing, classification, flood polygon, or quantitative event estimate was created.


## World Explorer

Open `/world` for a globe/flat map with EOX Sentinel-2 cloudless 2024 optical imagery, zoom-dependent tiles, global place search, coordinate navigation, full screen, and attributed PNG/view-metadata export. This is a multi-acquisition optical mosaic, not NISAR data or current flood imagery. Zoom is capped at 14; polar caps and source gaps are not represented as observed coverage. Exports preserve the rendered canvas resolution, not a promised sensor ground resolution.

Source: https://maps.eox.at/ and https://eox.at/2025/03/sentinel-2-cloudless-2024/. Attribution: Sentinel-2 cloudless ? https://s2maps.eu by EOX IT Services GmbH https://eox.at (Contains modified Copernicus Sentinel data 2024). Layer license: CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/. This setup is for non-commercial research/education; commercial use requires an appropriate imagery arrangement. Tiles load from the provider; the application does not bulk-download them.

Place search uses the server-side `/api/places` adapter for https://open-meteo.com/en/docs/geocoding-api (GeoNames attribution). Search terms are sent to that provider when submitted. The endpoint validates queries and upstream coordinates, limits uncached requests, applies a timeout, and caches up to 100 result sets for one hour. There is no API key or personal-location tracking. Internet is required for these services; archived regional NISAR workflows remain local.


## Worldwide radar animation

`/global-radar` searches a place name or supplied coordinates, discovers up to eight repeated NISAR acquisition dates from NASA CMR, and opens the full radar timeline/comparison workspace. `/world` links the selected coordinates into this flow. Searches are supported within latitude ?84.8 and longitude ?179.8. Availability is not guaranteed: the latest 100 records at a point may not contain a repeated group.

The server `/api/global-radar` validates coordinates, bounds each request to 0.3 degrees, selects a repeated track/frame/mode group, rate-limits uncached discovery, and caches at most 30 responses for five minutes. It returns exact NASA GIBS WMS requests for 1536 ? 1536 geographic browse images. These are on-demand images, not locally archived byte snapshots; hash and byte-count fields are null. Images load from NASA only when viewed. Daily mosaics can combine acquisitions and show transparent gaps. Pixel count is not claimed ground resolution. No calibrated numerical result is derived.

Playback advances through discrete acquisitions after rendering; it does not synthesize intermediate ground motion. The existing archived workflows are unchanged. NASA visualization documentation: https://hyp3-docs.asf.alaska.edu/nisar-docs/worldview/


## HD Earth viewing and 4K export

World Explorer now defaults to HD: at least 2? canvas pixel density (capped at 3?) and a smaller display tile size that requests finer available pyramid tiles. Standard mode uses 1? density and fewer tiles. Quality changes preserve center, zoom, bearing, pitch, and projection. Both modes use the existing EOX 2024 optical mosaic; no new acquisition or ground-resolution claim is implied.

Save 4K Earth PNG renders a separate 3840 ? 2160 map, then adds a 160-pixel attribution strip (final PNG 3840 ? 2320). It waits for rendering and rejects tile failures or a 60-second timeout. The export keeps the current center and approximate horizontal extent, adapting to a 16:9 map aspect ratio. It does not upscale a screenshot or synthesize detail. Higher quality uses more network and GPU resources. Existing CC BY-NC-SA attribution and use restrictions apply.


## Local water-candidate outputs

The /water route accepts only locally registered input manifests; it never falls back to the numerical teaching fixtures or browse PNGs. A manifest explicitly distinguishes calibrated-measurements from synthetic-software-fixture. Native GCOV input hashes, acquisition metadata, actual effective parameters, terrain source/method, terrain file and associated mask-file hashes, manifest hash, TIFF output hashes and exclusion reason bits are exported. Dataset type is a provenance declaration; compatibility checks are not independent calibration validation.

PNG output tiles are display previews of computed arrays. Classes, reason bits, generic anomalies, baseline/target power in dB and signed change are retained in compressed native-CRS GeoTIFFs. Ground area and reference-label accuracy remain null. Tests construct local HDF5/terrain files in temporary directories and do not register them as real observations. See WATER_WORKFLOW.md for input registration and reproducibility instructions.
