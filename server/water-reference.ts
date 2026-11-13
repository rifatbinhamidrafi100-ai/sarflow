import { Router } from 'express';
import { z } from 'zod';
const day = z.iso.date();
const querySchema = z
  .object({
    lat: z.coerce.number().finite().min(-90).max(90),
    lon: z.coerce.number().finite().min(-180).max(180),
    start: day,
    end: day,
  })
  .refine((q) => q.start <= q.end, 'Start must precede end');
const entrySchema = z.object({
  id: z.string().regex(/^G\d+-[A-Z0-9_]+$/),
  title: z.string().min(1),
  time_start: z.iso.datetime({ offset: true }),
});
export async function discoverWaterReferences(input: unknown, fetcher: typeof fetch = fetch) {
  const query = querySchema.parse(input);
  const params = new URLSearchParams({
    short_name: 'OPERA_L3_DSWX-HLS_V1',
    point: `${query.lon},${query.lat}`,
    temporal: `${query.start}T00:00:00Z,${query.end}T23:59:59Z`,
    page_size: '50',
    sort_key: '-start_date',
  });
  const response = await fetcher(`https://cmr.earthdata.nasa.gov/search/granules.json?${params}`, {
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok || !response.body) throw Error('NASA reference catalogue unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) throw Error('NASA response exceeds limit');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const body = z
    .object({ feed: z.object({ entry: z.array(entrySchema).max(50) }) })
    .parse(JSON.parse(new TextDecoder().decode(bytes)));
  const hits = response.headers.get('CMR-Hits');
  const total = hits !== null && /^\d+$/.test(hits) ? Number(hits) : null;
  return {
    source: 'NASA CMR / JPL PO.DAAC',
    collection: 'OPERA_L3_DSWX-HLS_V1',
    retrievedAt: new Date().toISOString(),
    query,
    evaluation: 'not-evaluated' as const,
    truncated: total === null ? body.feed.entry.length === 50 : total > body.feed.entry.length,
    total,
    records: body.feed.entry.map((e) => ({
      id: e.id,
      title: e.title,
      acquired: e.time_start,
      source: `https://cmr.earthdata.nasa.gov/search/concepts/${encodeURIComponent(e.id)}.html`,
    })),
    limitations: [
      'Catalogue footprint intersection does not verify usable pixels or full AOI coverage.',
      'Optical water products require cloud, shadow, date and grid review before independent comparison.',
      'No reference raster was downloaded, aligned or evaluated by this search.',
    ],
  };
}
export function waterReferenceRouter() {
  const router = Router();
  router.get('/', async (req, res) => {
    if (!querySchema.safeParse(req.query).success) {
      res
        .status(400)
        .json({ error: 'Provide valid lat, lon, start and end dates in chronological order.' });
      return;
    }
    try {
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json(await discoverWaterReferences(req.query));
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      res.status(502).json({
        error:
          'NASA reference discovery is unavailable. Retry; no substitute observations were generated.',
      });
    }
  });
  return router;
}
