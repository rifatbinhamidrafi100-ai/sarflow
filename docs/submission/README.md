# SARFlow: NASA Space Apps submission preparation

Prepared October 20, 2026; source notes updated October 21. This is a preparation package, not a submitted project, an eligibility decision, or an official NASA form template. Existing dated ZIP packages remain their original snapshots.

## Project identity and links

- Project: **SARFlow — See Earth Move**.
- Intended challenge: **Dancing with the SARs**. Confirm the exact final challenge text when available.
- Promise: Explore a place, discover what satellites actually observed, compare available dates, and inspect the evidence and limitations behind an interpretation.
- Repository: https://github.com/rifatbinhamidrafi100-ai/sarflow
- Repository base commit: `33e94b24933bf811dd59b004e4487d272e78b20f`.
- Public application: https://sarflow-one.vercel.app/study
- The base commit identifies the older preparation snapshot. See GitHub's current main branch and release verification for subsequent source updates. Dated ZIP manifests apply only to their own snapshot.
- Share the public production alias above. Immutable deployment URLs can require Vercel sign-in. A published web application does not establish a validated scientific workflow.

## Read these files

1. [Project-page draft](PROJECT_PAGE_DRAFT.md): copy-ready narrative, NASA-data explanation, contribution and AI disclosure.
2. [API reference](API_REFERENCE.md): active external services, internal endpoints, authentication and refresh behavior.
3. [Science and reproduction](SCIENCE_AND_REPRODUCIBILITY.md): architecture, methods, capability boundaries, source map and commands.
4. [Submission checklist](SUBMISSION_CHECKLIST.md): official guidance, remaining decisions and evidence needed before submitting.
5. [Demo script and judge questions](DEMO_AND_QA.md): an optional rehearsal, not an official required format.
6. [Machine-readable API inventory](API_INVENTORY.csv).

## Readiness in one table

| Item | Current evidence |
| --- | --- |
| Real NASA imagery | NISAR browse imagery from NASA GIBS; static archive and dynamic requests |
| Real observation metadata | NASA CMR discovery, product identifiers, acquisition times and footprints |
| Quantitative teaching examples | Synthetic grids, explicitly educational |
| Local calibrated reader | GCOV 1.2.1/1.5.0 reader; one real Arctic acquisition checked with 4,096 supported pixels per HH/HV channel, source checksum and limitations |
| Local temporal/water processor | Implemented and tested with software fixtures; no completed real temporal comparison or independently evaluated water result |
| Independent scientific validation | Not completed; no defensible accuracy score or confirmed flood area to report |
| Reference overlay | Imported Copernicus EMS optical landslide interpretation; not flood ground truth or SARFlow detection |
| Monitoring | Visible-page discovery refresh; optional separate local worker; no deployed continuous scientific monitoring |
| Public source | Repository main branch; dated local ZIPs are older snapshots |
| Judge access | Public production alias; verify the exact submitted link before submission |
| Competition eligibility | Pre-existing work requires organizer clarification; do not claim a hackathon-only creation |

## Official guidance and uncertainty

The official 2026 event information gives **November 14–15, 2026**. November 5 is the team's earlier internal target, not the published global event date. See the [official event announcement](https://www.spaceappschallenge.org/blog/explore-the-next-frontier-at-the-2026-nasa-space-apps-challenge/).

An [organizer-hosted Santiago event page](https://www.spaceappschallenge.org/2026/local-events/santiago-dominican-republic/) says solution development must take place during the hackathon. This is relevant local-event guidance, not an independent eligibility ruling for this team. SARFlow already exists: obtain written guidance from your own Local Lead or the global organizers about permitted reuse, disclose the prior work, and record what is actually created during the event.

The complete official challenge, submission guide and judging guide could not be retrieved during this audit; requests returned 502 Bad Gateway. Exact form fields, word limits, video duration, slide limits, current award criteria and the detailed AI policy remain unverified. Use the official site and your Local Lead as final authorities. Do not reuse an old year's submission limits as if they were current.

## What still needs a human fact or decision

Team name, member names and consent, real contributions, registered event, official team/project URL, organizer guidance about prior work, final demo URL and a software license decision. None has been invented. The package does not publish, push, submit, change account access, or select a license on your behalf.
