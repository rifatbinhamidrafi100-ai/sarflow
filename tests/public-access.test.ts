import { expect, it } from 'vitest';
import { createApp } from '../server/app';

it('retires authentication endpoints while preserving the public API', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    expect((await fetch(base + '/api/health')).status).toBe(200);
    expect((await fetch(base + '/api/datasets')).status).toBe(200);
    for (const path of ['/status', '/session', '/csrf', '/signin/google']) {
      const response = await fetch(base + '/api/auth' + path);
      expect(response.status).toBe(404);
      expect(response.headers.get('set-cookie')).toBeNull();
    }
    expect((await fetch(base + '/api/auth/signin/google', { method: 'POST' })).status).toBe(404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
