# Earthdata and storage handoff

Prepared a dedicated storage folder at `D:\SARFlow-study` after the user asked to carry out the setup. Existing files were not replaced. The non-secret configuration uses a24GiB storage cap,8GiB per file and two attempts per explicit cycle.

Created `D:\SARFlow-study\.venv` and installed the processor requirements from PyPI. Dependency consistency check reported no broken requirements. Earthaccess and raster dependencies imported successfully; no login was attempted through the agent tools.

The metadata-only worker cycle completed, but recorded zero source observations, zero downloaded files and zero processed outputs. Fresh public CMR queries by study point, nearby stored point, study bounds, configured short name globally and its verified collection concept ID returned zero granules at this inspection. Collection inventory still listed the provisional collection. One unsorted diagnostic query returned a CMR400 Elasticsearch fielddata error; the worker's sorted queries completed with empty results. This does not establish absence of environmental change, nor availability of a downloadable measurement series. Older cached candidates must not be treated as freshly available downloads.

Opened the official Earthdata page in Chrome, then navigated to registration at the user's request. Account creation, verification and authentication have not been confirmed. Credential entry and acceptance of account terms remain manual. No credentials are included in this report or application files.

Do not launch ingestion until suitable current source records have been identified. Browser sign-in does not automatically authenticate the separate Python process; its interactive, non-persisted sign-in remains separate. No browser session is extracted or reused by the processor.

Once source access is ready, use the prepared environment:

```powershell
& 'D:\SARFlow-study\.venv\Scripts\python.exe' 'C:\Users\rifat\Downloads\files\sarflow\sarflow-recovery-20261016\scripts\run_study.py' check --storage 'D:\SARFlow-study'
```

No measurement was downloaded, no calibrated numerical result was produced, and no independent scientific evaluation was completed. The existing website deployment was unchanged.

## Later diagnosis: NASA catalogue incident

Earthdata Search displayed an outage banner stating that CMR had Elasticsearch stability issues beginning October19,2026. The page also displayed "Something went wrong fetching collection search results". NASA's status page independently reported CMR application degradation and search-integrity service degradation: https://status.earthdata.nasa.gov/ . Therefore earlier zero-result responses must be treated as inconclusive during the incident, not as proof that the collection contains no usable observations.

The browser Earthdata profile had been confirmed signed in. Clicking Earthdata Search Log In used the existing browser session and returned through the authorization redirect without a password prompt, but collection search still failed. No browser credentials or session data were extracted.

Separately, the third terminal attempt saved the sanitized status `manual-authentication-failed`, with authentication false and zero downloads. The exact cause was not recorded. The catalogue incident alone does not establish why Python authentication failed. Repeated terminal/password prompts have been stopped while this distinction is investigated.
