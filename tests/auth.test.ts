import { expect, it } from 'vitest';
import express from 'express';
import { randomBytes } from 'node:crypto';
import { encode } from '@auth/core/jwt';
import {
  authRouter,
  authSettings,
  verifiedGoogleProfile,
  updateSessionProfile,
} from '../server/auth';
it('disables authentication when configuration is missing or public HTTP is used', () => {
  expect(authSettings({})).toBeNull();
  expect(
    authSettings({
      AUTH_URL: 'http://example.com',
      AUTH_GOOGLE_ID: 'fixture',
      AUTH_GOOGLE_SECRET: 'fixture',
      AUTH_SECRET: randomBytes(32).toString('hex'),
    }),
  ).toBeNull();
});
it('verifies encrypted sessions, protects updates with origin and CSRF, and never exposes provider tokens', async () => {
  const secret = randomBytes(32).toString('hex');
  const env = {
    AUTH_URL: 'https://sarflow.example',
    AUTH_SECRET: secret,
    AUTH_GOOGLE_ID: 'software-fixture',
    AUTH_GOOGLE_SECRET: 'software-fixture',
  };
  const server = express().use('/api/auth', authRouter({ env })).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth`;
  try {
    const sessionCookie = await encode({
      secret,
      salt: '__Secure-authjs.session-token',
      maxAge: 60,
      token: {
        sub: 'fixture-user',
        name: 'Original',
        email: 'student@example.test',
        username: 'fixture_user',
      },
    });
    const cookie = `__Secure-authjs.session-token=${sessionCookie}`;
    const session = await fetch(base + '/session', { headers: { cookie } });
    const body = await session.json();
    expect(body.user.email).toBe('student@example.test');
    expect(Object.keys(body.user).sort()).toEqual(['email', 'id', 'name', 'username']);
    expect(session.headers.get('cache-control')).toContain('no-store');
    expect(session.headers.getSetCookie().length).toBeGreaterThan(0);
    expect(
      session.headers
        .getSetCookie()
        .every(
          (value) =>
            value.includes('HttpOnly') &&
            value.includes('Secure') &&
            value.includes('SameSite=Lax'),
        ),
    ).toBe(true);
    const csrf = await fetch(base + '/csrf');
    const { csrfToken } = await csrf.json();
    const cookies =
      cookie +
      '; ' +
      csrf.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ');
    const update = { username: 'safe_name', displayName: 'Updated' };
    expect(
      (
        await fetch(base + '/session', {
          method: 'POST',
          headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
          body: JSON.stringify({ data: update, csrfToken }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(base + '/session', {
          method: 'POST',
          headers: { origin: env.AUTH_URL, cookie: cookies, 'content-type': 'application/json' },
          body: JSON.stringify({ csrfToken, data: { ...update, email: 'forged@example.test' } }),
        })
      ).status,
    ).toBe(400);
    const valid = await fetch(base + '/session', {
      method: 'POST',
      headers: { origin: env.AUTH_URL, cookie: cookies, 'content-type': 'application/json' },
      body: JSON.stringify({ csrfToken, data: update }),
    });
    expect(valid.status).toBe(200);
    expect((await valid.json()).user).toMatchObject({
      id: 'fixture-user',
      email: 'student@example.test',
      name: 'Updated',
      username: 'safe_name',
    });
    const missingCsrf = await fetch(base + '/session', {
      method: 'POST',
      redirect: 'manual',
      headers: { origin: env.AUTH_URL, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ data: update }),
    });
    expect(missingCsrf.status).not.toBe(200);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
it('accepts only verified Google identity and ignores forged email/profile identity updates', () => {
  expect(verifiedGoogleProfile({ email: 'student@example.test', email_verified: false })).toBe(
    false,
  );
  expect(
    verifiedGoogleProfile({
      email: 'student@example.test',
      email_verified: true,
      sub: 'fixture-user',
    }),
  ).toBe(true);
  const token = { sub: 'fixture-user', email: 'student@example.test', name: 'Original' };
  expect(
    updateSessionProfile(token, {
      username: 'valid_user',
      displayName: 'New name',
      email: 'forged@example.test',
    }),
  ).toEqual(token);
  expect(
    updateSessionProfile(token, { username: 'valid_user', displayName: 'New name' }),
  ).toMatchObject({ email: 'student@example.test', name: 'New name', username: 'valid_user' });
  expect(updateSessionProfile(token, { username: '<script>', displayName: 'Name' })).toEqual(token);
});
it('reports disabled status without disclosing secrets or creating a pretend session', async () => {
  const server = express()
    .use('/api/auth', authRouter({ env: {} }))
    .listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth`;
  try {
    const config = await fetch(base + '/status');
    expect(config.headers.get('cache-control')).toContain('no-store');
    expect(await config.json()).toMatchObject({ enabled: false });
    expect(await (await fetch(base + '/session')).json()).toBeNull();
    expect((await fetch(base + '/signin/google', { method: 'POST' })).status).toBe(503);
    const malformed = await fetch(base + '/session', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{invalid',
    });
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: 'Invalid account request.' });
    const oversized = await fetch(base + '/session', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payload: 'x'.repeat(10000) }),
    });
    expect(oversized.status).toBe(413);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
