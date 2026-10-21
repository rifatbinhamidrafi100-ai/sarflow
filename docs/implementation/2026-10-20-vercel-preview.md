# Vercel preview deployment — October 20, 2026

Deployed the prepared SARFlow application to its existing Vercel project after the user completed manual Chrome authentication.

- Project: `sarflow`
- Team: `rbhr1` (Hobby plan)
- Target: preview
- Preview: https://sarflow-b13odmgov-rbhr1.vercel.app
- Place Observatory: https://sarflow-b13odmgov-rbhr1.vercel.app/global-radar?lat=25.15&lon=89.8
- Deployment ID: `dpl_G8M3SUYbSFnobBzX9uL25FUtSe1V`
- Dashboard: https://vercel.com/rbhr1/sarflow/G8M3SUYbSFnobBzX9uL25FUtSe1V
- Vercel status: **Ready**, confirmed with `vercel inspect --wait`
- Vercel build duration: 1 minute 8 seconds
- API build: `api/index`, region `iad1`
- Access: existing Vercel authentication protection remains enabled; open in the user's signed-in Chrome session.

Used a separate whitelisted staging directory with app source, public assets, dependency manifests and build configuration. Credentials, local calibrated measurements, Python environments, reports, logs, Git history and video outputs were excluded. Vercel project metadata is explicitly excluded by `.vercelignore`.

The CLI linked the existing repository/project association without a Git commit or push. This was a preview deployment; no production promotion was performed. The local calibrated-water Python processor is outside the serverless release.

Verification boundary: Vercel's Ready state confirms the platform build/deployment. Live browser rendering and deployed API requests were not exercised in this step. The application passed the local formatting, lint, numerical/API test and production-build checks recorded in the source-readability report; browser regressions passed locally before upload.

Local metadata changed: ignored `.vercel/repo.json` associates the checkout with the existing project, and `.vercelignore` now explicitly excludes `.vercel`. Authentication values were not read, copied or added to application source.
