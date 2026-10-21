# Project-page draft

These answers describe the audited October 20 version. They are reusable writing blocks, not a verified list of 2026 form fields. Adapt their length to the actual form. Do not describe future features or unfinished science as demonstrated capabilities.

## Project name

SARFlow — See Earth Move

## Challenge

Dancing with the SARs — confirm the final official title and requirements.

## Tagline

Explore satellite observations. Compare dates. See the evidence behind every interpretation.

## Short summary

SARFlow helps people explore NISAR radar observations without confusing a satellite image with a confirmed environmental event. Users find a place on an interactive Earth, discover available observations, compare acquisition dates and inspect source records, processing status and limitations. NASA CMR provides observation metadata and NASA GIBS supplies browse imagery. A shared evidence package connects explanations and downloadable investigation summaries. Quantitative teaching examples are clearly synthetic; calibrated-data processing is a separate local workflow that still needs a completed real-data case and independent validation.

## Problem

Radar can observe surface properties in conditions that make optical imagery difficult to use, but interpreting a radar image requires context. A bright or dark region alone does not establish flooding, damage or its cause. People also need to know when an observation was acquired, whether dates are comparable, what processing occurred and where evidence is missing. A visually convincing interface can hide those distinctions.

## Our solution

SARFlow organizes an investigation around a place and its evidence record. A searchable globe provides geographic context. The observation catalogue identifies available NISAR products and acquisition times. A timeline makes existing observations and missing coverage visible. Comparison views help users inspect changes while retaining the source and date of each image.

The application separates observation, processing and interpretation. Evidence records carry source information, methods, measurements when available and limitations. An English/Bangla assistant uses deterministic explanations grounded in that record. Exportable JSON, PDF and lightweight HTML briefs preserve the evidence outside the main interface. Saved investigations retain a bounded local history in the browser.

A separate Python importer and surface-water workflow prepare a path from calibrated GCOV measurements to quantitative analysis. That workflow is not yet demonstrated on a completed real-data case in this version. Synthetic teaching exercises explain the mathematics without presenting their numbers as actual satellite measurements.

## NASA data and how we use it

We query NASA's Common Metadata Repository for the `NISAR_L2_GCOV_PROVISIONAL_V1` collection. Product metadata supports discovery, acquisition dates, footprint context and source links. We request the NASA GIBS `NISAR_L2_Geocoded_Polarimetric_Covariance` layer for geographic browse imagery and preserve its observation date and identity.

GIBS images are rendered visualizations. We do not recover calibrated backscatter, flood area or accuracy from their RGB colors. The local numerical importer requires compatible calibrated HDF5 products, their metadata and quality support. It is separate from the browse pipeline.

Sources: [NASA CMR search API](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html), [NASA GIBS access documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/), [ASF NISAR products overview](https://nisar-docs.asf.alaska.edu/products-overview/).

## What makes the approach useful

SARFlow makes provenance and uncertainty part of the interaction. A user can inspect the observation date, source record and analysis status rather than infer credibility from a colorful map. The same evidence structure supports the map, explanations and reports. Missing measurements remain unavailable instead of being replaced with an invented confidence score. Localized briefs can make an investigation easier to understand and share.

This is a design contribution, not a claim that no other Earth-observation platform offers these functions.

## Technology

React, TypeScript and Vite provide the application; MapLibre GL provides the globe and maps; Express provides discovery and workflow APIs. Zod validates shared data contracts. Python, h5py, NumPy, rasterio and pyproj support the optional local calibrated-data workflow. SQLite records the separate processor's jobs and provenance. jsPDF and browser-side exports create investigation briefs. Vercel hosts the web preview; the Python processor is not included in that deployment.

## Intended users and potential impact

Students, educators, journalists and environmental investigators can use SARFlow to ask what was observed at a place, compare dates and communicate the supporting evidence. A validated surface-water workflow could eventually help prioritize places for further review. No operational emergency-response outcome, user adoption statistic, prevented loss or confirmed damage is claimed.

## What works in this version

- Global location search and map navigation.
- NISAR metadata discovery and browse-image comparison where source coverage exists.
- Place observation ledger, dates, source records and explicit unavailable states.
- Evidence explanations in English and Bangla using deterministic templates.
- Saved local investigations and evidence exports.
- Synthetic numerical learning examples and software-tested local importer/processor components.
- A separate, clearly attributed optical reference overlay for Rasuwa.

## Scientific limitations

We have not completed a real calibrated-data end-to-end analysis or independent scientific evaluation in this version. The educational quantitative examples use synthetic inputs. Browse imagery cannot establish calibrated change magnitude or inundated area. The experimental water method needs suitable aligned terrain information, compatible observations and evaluation across conditions. It currently lacks speckle filtering and adaptive threshold calibration. The imported optical landslide reference is not a binary water truth mask. No event confidence, flood-detection accuracy or confirmed damage result is claimed.

## Future work

Complete one compatible calibrated surface-water investigation; document its source products, masks and parameters; compare it with an appropriate independent reference; report both successes and errors. Then improve classification, deploy persistent processing with approved hosting, and extend only the analyses supported by suitable evidence. Drought, heat, exposure estimation and distributed global processing are future work.

## AI assistance and authorship disclosure

OpenAI Codex assisted development, debugging, refactoring, testing and preparation of documentation. The team remains responsible for reviewing the implementation and claims. The runtime evidence assistant uses deterministic rules/templates rather than an external generative-model API. Development assistance is not evidence of scientific validation.

Add any other AI tools, generated media and their actual uses before submission. Freebuff and OpenCode appeared in planning screenshots, but their use in producing this source has not been independently established. Do not list an invented usage or claim that all code was written without AI.

## Team and contributions — complete with real facts

- Team name: [enter registered team name].
- Registered event: [enter local or universal event].
- Official team/project URL: [paste after registration].
- Members and roles: [each real member, consented name, actual work].
- Prior work: SARFlow existed before the hackathon; identify reused components and dates.
- Work completed during the event: [record only work actually completed during the permitted period].
- Organizer reuse guidance: [record the decision and date].

## Source, demo and credits

- Repository: https://github.com/rifatbinhamidrafi100-ai/sarflow — older base until the current snapshot is pushed with approval.
- Current source: accompanying `SARFlow-source-2026-10-20.zip` and its `SOURCE_MANIFEST.json`.
- Current preview: https://sarflow-b13odmgov-rbhr1.vercel.app — requires Vercel sign-in; replace with an approved judge-accessible URL.
- Demo video: [not supplied or verified in this package].
- Data/context credits: NASA/JPL-Caltech and ASF for NISAR resources; NASA GIBS; EOX and Copernicus for Sentinel-2 cloudless; OpenStreetMap contributors; Open-Meteo and GeoNames; Copernicus EMS and UNESCO IHP-WINS for the imported reference; Natural Earth; Inter font authors. Preserve the source-specific license and attribution records.
- Software license: not selected; no project-level LICENSE was found. Public visibility does not itself grant an open-source license.
