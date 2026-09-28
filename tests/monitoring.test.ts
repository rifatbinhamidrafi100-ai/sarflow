import { afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import { monitoringRouter } from '../server/monitoring';

afterEach(() => vi.unstubAllEnvs());
async function serve(options: Parameters<typeof monitoringRouter>[0] = {}) {
  const server = express().use('/monitoring', monitoringRouter(options)).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  return { url: `http://127.0.0.1:${(server.address() as { port: number }).port}/monitoring`,
    close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}
const valid = () => ({ configured: true, status: 'ready', checkedAt: '2026-09-28T00:00:00Z', nextCheckAt: null,
  collections: { active: 'NISAR_L2_GCOV_PROVISIONAL_V1', unreviewed: [] },
  locations: [{ id: 'nepal', name: 'Nepal', latestAcquisition: null, lastChecked: null,
    state: 'processed', discovered: 4, downloaded: 4, processed: 1, message: 'Private upstream diagnostics' }],
  publication: { released: 0, withheld: 1 }, alerts: [] });

it('reports missing configuration without pretending the processor is active', async () => {
  vi.stubEnv('SARFLOW_PROCESSOR_URL', '');
  const fetcher = vi.fn(); const server = await serve({ fetcher });
  try {
    const response = await fetch(server.url);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ configured: false, status: 'not-configured', message: 'Scheduled processor is not connected.' });
    expect(fetcher).not.toHaveBeenCalled();
  } finally { await server.close(); }
});

it('validates status and strips private fields and diagnostic messages', async () => {
  const payload = valid();
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ ...payload, privatePath: '/private',
    locations: payload.locations.map(location => ({ ...location, privatePath: '/private' })) }));
  const server = await serve({ baseUrl: 'https://processor.example/service/', fetcher });
  try {
    const response = await fetch(server.url); const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.privatePath).toBeUndefined();
    expect(data.locations[0].privatePath).toBeUndefined();
    expect(data.locations[0].message).not.toContain('Private');
    expect(String(fetcher.mock.calls[0]?.[0])).toBe('https://processor.example/service/status');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error', credentials: 'omit' });
  } finally { await server.close(); }
});

it.each(['http://remote.example', 'https://user:password@processor.example', 'https://processor.example?token=private', 'ftp://processor.example'])('rejects unsafe configuration %s before requesting', async baseUrl => {
  const fetcher = vi.fn(); const server = await serve({ baseUrl, fetcher });
  try {
    const response = await fetch(server.url);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Scheduled processor status is temporarily unavailable.' });
    expect(fetcher).not.toHaveBeenCalled();
  } finally { await server.close(); }
});

it.each(['failure', 'invalid', 'oversized'])('fails closed with generic error for %s', async kind => {
  const fetcher = async () => kind === 'failure' ? new Response('private upstream error', { status: 500 })
    : kind === 'oversized' ? new Response('x'.repeat(1024 * 1024 + 1)) : Response.json({ ...valid(), publication: { released: -1, withheld: 0 } });
  const server = await serve({ baseUrl: 'http://127.0.0.1:8090', fetcher });
  try {
    const response = await fetch(server.url);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Scheduled processor status is temporarily unavailable.' });
  } finally { await server.close(); }
});
