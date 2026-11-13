# Android preview 0.2

Existing Java/Android SDK wrapper, with a native launch screen and navigation. No new runtime framework or permissions. Native home content is bundled; scientific tools remain on the published website and require internet. No native scientific processing is added.

## Build and test

Use JDK 17 and Android SDK platform 35 / build-tools 35.0.0:

```powershell
./android-preview/build.ps1
javac -d artifacts/android-link-tests android-preview/src/org/sarflow/preview/AppLinks.java android-preview/tests/AppLinksTest.java
java -cp artifacts/android-link-tests org.sarflow.preview.AppLinksTest
```

The build uses a fresh staging directory each run, so removed classes cannot remain in the package. Output: `artifacts/android-build-v02/aligned.apk` (unsigned). Sign locally using your own protected signing configuration and verify with `apksigner verify --verbose --print-certs`. Signing keys are not part of this repository. Preserve package ID and signing identity for an in-place update; never uninstall a user's previous app to work around a signing mismatch.

## Boundaries

- Only exact SARFlow HTTPS hosts render inside the app. Other HTTPS source links need a user gesture and open in the browser. File, script, intent, credential-bearing and nonstandard-port URLs are rejected.
- Account sign-in, APK downloads and evidence-file exports use the external browser. Browser and WebView sessions are separate. No Google OAuth configuration is created by this package.
- SSL failures cancel the load. There is no JavaScript-to-native bridge, filesystem access or mixed-content allowance.
- Loading, timeout, main-frame failure and renderer-crash recovery preserve a route for retry. Navigation within the hosted React app updates the browser/export destination.
- The hosted header/bottom navigation is hidden inside the WebView to avoid duplicate phone controls. Map credits and scientific content remain.
- Home hero: existing `public/images/nisar-seattle.jpg`, NASA/JPL-Caltech, credited as a radar visualization. No new scientific results are claimed.

## Verification status

See `docs/ANDROID_PREVIEW_02.md` for this increment's executed checks and the outstanding device-testing boundary. This remains development-signed preview software.
