# Login interface — 13 November 2026

Existing account/session/OAuth processing is preserved. The header now provides a visible Log in link to `/login`. The account page provides Log in and Create account views, Google continuation when the backend is configured, guest exploration, and connection-retry feedback. Profile editing remains available after a verified Google session. No password form, account database, email delivery or cloud saving was added.

Modified: `src/App.tsx`, `src/pages/Account.tsx`, `src/pages/account.css`, `tests/e2e/account.spec.ts`, and the canonical production URL/status notes in `docs/GOOGLE_SIGN_IN_SETUP.md`.

Executed checks: lint, formatting, TypeScript/production build; three account browser tests covering view switching, guest navigation, missing configuration, profile editing, read-only verified email, 320/390/801/1440px layouts and light/dark accessibility; four auth unit tests. Profile/session browser tests use clearly synthetic identities, not a real Google login.

Public `/api/auth/status` reported `enabled: false` during inspection. The UI keeps Google continuation disabled and explains the unavailable configuration. Actual Google sign-in requires manual setup of the OAuth client, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` and canonical `AUTH_URL` in Vercel. No credentials were requested, read or stored. Setup instructions use the current original production address, `https://sarflow-one.vercel.app`.
