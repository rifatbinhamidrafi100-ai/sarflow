import express from 'express';
import path from 'node:path';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { securityHeaders, discoveryCache } from './http-policy.js';
import { boundsSchema, datasetSchema, type Bounds, type Dataset } from '../shared/schema.js';
import { demoDatasets } from '../shared/demo.js';
import { discover } from './catalog.js';
import { observatorySchema } from '../shared/observatory.js';
import { placesRouter } from './places.js';
import { globalRadarRouter } from './global-radar.js';
import { coverageRouter } from './coverage.js';
import { waterRouter } from './water.js';
import { monitoringRouter } from './monitoring.js';
import { placeObservatoryRouter } from './place-observatory.js';

interface AppOptions {
  discover?: typeof discover;
  datasets?: Dataset[];
  production?: boolean;
  importDirectory?: string;
  trustedProxies?: string[];
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  const proxies =
    options.trustedProxies ??
    (process.env.SARFLOW_TRUSTED_PROXIES ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  if (proxies.length) app.set('trust proxy', proxies);
  app.use(securityHeaders);
  app.use(
    ['/api/places', '/api/global-radar', '/api/coverage', '/api/catalog', '/api/place-observatory'],
    discoveryCache,
  );
  app.use('/api/place-observatory', placeObservatoryRouter());
  app.use('/api/places', placesRouter());
  app.use('/api/global-radar', globalRadarRouter());
  app.use('/api/coverage', coverageRouter());
  app.use('/api/water', waterRouter());
  app.use('/api/monitoring', monitoringRouter());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));
  app.get('/api/observatory', (_req, res) => {
    try {
      const archive = observatorySchema.parse(
        JSON.parse(readFileSync(path.resolve('public/data/observatory.json'), 'utf8')),
      );
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json(archive);
    } catch {
      res.status(503).json({
        error: 'The archived NISAR imagery manifest is unavailable. Retry or use the teaching lab.',
      });
    }
  });
  app.get('/api/datasets', (_req, res) => {
    try {
      const imported: Dataset[] = [];
      const dir = options.importDirectory ?? path.resolve('data/imported');
      let skipped = 0;
      const ids = new Set(demoDatasets.map((d) => d.id));
      if (existsSync(dir))
        for (const name of readdirSync(dir)
          .filter((n) => n.endsWith('.json'))
          .sort()
          .slice(0, 20)) {
          try {
            const file = path.join(dir, name);
            if (statSync(file).size > 64 * 1024 * 1024) throw Error('Import too large');
            const dataset = datasetSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
            if (ids.has(dataset.id)) throw Error('Duplicate dataset');
            ids.add(dataset.id);
            imported.push(dataset);
          } catch {
            skipped++;
          }
        }
      res.setHeader('X-SARFlow-Skipped-Imports', String(skipped));
      res.setHeader('Cache-Control', 'no-cache');
      res.json(options.datasets ?? [...demoDatasets, ...imported]);
    } catch {
      res.status(503).json({ error: 'The imported dataset directory is unavailable.' });
    }
  });
  const cache = new Map<string, { at: number; data: Awaited<ReturnType<typeof discover>> }>();
  const clients = new Map<string, { at: number; count: number }>();
  app.get('/api/catalog', async (req, res) => {
    const parsed = boundsSchema.safeParse(
      typeof req.query.bbox === 'string' ? req.query.bbox.split(',').map(Number) : [],
    );
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Provide valid bbox=west,south,east,north within −180…180 and −85…85.' });
      return;
    }
    const bounds = parsed.data as Bounds;
    if (bounds[2] - bounds[0] > 10 || bounds[3] - bounds[1] > 10) {
      res
        .status(400)
        .json({ error: 'Select a region no larger than 10 degrees in either direction.' });
      return;
    }
    const now = Date.now(),
      ip = req.ip ?? 'local';
    for (const [k, v] of clients) if (now - v.at > 60000) clients.delete(k);
    const usage = clients.get(ip) ?? { at: now, count: 0 };
    usage.count++;
    clients.set(ip, usage);
    if (usage.count > 20) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Catalog request limit reached. Retry in one minute.' });
      return;
    }
    const key = bounds.join(',');
    const found = cache.get(key);
    if (found && now - found.at < 300000) {
      res.json({ ...found.data, cached: true });
      return;
    }
    try {
      const data = await (options.discover ?? discover)(bounds);
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: now, data });
      res.json(data);
    } catch (error) {
      res.status(502).json({
        error:
          error instanceof Error
            ? error.message
            : 'NASA catalog is unavailable. Retry or use the archived catalog.',
      });
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route' }));
  if (options.production) {
    const dist = path.resolve('dist');
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  return app;
}
