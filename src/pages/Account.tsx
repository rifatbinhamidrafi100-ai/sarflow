import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  accountSessionSchema,
  accountStatusSchema,
  type AccountSession,
} from '../../shared/account';
import './account.css';

type Status = { enabled: boolean; origin: string | null };
async function authRequest(path: string, options: RequestInit = {}) {
  const response = await fetch('/api/auth/' + path, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error ?? 'Account service unavailable. Please try again.');
  return data;
}
export default function Account() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null),
    [session, setSession] = useState<AccountSession | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [username, setUsername] = useState(''),
    [displayName, setDisplayName] = useState('');
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    Promise.all([
      authRequest('status', { signal: controller.signal }),
      authRequest('session', { signal: controller.signal }),
    ])
      .then(([settings, raw]) => {
        if (controller.signal.aborted) return;
        setStatus(accountStatusSchema.parse(settings));
        const current = raw?.user ? accountSessionSchema.parse(raw) : null;
        setSession(current);
        setUsername(current?.user.username ?? '');
        setDisplayName(current?.user.name ?? '');
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Your account could not load. Reload this page to retry.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function submit(action: 'signin/google' | 'signout') {
    if (!status?.enabled) return;
    if (status.origin !== window.location.origin) {
      window.location.assign(status.origin + '/account');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const csrf = await authRequest('csrf');
      if (lifetime.current?.signal.aborted) return;
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/auth/' + action;
      for (const [name, value] of Object.entries({
        csrfToken: csrf.csrfToken,
        callbackUrl: status.origin + '/account',
      })) {
        const field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        field.value = String(value);
        form.append(field);
      }
      document.body.append(form);
      form.submit();
    } catch {
      setError('Sign-in could not start. Please retry.');
      setBusy(false);
    }
  }
  return (
    <div className="page account-page">
      <header className="account-heading">
        <span className="tiny">Your SARFlow workspace</span>
        <h1>{session ? 'Your account' : 'Explore freely. Sign in when you need to.'}</h1>
        <p>Explore Earth, understand radar, and keep the evidence in view.</p>
      </header>
      <div className="account-layout">
        <section className="panel account-card" aria-label="SARFlow account">
          {loading ? (
            <p role="status">Checking your secure session…</p>
          ) : session ? (
            <>
              <span className="account-avatar" aria-hidden="true">
                {(session.user.name ?? session.user.username).slice(0, 1).toUpperCase()}
              </span>
              <h2>{session.user.name ?? session.user.username}</h2>
              <p>Signed in with Google</p>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setError('');
                  setMessage('');
                  try {
                    const csrf = await authRequest('csrf');
                    const raw = await authRequest('session', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        csrfToken: csrf.csrfToken,
                        data: { username, displayName },
                      }),
                    });
                    const current = accountSessionSchema.parse(raw);
                    if (lifetime.current?.signal.aborted) return;
                    setSession(current);
                    setUsername(current.user.username);
                    setDisplayName(current.user.name ?? '');
                    setMessage('Profile updated for this browser session.');
                  } catch (cause) {
                    if (!lifetime.current?.signal.aborted)
                      setError(cause instanceof Error ? cause.message : 'Profile update failed.');
                  } finally {
                    if (!lifetime.current?.signal.aborted) setBusy(false);
                  }
                }}
              >
                <label>
                  Username
                  <input
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_]+"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="nickname"
                  />
                </label>
                <label>
                  Display name
                  <input
                    required
                    maxLength={80}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Verified Google email
                  <input value={session.user.email} readOnly type="email" />
                </label>
                <p className="tiny">
                  Email is verified by Google and cannot be changed here. This username is a display
                  handle, not a reserved login name. Profile edits last for this browser session and
                  may reset when you sign in again.
                </p>
                <button className="primary" disabled={busy}>
                  {busy ? 'Saving…' : 'Save profile'}
                </button>
              </form>
              <button disabled={busy} onClick={() => void submit('signout')}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <h2>Welcome to SARFlow</h2>
              <p>Use your Google account. SARFlow never asks for your Google password.</p>
              <button
                className="google-signin"
                disabled={!status?.enabled || busy}
                onClick={() => void submit('signin/google')}
              >
                Continue with Google
              </button>
              {status && !status.enabled && (
                <p className="notice" role="status">
                  Google sign-in is being configured. You can continue exploring without an account.
                </p>
              )}
              <p className="tiny">
                Signing in shares your Google account identifier, verified email and basic profile
                with SARFlow. No Gmail, Drive or contacts access is requested. The session uses a
                secure, HTTP-only cookie and expires after seven days.
              </p>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          {params.has('error') && (
            <p role="alert">
              Google sign-in was cancelled or could not be completed. Please retry; your public
              workspace is still available.
            </p>
          )}
          {message && <p role="status">{message}</p>}
        </section>
        <aside className="account-info">
          <h2>Keep exploring</h2>
          <p>
            An account is optional. Maps, observation discovery, the learning tools and public
            evidence remain open.
          </p>
          <Link className="button" to="/world">
            Explore Earth
          </Link>
          <Link className="button" to="/investigations">
            Open local investigations
          </Link>
          <h3>Your data stays clear</h3>
          <p>
            Existing investigations stay in this browser. Signing in does not upload or synchronize
            them. Cloud saving is not connected yet.
          </p>
          <p className="tiny">
            SARFlow sign-in is separate from NASA Earthdata access. It does not grant access to
            protected satellite downloads or verify scientific findings.
          </p>
        </aside>
      </div>
    </div>
  );
}
