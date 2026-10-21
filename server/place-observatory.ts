import { Router } from 'express';
import { GCOV_COLLECTION } from '../shared/collection-policy.js';
import {
  placeObservatorySchema,
  placeRecordSchema,
  type PlaceObservatory,
} from '../shared/place-observatory.js';
import { clientCooldown } from './http-policy.js';

const MAX_BYTES = 4 * 1024 * 1024;
async function boundedJson(response: Response) {
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > MAX_BYTES)
    throw Error('Upstream unavailable');
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw Error('Upstream response too large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function utc(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const parsed = placeRecordSchema.shape.acquiredAt.safeParse(value);
  return parsed.success ? new Date(parsed.data).toISOString() : null;
}

function footprint(entry: Record<string, unknown>) {
  const polygons = entry.polygons;
  if (
    !Array.isArray(polygons) ||
    polygons.length !== 1 ||
    !Array.isArray(polygons[0]) ||
    polygons[0].length !== 1 ||
    typeof polygons[0][0] !== 'string'
  )
    return null;
  const values = polygons[0][0].trim().split(/\s+/).map(Number);
  if (values.length < 8 || values.length > 2000 || values.length % 2) return null;
  const ring: [number, number][] = [];
  for (let index = 0; index < values.length; index += 2) {
    const lat = values[index],
      lon = values[index + 1];
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 85 ||
      Math.abs(lon) > 180 ||
      (ring.length && Math.abs(lon - ring.at(-1)![0]) > 180)
    )
      return null;
    ring.push([lon, lat]);
  }
  if (ring[0].join() !== ring.at(-1)!.join()) ring.push(ring[0]);
  return ring.length <= 1000 ? ring : null;
}

export function placeObservatoryRouter(fetcher: typeof fetch = fetch) {
  const router = Router(),
    cache = new Map<string, { at: number; data: PlaceObservatory }>();
  const allow = clientCooldown(1500);
  router.get('/', async (req, res) => {
    const lat =
      typeof req.query.lat === 'string' && req.query.lat.trim() ? Number(req.query.lat) : NaN;
    const lon =
      typeof req.query.lon === 'string' && req.query.lon.trim() ? Number(req.query.lon) : NaN;
    const page =
      req.query.page === undefined
        ? 1
        : typeof req.query.page === 'string' && /^\d+$/.test(req.query.page)
          ? Number(req.query.page)
          : NaN;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 84.8 ||
      Math.abs(lon) > 179.8 ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10
    ) {
      res
        .status(400)
        .json({ error: 'Choose supported coordinates and a catalog page from 1 to 10.' });
      return;
    }
    const key = `${lat},${lon},${page}`,
      hit = cache.get(key);
    if (hit && Date.now() - hit.at < 300000) {
      res.json(hit.data);
      return;
    }
    if (!allow(req)) {
      res.setHeader('Retry-After', '2');
      res.status(429).json({ error: 'Wait a moment, then retry the place catalog.' });
      return;
    }
    const query = new URL('https://cmr.earthdata.nasa.gov/search/granules.json');
    query.search = new URLSearchParams({
      short_name: GCOV_COLLECTION,
      point: `${lon},${lat}`,
      page_size: '100',
      page_num: String(page),
      sort_key: '-start_date',
    }).toString();
    try {
      const response = await fetcher(query, {
        signal: AbortSignal.timeout(20000),
        headers: { Accept: 'application/json' },
      });
      const body = await boundedJson(response);
      if (!Array.isArray(body.feed?.entry) || body.feed.entry.length > 100)
        throw Error('Invalid catalog');
      const entries: unknown[] = body.feed.entry,
        records = [],
        seen = new Set<string>();
      for (const raw of entries) {
        if (!raw || typeof raw !== 'object') continue;
        const entry = raw as Record<string, unknown>;
        const parsed = placeRecordSchema.safeParse({
          id: entry.id,
          title: entry.title,
          acquiredAt: utc(entry.time_start),
          catalogUpdatedAt: utc(entry.updated),
          source: `https://cmr.earthdata.nasa.gov/search/concepts/${entry.id}.html`,
          footprint: footprint(entry),
          sourceAvailableAt: null,
          downloadedAt: null,
          processedAt: null,
          validatedAt: null,
        });
        if (!parsed.success || seen.has(parsed.data.id)) continue;
        seen.add(parsed.data.id);
        records.push(parsed.data);
      }
      records.sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt) || a.id.localeCompare(b.id));
      const hits = response.headers.get('CMR-Hits');
      const total =
        hits !== null && /^\d+$/.test(hits) && Number.isSafeInteger(Number(hits))
          ? Number(hits)
          : null;
      const more = total === null ? entries.length === 100 : page * 100 < total;
      const data = placeObservatorySchema.parse({
        version: '1.0.0',
        checkedAt: new Date().toISOString(),
        place: { latitude: lat, longitude: lon },
        source: {
          mission: 'NISAR',
          sensor: 'L-SAR',
          collection: GCOV_COLLECTION,
          product: 'GCOV',
          variable: 'Geocoded polarimetric covariance / radar backscatter',
          processingLevel: 'L2',
          maturity: 'PROVISIONAL',
          resolutionMetres: null,
          query: query.toString(),
        },
        page,
        pageSize: 100,
        sourceTotalRecords: total,
        returnedRecords: entries.length,
        omittedRecords: entries.length - records.length,
        nextPage: more && page < 10 ? page + 1 : null,
        historyComplete:
          page === 1 &&
          total !== null &&
          total === entries.length &&
          !more &&
          entries.length === records.length,
        records,
        limitations: [
          'Catalog entries identify candidate acquisitions, not calibrated pixels, exact local coverage, or scientific compatibility.',
          'History is a bounded catalog query: at most 100 records per page and 10 pages. Separate pages may change as the source catalog updates.',
          'Missing dates remain gaps. Multiple products can share an acquisition date; record counts are not unique revisit counts.',
          'Catalog updated time is not the original source-publication time. Availability, raw download, analysis and validation times are not supplied by this catalog.',
          'Nominal spatial resolution and quality must be checked in the actual product. PROVISIONAL calibration does not establish event-detection accuracy.',
          'Absent, complex or antimeridian-crossing footprints are withheld rather than approximated.',
        ],
      });
      if (cache.size >= 30) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: Date.now(), data });
      res.json(data);
    } catch {
      res.status(502).json({
        error:
          'The NASA place catalog could not be verified. Retry; no substitute observations were generated.',
      });
    }
  });
  return router;
}
