# Production deployment — October 21, 2026

Published the existing SARFlow project after the user requested "make it live".

- Public production URL: https://sarflow-one.vercel.app
- Direct investigation: https://sarflow-one.vercel.app/global-radar?lat=25.15&lon=89.8
- Additional assigned alias: https://sarflow-rbhr1.vercel.app
- Immutable deployment: https://sarflow-pvsi0b1t3-rbhr1.vercel.app
- Deployment ID: `dpl_BzW5mXnHUYdZRJUHjfNsZJXZv2Ex`
- Dashboard: https://vercel.com/rbhr1/sarflow/BzW5mXnHUYdZRJUHjfNsZJXZv2Ex
- Target: production, existing `rbhr1/sarflow` project, Hobby plan.
- Vercel inspect: Ready; build duration 47 seconds; Express function in iad1.

## Verification

Fresh local checks before upload: 23 JavaScript test files / 91 tests passed; TypeScript and production build passed; ESLint and Prettier checks passed. Existing MapLibre bundle-size and dependency annotation warnings remained nonfatal.

Created a new allowlisted upload stage containing 134 application/configuration/public-asset files, 71,801,918 bytes. Every staged file matched its source SHA-256. Git history, credentials, local measurement data, Python environments, generated reports and output were excluded. Only project/org identifiers were placed in local Vercel linkage metadata, which `.vercelignore` excludes.

Commands used: `npm run check`, `npm run lint`, `npm run format:check`, `vercel deploy artifacts/vercel-production-20261021 --prod --yes --no-wait --scope rbhr1`, and `vercel inspect <deployment-url> --scope rbhr1 --wait --timeout 2m` through the installed npm CLI runtime.

After Ready, reloaded the assigned production alias in the separate in-app browser and opened it in the user's Chrome. The application opened without a Vercel sign-in prompt. The updated page included Saved Investigations, the simplified observation workspace and Place Observatory. At the study coordinates, discovery returned eight observation dates, the interface reported NASA imagery loaded, and loading Place Observatory returned 20 usable source catalogue records. The Chrome production investigation tab was retained for the user.

## Limits and changes

No application source code changed during this release. No Git commit/push, billing, domain configuration or authentication-protection settings were changed. The immutable deployment URL may retain preview-style protection; share the assigned public production alias above.

The separate Python calibrated-data processor is not hosted by this Vercel release. Publication does not establish a validated flood result, calibrated measurement run or continuous background scientific monitoring. Only the described production browser smoke checks were performed; this was not a complete production end-to-end or fresh mobile audit.

This report supersedes the October 20 submission package's deployment/access status only. That package remains a dated, unchanged preparation snapshot.
