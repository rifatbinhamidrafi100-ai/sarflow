# Mobile public release

Local update prepared 13 November 2026: [Android preview 0.2](ANDROID_PREVIEW_02.md). It has not replaced the public download in this increment. The verification below describes the earlier public release.

Verified 8 November 2026 (Asia/Dhaka).

- Website: https://sarflow-one.vercel.app/
- Install page: https://sarflow-one.vercel.app/install
- APK: https://sarflow-one.vercel.app/downloads/sarflow-preview.apk
- Deployment: sarflow-3fggf8324-rbhr1.vercel.app; Vercel production Ready.

Public Chrome verification without account authentication: homepage HTTP 200, Download mobile app button navigated to /install, unwanted radar-story section and its shortcut absent, APK HTTP 200. Downloaded 16,858-byte artifact matched the locally verified APK SHA-256: 858ce995c37382fbf140a4bae2143f83375ed5c96d56409945264404497ed7dc.

This is a development-signed Android 8+ online preview, not a Play Store or physical-device-tested release. It opens the hosted website; internet is required. Evidence-file exports should use the browser. No calibrated flood validation or emergency warning capability is established by this release.

Before upload: TypeScript/lint/build passed; mobile install browser tests passed. Existing build size warnings remain. No production signing keys, credentials, local scientific inputs or outputs were uploaded.
