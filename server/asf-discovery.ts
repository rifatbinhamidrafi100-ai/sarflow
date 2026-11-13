import { Router } from 'express';
import {
  asfQuerySchema,
  asfRecords,
  asfResultSchema,
  type AsfResult,
} from '../shared/asf-discovery.js';
import { boundedJson } from './place-observatory.js';
import { clientCooldown } from './http-policy.js';

export function asfDiscoveryRouter(fetcher: typeof fetch = fetch) {
  const router = Router(),
    allow = clientCooldown(2000);
  const cache = new Map<string, { at: number; data: AsfResult }>();
  router.get('/', async (req, res) => {
    const parsed = asfQuerySchema.safeParse(req.query);
    if (!parsed.success || !req.query.lat || !req.query.lon) {
      res
        .status(400)
        .json({ error: 'Enter supported coordinates and a valid start/end date range.' });
      return;
    }
    const q = parsed.data,
      key = JSON.stringify(q),
      hit = cache.get(key);
    if (hit && Date.now() - hit.at < 300000) {
      res.json(hit.data);
      return;
    }
    if (!allow(req)) {
      res.setHeader('Retry-After', '2');
      res.status(429).json({ error: 'Wait two seconds before another ASF search.' });
      return;
    }
    const url = new URL('https://api.daac.asf.alaska.edu/services/search/param');
    url.search = new URLSearchParams({
      dataset: 'NISAR',
      processingLevel: 'GCOV',
      intersectsWith: `POINT(${q.lon} ${q.lat})`,
      start: `${q.start}T00:00:00Z`,
      end: `${q.end}T23:59:59Z`,
      maxResults: '50',
      output: 'geojson',
    }).toString();
    try {
      const body = await boundedJson(
        await fetcher(url, {
          signal: AbortSignal.timeout(25000),
          headers: { Accept: 'application/geo+json' },
        }),
      );
      if (
        body.type !== 'FeatureCollection' ||
        !Array.isArray(body.features) ||
        body.features.length > 50
      )
        throw Error('Invalid ASF response');
      const records = asfRecords(body.features).filter(
        (r) => r.acquiredAt.slice(0, 10) >= q.start && r.acquiredAt.slice(0, 10) <= q.end,
      );
      const data = asfResultSchema.parse({
        query: q,
        sourceQuery: url.toString(),
        checkedAt: new Date().toISOString(),
        records,
        omitted: body.features.length - records.length,
        limitReached: body.features.length === 50,
      });
      if (cache.size >= 30) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: Date.now(), data });
      res.json(data);
    } catch {
      res.status(502).json({
        error:
          'ASF discovery is unavailable or its response could not be verified. Retry; no substitute records were generated.',
      });
    }
  });
  return router;
}
