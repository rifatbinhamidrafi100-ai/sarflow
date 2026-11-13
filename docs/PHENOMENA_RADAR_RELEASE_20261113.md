# Phenomena and radar interpretation release — 13 November 2026

Implemented in the existing React/Express application:
- Four core topic entries on the homepage and `/topics` with clear availability labels.
- Six-category `/phenomena` directory, keyword search, empty-state recovery and dedicated educational/application guides. Urban and geological guides link to supported existing tools and mark unimplemented motion/classification methods honestly.
- Contextual Understand this image modal in the real observation workspace, geographic learning map, before/after lab and numerical analysis. It uses supplied metadata only. Missing polarization is explicit; no channels are inferred from RGB pixels or product filenames.
- Interactive synthetic dark/medium/bright strip and two conceptual frames, separate from the actual image. No RGB pixel classification or generated environmental findings.
- Source links to NASA radar explanations and ASF's GCOV visualization documentation.
- Header navigation fixes for tablet and narrow phone widths; native dialog focus handling and reduced-motion-compatible presentation.
- Optional account/sign-in interface and the prior Auth.js Core integration included with an explicit disabled setup state. Vercel has no Google OAuth variables; actual Google login remains unverified and inactive. Usernames are session display handles, not globally reserved login identities. No database or cloud investigation synchronization was added.

Verification executed:
- 151 unit tests passed, 37 files.
- 24 browser regression tests passed: account, layouts at 1440/900/801/390/320 pixels, observatory, phenomena, topics, water and numerical/evidence workflows.
- Lint, formatting, TypeScript and production build passed.
- Initial browser tests failed with connection refused because the local server stopped across a turn interruption. Restarted the existing production build at 127.0.0.1:5186, then reran all 24 successfully.
- Layout tests found header overflow at 801 and 320 pixels. Corrected menu breakpoint/account label and reran successfully.
- Known third-party Zod annotation and large map-bundle warnings remain.

The deployment is being verified separately; a Vercel build URL is not proof of a working public release. GitHub connector currently rejects writes with 403 Resource not accessible by integration; terminal Git lacks authenticated credentials. Existing Chrome login is a separate session and must be verified before any browser source upload.

No claims of operational flood detection, GUNW displacement, glacier velocity, crop yield, forest-loss classification, native Android scientific processing or public persistent Python execution were introduced.

## Public deployment verification

Production deployment dpl_5X8nHwpV9xtNmUhPuCsQidM6MpqS reached READY and is assigned to the existing public aliases. Verified at https://sarflow-earth-rbhr.vercel.app/ .

Six production browser tests passed, covering phenomena search/guides, the radar interpretation panel, the four-topic homepage, tool navigation, the actual account setup state, and real NASA reference discovery with receipt download. Production /api/health returned 200. /api/auth/status returned 200 with enabled=false and origin=null. No Google OAuth login was attempted or claimed.

Vercel error-log query for this deployment over the checked 20-minute window returned zero error records and zero excluded intervals. This is a limited verification window, not an uptime guarantee.

Google sign-in still requires manual OAuth client configuration and server-only AUTH_URL, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET and AUTH_SECRET variables. See GOOGLE_SIGN_IN_SETUP.md. The account UI is published with an honest disabled state.
