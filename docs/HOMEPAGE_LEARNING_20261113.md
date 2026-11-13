# Homepage learning entry points — 13 November 2026

Beginner Guide and NISAR Learning Resources now appear side by side at the previous place-gallery position. The existing four place cards follow below. Both links open the existing full pages; resources are not duplicated or presented as new scientific analyses. On small screens the learning cards stack. Existing theme tokens, keyboard focus and touch targets are retained.

Changed UI: `src/pages/RealHome.tsx`, `src/pages/real-home.css`. Regression coverage: `tests/e2e/home-learning.spec.ts`. The same GitHub increment includes the Android preview described in `ANDROID_PREVIEW_02.md`.

Executed verification:

- Lint, TypeScript and production build passed.
- All 151 Vitest tests passed in 37 files.
- All 79 Python tests passed. Rasterio/Affine deprecation warnings and a fixture georeferencing warning remain.
- Nine browser tests passed across homepage learning, beginner guide/video, learning-resource filters and APK installation/download pages. Checked 320/390/801/1440px, light/dark learning-card accessibility, actual link navigation, gallery preservation/order and matching downloaded APK bytes.
- Initial new homepage test failed against the previous build because the two guide links did not exist; it passed against the updated production build.
- `npm run format:check` initially failed on Windows CRLF checkouts. Running the existing formatter restored LF; Git's canonical source content did not change. `.gitattributes` now keeps text checkouts at LF and explicitly preserves binary assets. The formatting gate remains enabled and passes.
- Production dependency audit reported zero known production vulnerabilities at check time. Existing map-bundle and third-party comment build warnings remain.

Native Android runtime/physical-phone testing is still pending due to the documented emulator/tool failures. Website changes do not establish scientific validation or worker availability. GitHub push and public deployment are separate release facts; verify the remote commit and hosting response before reporting either complete.

Publication verified: GitHub main received the tested source snapshot via the connected GitHub app (terminal credentials were unavailable). The uploaded Git tree exactly matched the local tested tree. Vercel deployed automatically. Both homepage-learning browser tests passed against `https://sarflow-one.vercel.app/`, including actual guide/resources navigation and responsive light/dark layouts. The backup `sarflow-earth-rbhr.vercel.app` still served an older deployment, so the APK launch URL now uses the original production address. Physical-device testing remains pending.

The unversioned APK URL temporarily returned cached bytes after deployment. The versioned request `https://sarflow-one.vercel.app/downloads/sarflow-preview.apk?v=0.2-6965e2be` returned the final package with the documented SHA-256; the install-page download now uses this identifier to avoid an older cached APK.
