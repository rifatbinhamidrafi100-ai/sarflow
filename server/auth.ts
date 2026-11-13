import { Router, json, urlencoded, type ErrorRequestHandler } from 'express';
import { Auth, type AuthConfig } from '@auth/core';
import Google from '@auth/core/providers/google';
import type { JWT } from '@auth/core/jwt';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { profileEditSchema } from '../shared/account.js';

type Env = Record<string, string | undefined>;
export function authSettings(env: Env) {
  const {
    AUTH_URL: origin,
    AUTH_SECRET: secret,
    AUTH_GOOGLE_ID: clientId,
    AUTH_GOOGLE_SECRET: clientSecret,
  } = env;
  if (!origin || !secret || secret.length < 32 || !clientId || !clientSecret) return null;
  try {
    const url = new URL(origin);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
    )
      return null;
    return {
      origin: url.origin,
      secret,
      clientId,
      clientSecret,
      secure: url.protocol === 'https:',
    };
  } catch {
    return null;
  }
}
export function verifiedGoogleProfile(profile: unknown) {
  return z
    .object({ sub: z.string().min(1), email: z.email(), email_verified: z.literal(true) })
    .safeParse(profile).success;
}
export function updateSessionProfile(token: JWT, input: unknown): JWT {
  const edit = profileEditSchema.safeParse(input);
  return edit.success
    ? { ...token, username: edit.data.username, name: edit.data.displayName }
    : token;
}
export function googleAuthConfig(
  settings: NonNullable<ReturnType<typeof authSettings>>,
): AuthConfig {
  return {
    basePath: '/api/auth',
    secret: settings.secret,
    trustHost: true,
    useSecureCookies: settings.secure,
    session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
    providers: [
      Google({
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        authorization: { params: { scope: 'openid email profile' } },
        checks: ['pkce', 'state', 'nonce'],
      }),
    ],
    pages: { signIn: '/account', error: '/account' },
    logger: {
      error: () =>
        console.error('SARFlow authentication request failed. Check the OAuth configuration.'),
      warn: () => {},
      debug: () => {},
    },
    callbacks: {
      signIn: ({ account, profile }) =>
        account?.provider === 'google' && verifiedGoogleProfile(profile),
      redirect: () => `${settings.origin}/account`,
      jwt: ({ token, trigger, session }) => {
        if (!token.username && token.sub)
          token.username =
            'explorer_' + createHash('sha256').update(token.sub).digest('hex').slice(0, 10);
        return trigger === 'update' ? updateSessionProfile(token, session) : token;
      },
      session: ({ session, token }) => ({
        expires: session.expires,
        user: {
          id: String(token.sub ?? ''),
          username: String(token.username ?? ''),
          name: typeof token.name === 'string' ? token.name : null,
          email: String(token.email ?? ''),
        },
      }),
    },
  };
}

/** Fixed canonical origin, library-owned OAuth/CSRF/encrypted session cookies; no token logging. */
export function authRouter(options: { env?: Env } = {}) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  });
  router.get('/status', (_req, res) => {
    const settings = authSettings(options.env ?? process.env);
    res.json({
      enabled: !!settings,
      origin: settings?.origin ?? null,
      provider: 'google',
      profileStorage: 'encrypted-session',
      cloudInvestigations: false,
    });
  });
  router.use(json({ limit: '8kb' }), urlencoded({ extended: false, limit: '8kb' }));
  router.use(async (req, res) => {
    const settings = authSettings(options.env ?? process.env);
    if (!settings) {
      if (req.method === 'GET' && req.path === '/session') {
        res.json(null);
        return;
      }
      res.status(503).json({ error: 'Google sign-in is not configured yet.' });
      return;
    }
    if (
      !['GET', 'POST'].includes(req.method) ||
      !/^\/(session|csrf|providers|signout|error|signin\/google|callback\/google)$/.test(req.path)
    ) {
      res.status(404).json({ error: 'Authentication route not found.' });
      return;
    }
    if (req.method === 'POST' && req.get('origin') !== settings.origin) {
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    }
    if (
      req.method === 'POST' &&
      req.path === '/session' &&
      !profileEditSchema.safeParse(req.body?.data).success
    ) {
      res.status(400).json({
        error:
          'Use a 3–30 character username containing letters, numbers or underscores, and a display name of 1–80 characters.',
      });
      return;
    }
    try {
      const headers = new Headers();
      for (const name of ['cookie', 'content-type']) {
        const value = req.get(name);
        if (value) headers.set(name, value);
      }
      const url = new URL('/api/auth' + req.url, settings.origin);
      const response = await Auth(
        new Request(url, {
          method: req.method,
          headers,
          body:
            req.method === 'POST'
              ? req.is('application/json')
                ? JSON.stringify(req.body)
                : new URLSearchParams(req.body).toString()
              : undefined,
        }),
        googleAuthConfig(settings),
      );
      for (const [name, value] of response.headers)
        if (name !== 'set-cookie') res.setHeader(name, value);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('Set-Cookie', cookies);
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(response.status).send(await response.text());
    } catch {
      res.status(503).json({
        error: 'Sign-in is temporarily unavailable. Your public workspace remains accessible.',
      });
    }
  });
  const invalidBody: ErrorRequestHandler = (error, _req, res, _next) => {
    res.status(error?.status === 413 ? 413 : 400).json({ error: 'Invalid account request.' });
  };
  router.use(invalidBody);
  return router;
}
