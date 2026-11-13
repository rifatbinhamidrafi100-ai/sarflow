# SARFlow Android preview 0.2 — 13 November 2026

Status: built, signed and locally downloadable. Native on-device acceptance testing remains pending. See `HOMEPAGE_LEARNING_20261113.md` for the subsequent GitHub upload increment; no manual Vercel deployment was performed here.

## Changes

The former WebView-only launch has a native phone home: a credited Seattle radar visual, a prominent place-search action, NISAR Explorer and evidence shortcuts, four topic cards with honest capability labels, and a beginner guide. Home, Explore, Learn and browser-based Account actions sit in one bottom navigation surface. Hosted navigation is hidden only inside the native wrapper to avoid duplicate controls.

The native shell now has loading/progress, a 20-second timeout, current-route retry, browser fallback, back/history handling and renderer-crash recovery. React route changes update the URL used by browser/export actions. Account access and downloads use the browser; no OAuth configuration or native scientific processor is added. System insets and wrapping content accommodate phone screens; native visual/accessibility behavior still needs device verification.

Only HTTPS, exact trusted SARFlow hosts load internally. SSL failures cancel, file/content access and mixed content are disabled, external main-frame navigation needs a gesture, and there is no JavaScript-to-native bridge. The sole requested permission remains INTERNET.

## Files

- `android-preview/src/org/sarflow/preview/MainActivity.java`: native navigation, WebView lifecycle, URL/history handling and recovery.
- `android-preview/src/org/sarflow/preview/PhoneHome.java`: native launch screen, topic cards and source credit.
- `android-preview/src/org/sarflow/preview/AppLinks.java`: independently testable HTTPS/host/routing policy.
- `android-preview/tests/AppLinksTest.java`: 18 routing and hostile-URL checks.
- `android-preview/res/drawable-nodpi/home_radar.jpg`: existing NASA/JPL-Caltech Seattle visualization reused from the website.
- `android-preview/res/values/styles.xml`: native theme.
- `android-preview/AndroidManifest.xml`: version 2 / 0.2-preview and theme; unchanged package and permissions.
- `android-preview/build.ps1`: UTF-8/all-source compilation, generated resources and isolated per-build staging.
- `android-preview/README.md`: build and security boundaries.
- `public/downloads/sarflow-preview.apk`: signed 598,572-byte preview.
- `src/pages/Install.tsx`: actual version, update instructions and limitations.
- `tests/e2e/mobile-app.spec.ts`: new-version text, real downloaded-byte checksum and phone/tablet bounds.
- `docs/MOBILE_PUBLIC_RELEASE.md`: preserves previous public verification and links this local increment.

## Package verification

- Package: `org.sarflow.preview`, versionCode 2, versionName `0.2-preview`.
- Android 8+ (API 26), target API 35.
- Development signing; v2/v3 signatures verified; zip alignment verified.
- Signing certificate matches the previously distributed 0.1 preview. This establishes package-level update compatibility; successful in-place installation has not been established on a phone.
- APK SHA-256: `6965e2be5c095855865426d717f5990d7adeec11e51ef0c2d418dd6ec4930b67`.
- Home address: `https://sarflow-one.vercel.app/`, the original production address. The older backup alias was still serving a previous deployment during public checks; it is accepted as an internal link but is no longer the launch address.
- Old source and APK preserved under ignored task artifacts before replacement.

## Executed checks

- `./android-preview/build.ps1` — passed. Existing Java source-8 bootstrap and deprecated Android API warnings remain.
- `javac` + `java org.sarflow.preview.AppLinksTest` — 18 passed.
- `npm run lint` — passed.
- `npm run build` — TypeScript and Vite passed. Existing large-map-chunk and third-party Zod comment warnings remain.
- `npm test` — 151 passed in 37 files after connecting the existing local Python environment. First attempt had 3 ENOENT failures because this checkout had no `.venv-water`; no tests were skipped or weakened.
- Playwright `mobile-app.spec.ts` — 3 passed against production output on port 5188. Tests cover navigation, install accessibility, browser fallback instructions, APK checksum, icons and 320/390/801px layouts (desktop navigation visibility also checked).
- `npm audit --omit=dev` — zero reported production dependency vulnerabilities at the time of this check.
- `apksigner verify`, `zipalign -c 4`, `aapt dump badging`, signing-certificate comparison — passed.
- HTTP 200 APK download and SHA-256 equality with the source artifact — passed. Browser-download equality passed again after the final rebuild.
- `git diff --check` — passed (Git reports normal LF/CRLF conversion notices).

## Unfinished verification

ADB reported a connected emulator intermittently, but installation/file transfer failed with `connect error for write: closed`, `protocol fault: failed to read stat response: No error` and `error: closed`. The installed package remained version 0.1. Windows Computer Use could not initialize: `failed to write kernel assets: The system cannot find the path specified. (os error 3)`.

No emulator/native screenshot, physical-phone test, map touch test, screen-reader pass, live Google login, or evidence export on a phone is claimed. No security setting was changed and the old emulator app was not uninstalled. Device acceptance and then an explicitly authorized public release are the next steps. Website/scientific worker availability is independent of this APK package.
