import type { Request, RequestHandler } from 'express';

/** Uses Express's socket address by default. Never trust arbitrary forwarded headers. */
export function clientCooldown(milliseconds: number) {
  const clients = new Map<string, number>();
  return (req: Request): boolean => {
    const now = Date.now();
    for (const [key, until] of clients) if (until <= now) clients.delete(key);
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    if (clients.has(key) || clients.size >= 10000) return false;
    clients.set(key, now + milliseconds);
    return true;
  };
}

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
};

/** Only public discovery JSON is shared; errors and processing results are never cached. */
export const discoveryCache: RequestHandler = (req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (req.method === 'GET' && res.statusCode === 200) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    return sendJson(body);
  };
  next();
};
