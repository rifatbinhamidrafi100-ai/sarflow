# Public access and account removal

The user explicitly requested: keep SARFlow live for everyone and remove login features.

## Hosting

The project's Vercel Authentication setting was `ssoProtection.deploymentType: all`, producing HTTP 302 redirects to `vercel.com/sso-api` on both public aliases. After user authorization it was changed through the authenticated Vercel CLI to `prod_deployment_urls_and_all_previews`. Both production aliases then returned HTTP 200 anonymously; a generated preview deployment still returned HTTP 302 to Vercel SSO. Preview protection remains active. No password, token, cookie or secret value was read, copied or exported. The previous protection-only setting is preserved in ignored task artifacts for rollback.

C: was full (`ENOSPC`), preventing package/CLI startup. This task used npm cache and temporary files under `D:/SARFlow-tool-cache`, scoped to the tool processes. No user files were deleted and no global Windows setting was changed.

## Application

- Removed header login entry, account UI, profile/session contracts, Google auth router and the unused `@auth/core` dependency.
- Old `/login`, `/account` and `/signup` links redirect to the public homepage. Authentication API endpoints return the existing unknown-route HTTP 404 response.
- Retired the removed feature's tests and added public-access regression tests for route compatibility, guest exploration and retired endpoints; no tests were skipped or quality gates disabled.
- Android preview 0.3 replaces Account with Evidence and explicitly states that no account is needed. Same package and signing identity, versionCode 3; Android 8+; INTERNET permission only. Native physical-device testing remains pending.
- APK SHA-256: `0accad05d8e57b8aa9615cf336f1d12c6c62b8a0782c57368e3fa1eb6b2fa391`.

Historical login/setup documents describe a retired feature; they must not be followed as current setup instructions. Git history and task backups preserve the removed implementation. Account-free access does not change scientific methods, measurement validation or experimental water-processing availability.

Verification: 148 application tests passed after retiring the removed auth feature and adding API-retirement coverage. Seven local browser checks passed for public routes, learning links, mobile install and downloaded APK bytes. Lint, formatting and TypeScript/production build passed. APK v2/v3 signatures and all 18 URL-policy tests passed. Production dependency audit reported zero vulnerabilities; the full dependency audit still reports 11 moderate development-tool advisories, which were not force-upgraded in this change.
