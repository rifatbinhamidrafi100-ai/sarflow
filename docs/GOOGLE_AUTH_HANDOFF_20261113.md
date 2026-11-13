# Google-only authentication handoff

User confirmed Google sign-in only, with username/profile editing. Existing Auth.js Google OAuth processing, verified email and encrypted session-based profile remain in place. No password login, account database or new authentication provider was introduced.

Additional reliability changes: shared runtime validation for CSRF responses before sign-in/profile submission; a 12-second account-initialization timeout with visible retry and guest access. These do not activate Google credentials or bypass provider consent.

Verified: six account browser tests (configured OAuth form handoff using software fixtures, malformed CSRF rejection, stalled-request timeout, login/create-account views, unavailable setup, profile editing); four auth unit tests; lint and TypeScript/production build. Fixtures prove application behavior, not successful Google authentication.

External setup remains blocked. Computer Use failed to initialize with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`. The fallback browser connector could not attach to an existing Chrome session. A separate visible setup browser was opened at the official Google Cloud Auth overview; it remains at `accounts.google.com/v3/signin/identifier`. The user must enter authentication credentials manually. No password, cookie, OAuth credential or session was copied or exported. No remote-debugging or hosting-security setting was changed.

After manual Google Cloud sign-in, prepare the existing SARFlow project and web OAuth client using `GOOGLE_SIGN_IN_SETUP.md`. Client secret and session-secret values must be entered directly by the user in Vercel. Do not send credentials through chat. Only then redeploy and perform a real Google sign-in/profile/sign-out test. The separately observed public Vercel SSO restriction also requires resolution before anonymous access can be claimed.
