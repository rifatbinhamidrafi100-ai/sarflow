# API and data-source reference

Audited October 20, 2026. Active integration means there is an implementation in the source; it does not guarantee an upstream service is always reachable or coverage exists at every coordinate.

## External services used

| Service | Exact endpoint or layer | Use and evidence type | Authentication | Source |
| --- | --- | --- | --- | --- |
| NASA CMR | `https://cmr.earthdata.nasa.gov/search/granules.json`; Python also uses `/search/collections.json` | Public catalogue metadata; collection `NISAR_L2_GCOV_PROVISIONAL_V1`; identifiers, dates and footprints, not calibrated pixels | No key in current public discovery requests | `server/catalog.ts`, `server/global-radar.ts`, `server/coverage.ts`, `server/place-observatory.ts`, `processor/catalog.py` |
| NASA GIBS WMS | `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`; `NISAR_L2_Geocoded_Polarimetric_Covariance` | Dated NISAR RGB browse imagery; visualization only | No key in current browse requests | `server/global-radar.ts`, `server/coverage.ts`, archive scripts and `public/data/observatory.json` |
| EOX Sentinel-2 cloudless | `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg` | Fixed 2024 optical mosaic background, not NISAR or a current observation | No key in the configured URL | `src/pages/World.tsx` |
| Open-Meteo geocoding | `https://geocoding-api.open-meteo.com/v1/search` | Place-name search; GeoNames-based geographic context, not weather measurements | No key in current requests | `server/places.ts` |
| OSM Nominatim | `https://nominatim.openstreetmap.org/reverse` | Reverse-geocoded place label | No key; upstream request pacing applies | `server/places.ts` |
| OpenStreetMap tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Optional street-map background | No key; tile policy applies | `src/components/GeoMap.tsx` |

CMR product records link to `https://cmr.earthdata.nasa.gov/search/concepts/{concept-id}.html`. The configured collection can change only through an explicit source-policy review; an upstream collection name is not proof of local measurement compatibility.

GIBS requests use WMS 1.1.1 `GetMap`, `SRS=EPSG:4326`, `BBOX`, `TIME`, width, height and PNG output. Requested raster dimensions are display dimensions, not claims about instrument ground resolution. No quantitative backscatter or water area is derived from RGB browse colors.

## Static external data and optional access

- `public/data/observatory.json`: 15 archived NISAR browse scenes across Puget Sound, Brahmaputra, Sacramento and Rasuwa. These are bundled files with source provenance, not a continuously rewritten archive. Original PNG and lossless WebP display derivatives remain distinguishable.
- `public/data/references/rasuwa-emsr927.json`: imported Copernicus EMSR927 AOI01 GRA PRODUCT v1 reference. The source is optical interpretation of a mass-movement event, dated August 27, 2026. It is not a live EMS API, a flood mask, field verification or SARFlow's own detection. [Reference source](https://ihp-wins.unesco.org/en/dataset/damage-grading-syapru-besi-and-timure-rasuwa-district-nepal-27-august-2026), [official activation](https://mapping.emergency.copernicus.eu/activations/EMSR927/).
- `public/data/image-source.json`: static NASA/JPL-Caltech mission-context imagery, separate from analysis inputs.
- Natural Earth land context and bundled Inter font: static assets; retain attribution and font license.
- Optional calibrated download: Python `earthaccess` can access approved Earthdata/ASF products after manual interactive sign-in, without persisting credentials. No successful actual calibrated processing run is established here. Do not place credentials in the app, source ZIP or submission.

## Services not connected as measurement APIs

No runtime OpenAI, ChatGPT, Gemini or other external generative-model API. The evidence assistant is deterministic. No generic `api.nasa.gov` key or `DEMO_KEY` is used. FIRMS, GPM rainfall, live soil moisture, thermal measurements, operational Sentinel-1 processing and Landsat analysis are not active measurement integrations in this version. Informational links and proposed layers must not be described as completed API connections.

## Internal application API

All paths are relative to the application origin. Discovery routes return source observations or metadata; they do not imply calibrated processing occurred.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Application health |
| GET | `/api/datasets` | Valid registered numerical datasets; malformed imports are skipped |
| GET | `/api/observatory` | Prepared browse archive manifest |
| GET | `/api/catalog?bbox=west,south,east,north` | Bounded catalogue query; at most 20 returned records; bbox limits apply |
| GET | `/api/places?q=...` | Search places |
| GET | `/api/places/reverse?lat=...&lon=...` | Resolve coordinate label |
| GET | `/api/global-radar?lat=...&lon=...&group=...` | Discover browse-compatible acquisition group; group optional |
| GET | `/api/coverage?date=YYYY-MM-DD` | Sampled source coverage for a date; not a complete global inventory |
| GET | `/api/coverage/dates?lat=...&lon=...` | Available acquisition dates near a location |
| GET | `/api/place-observatory?lat=...&lon=...&page=1` | Paginated place observation evidence ledger |
| GET | `/api/monitoring` | Sanitized optional processor status or explicit inactive state |
| GET | `/api/water/inputs` | Eligible server-registered local inputs |
| POST | `/api/water/jobs` | Submit supported local job parameters and registered input ID; not arbitrary file upload or URL execution |
| GET | `/api/water/jobs/:id` | Job state |
| DELETE | `/api/water/jobs/:id` | Remove eligible generated job output under API rules |
| GET | `/api/water/jobs/:id/files/:file` | Read allowed generated result file |

The optional Python service exposes `/health` and `/status` on its separately configured host, default local port 8090. It is not deployed by the Vercel web build. The application connects only if the approved processor URL is configured.

## Dynamic behavior and refresh limits

Global radar and prepared-region discovery check while the page is visible approximately every five minutes (`301000` ms), and on return to visibility. Source failure preserves the last good state. New source metadata may appear after source publication and cache expiry; no acquisition timing or data-release guarantee is made.

The Place Observatory ledger loads on location changes and supported refresh triggers; it has no independent periodic timer. Bundled archives and the EOX 2024 mosaic are static. Browser discovery stops when the page is closed. The separate worker defaults to six-hour cycles and four configured locations while explicitly running. It is not a deployed all-Earth alert system.

Discovery code uses process-local caches and cache-control headers. Headers can permit CDN caching but do not prove observed CDN hit rates or distributed storage. Authenticated downloads and scientific jobs have separate limits.

## Official references and attribution

- [CMR API](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html)
- [GIBS access](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
- [NISAR product documentation](https://nisar-docs.asf.alaska.edu/products-overview/) and [Earthaccess](https://nisar-docs.asf.alaska.edu/earthaccess/)
- [EOX maps and terms](https://maps.eox.at/): Sentinel-2 cloudless has source-specific CC BY-NC-SA terms; retain EOX/Copernicus attribution and verify compatibility before changing distribution or use.
- [Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api)
- [OSM copyright](https://www.openstreetmap.org/copyright), [Nominatim reverse API](https://nominatim.org/release-docs/latest/api/Reverse/), [OSM tile usage](https://operations.osmfoundation.org/policies/tiles/)
- [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/): do not imply NASA endorsement.
