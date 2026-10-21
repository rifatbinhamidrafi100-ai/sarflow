# Source readability and deployment preparation

Applied consistent formatting across application TypeScript, TSX, CSS, shared contracts and API handlers. Previously compressed JSX and middleware now use readable line breaks and indentation. The comparison code uses `beforePower`, `afterPower`, `commonBefore` and `commonAfter` for its paired arrays; Express options have a named `AppOptions` interface.

Added `.prettierrc.json`, `npm run format`, `npm run format:check`, a locked Prettier development dependency and a CI formatting check. These changes improve maintainability; they make no claim about authorship or AI-detection outcomes. Existing scientific caveats, source credits and behavior are retained.

Fresh checks: formatting and lint passed; 91 JavaScript tests passed; TypeScript and production build passed. Existing MapLibre chunk-size and Zod annotation warnings remain. The first browser check attempt failed with `net::ERR_CONNECTION_REFUSED` because the dev server was stopped; after restarting it, all seven selected browser checks passed, including archive fallback, responsive panels, place evidence and request throttling while typing.

Prepared a separate Vercel upload stage containing only `src`, `server`, `shared`, `api`, public assets, dependency manifests and build configuration. Credentials, local measurements, Python environments, reports, logs, Git history and video outputs are excluded. The staging summary is in ignored `artifacts/vercel-staging-summary.json`.

Vercel CLI was not initially installed/authenticated. `npx vercel whoami` reported logged out. After the user completed manual Chrome authentication, the tested application was deployed to the existing project's preview environment and Vercel reported Ready. See `2026-10-20-vercel-preview.md` for the URL and verification boundary. No production promotion was performed.

Changed files: formatted source under `src/`, `server/`, `shared/`, `api/`; `package.json`, `package-lock.json`, `.prettierrc.json`, `.github/workflows/ci.yml`, README and this report. Other existing uncommitted work is retained.
