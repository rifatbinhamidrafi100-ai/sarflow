import { expect, it } from 'vitest';
import express, { type Request } from 'express';
import { mkdtemp, mkdir, writeFile, access, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app';
import { demoDatasets } from '../shared/demo';
import { clientCooldown } from '../server/http-policy';
import { expireJobs, JOB_RETENTION_MS } from '../server/job-retention';
import { waterRouter } from '../server/water';

it('isolates malformed imports and applies headers to early routes and errors', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sarflow-import-test-'));
  await writeFile(path.join(dir, 'bad.json'), '{broken');
  await writeFile(path.join(dir, 'valid.json'), JSON.stringify({ ...demoDatasets[0], id: 'valid-import' }));
  const server = createApp({ importDirectory: dir, discover: async () => ({ records: [], retrieved: new Date().toISOString(), cached: false }) }).listen(0, '127.0.0.1');
  await new Promise<void>(r => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const datasets = await fetch(base + '/api/datasets');
    expect(datasets.status).toBe(200);
    expect(datasets.headers.get('x-sarflow-skipped-imports')).toBe('1');
    expect((await datasets.json()).some((d: { id: string }) => d.id === 'valid-import')).toBe(true);
    for (const endpoint of ['/api/places?q=x', '/api/global-radar', '/api/coverage', '/api/water/inputs', '/api/monitoring', '/api/missing']) {
      const response = await fetch(base + endpoint);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      if (!response.ok) expect(response.headers.get('cache-control')).toBe('no-store');
    }
    const success = await fetch(base + '/api/catalog?bbox=89,24,90,25');
    expect(success.headers.get('cache-control')).toContain('s-maxage=300');
  } finally {
    await new Promise<void>(r => server.close(() => r()));
    await rm(dir, { recursive: true });
  }
});

it('limits clients independently without accepting spoofed forwarded addresses', () => {
  const allow = clientCooldown(1500);
  const request = (ip: string) => ({ ip, headers: { 'x-forwarded-for': Math.random().toString() } }) as unknown as Request;
  expect(allow(request('192.0.2.1'))).toBe(true);
  expect(allow(request('192.0.2.1'))).toBe(false);
  expect(allow(request('192.0.2.2'))).toBe(true);
});

it('uses forwarded clients only through explicitly trusted proxies', async () => {
  for (const trusted of [false, true]) {
    const app = express();
    if (trusted) app.set('trust proxy', ['loopback']);
    const allow = clientCooldown(1500);
    app.get('/', (req, res) => res.sendStatus(allow(req) ? 200 : 429));
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(r => server.once('listening', r));
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
    try {
      expect((await fetch(url, { headers: { 'x-forwarded-for': '192.0.2.1' } })).status).toBe(200);
      expect((await fetch(url, { headers: { 'x-forwarded-for': '192.0.2.2' } })).status).toBe(trusted ? 200 : 429);
    } finally { await new Promise<void>(r => server.close(() => r())); }
  }
  expect(createApp({ trustedProxies: ['loopback'] }).get('trust proxy')).toEqual(['loopback']);
  expect(createApp({ trustedProxies: [] }).get('trust proxy')).toBe(false);
});

it('expires only marked old generated outputs, preserving running and unmarked directories', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sarflow-retention-test-'));
  const old = randomUUID(), active = randomUUID(), unmarked = randomUUID(), recent = randomUUID();
  try {
    for (const id of [old, active, unmarked, recent]) {
      await mkdir(path.join(root, id));
      if (id !== unmarked) await writeFile(path.join(root, id, '.sarflow-job.json'), JSON.stringify({ id, created: id === recent ? Date.now() : Date.now() - JOB_RETENTION_MS - 1000 }));
    }
    expect(await expireJobs(root, new Set([active]))).toEqual([old]);
    await expect(access(path.join(root, old))).rejects.toThrow();
    for (const id of [active, unmarked, recent]) await access(path.join(root, id));
  } finally { await rm(root, { recursive: true }); }
});

it('accepts explicitly configured public origins and rejects missing or cross-site origins', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sarflow-origin-test-'));
  const server = express().use('/water', waterRouter(dir, dir, ['https://sarflow.example'])).listen(0, '127.0.0.1');
  await new Promise<void>(r => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/water/jobs`;
  const post = (extra: Record<string, string>) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: '{"input":"missing"}' });
  try {
    expect((await post({})).status).toBe(403);
    expect((await post({ origin: 'https://sarflow.example' })).status).toBe(404);
    expect((await post({ origin: 'https://sarflow.example', 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect((await post({ origin: 'https://evil.example' })).status).toBe(403);
  } finally {
    await new Promise<void>(r => server.close(() => r()));
    await rm(dir, { recursive: true });
  }
});
