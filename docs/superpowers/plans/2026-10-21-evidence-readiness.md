# Evidence Readiness Implementation Plan

> Execute task-by-task in this session; preserve the existing uncommitted work. The user approved fixing the specific preceding assessment's weaknesses.

**Goal:** Make one NISAR investigation reviewable and reproducible, with readiness derived from supplied evidence rather than claims.

**Architecture:** A shared pure assessment evaluates registered datasets for the selected study; source discovery and calibrated numerical inputs remain separate. A focused React page consumes the existing dataset/archive APIs and exports its evidence gaps. Scientific evaluation remains the existing offline Python workflow.

**Tech stack:** Existing React, TypeScript, Zod, Vitest and Python; no new dependencies.

## Constraints

- No fake numerical results, confidence or users. No claim that software tests validate a real event.
- No credentials stored or inspected. No full products on the nearly full C: drive.
- Keep globe, comparisons and teaching tools working. Keep existing deployment unchanged until a reviewed release is authorized.

## Task 1 — Actual-data access

- [ ] Inspect current public CMR record and approved bounded download behavior.
- [ ] Record whether manual authentication and alternate storage are necessary.
- [ ] If blocked, provide concrete next steps while completing independent app improvements.

## Task 2 — Evidence assessment

- [ ] Create `shared/study-readiness.ts` using the existing dataset schema; verify source records, hashes, valid paired support, compatible geometry and explicit interpretation/evaluation status.
- [ ] Add `tests/study-readiness.test.ts` covering synthetic rejection, missing provenance, invalid/all-missing support, mismatched sources and truthful real-measurement status.
- [ ] Expose measured change separately from event attribution and independent validation. Preserve unavailable values as null.

## Task 3 — Focused investigation

- [ ] Create `src/pages/Study.tsx` and a route, with one clear investigation question, dated browse evidence, assessment and export.
- [ ] Link the homepage to this investigation without deleting other features.
- [ ] Add responsive page layout using established styles and accessible controls.
- [ ] Add focused browser checks for explicit gaps, working source/export paths and mobile geometry.

## Task 4 — Submission evidence

- [ ] Prepare an unfilled usability protocol and contribution/organizer clarification record.
- [ ] State the distinct contribution, full reproduction steps and exact remaining scientific work.

## Task 5 — Verification

- [ ] Run targeted tests first, then full lint, format check, test/build and relevant browser checks.
- [ ] Inspect the diff and document changed files, commands, failures and external blockers.
