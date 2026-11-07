import { expect, it } from 'vitest';
import { asfQuerySchema, asfRecords, asfFootprintSchema } from '../shared/asf-discovery';
import express from 'express';
import { asfDiscoveryRouter } from '../server/asf-discovery';

it('preserves source polygon coordinates and withholds unsupported geometry without losing metadata', () => {
  const geometry = {
    type: 'Polygon',
    coordinates: [
      [
        [89, 24],
        [90, 24],
        [90, 26],
        [89, 24],
      ],
    ],
  };
  const properties = {
    fileID: 'geometry-fixture',
    platform: 'NISAR',
    processingLevel: 'GCOV',
    startTime: '2026-09-01T00:00:00Z',
  };
  expect(asfRecords([{ properties, geometry }])[0].footprint).toEqual(geometry);
  for (const invalid of [
    null,
    { type: 'Polygon', coordinates: [[]] },
    { type: 'Point', coordinates: [89, 25] },
    {
      type: 'Polygon',
      coordinates: [
        [
          [89, 24],
          [90, 24],
          [90, 26],
          [89, 25],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [179, 24],
          [-179, 24],
          [-179, 26],
          [179, 24],
        ],
      ],
    },
    {
      type: 'Polygon',
      coordinates: [
        [
          [189, 24],
          [190, 24],
          [190, 26],
          [189, 24],
        ],
      ],
    },
  ]) {
    expect(asfFootprintSchema.safeParse(invalid).success).toBe(false);
    const records = asfRecords([{ properties, geometry: invalid }]);
    expect(records).toHaveLength(1);
    expect(records[0].footprint).toBeNull();
  }
});

it('rejects reversed or impossible dates and unsupported coordinates', () => {
  for (const q of [
    { lat: 91, lon: 0, start: '2026-01-01', end: '2026-02-01' },
    { lat: 25, lon: 89, start: '2026-02-30', end: '2026-03-01' },
    { lat: 25, lon: 89, start: '2026-03-01', end: '2026-02-01' },
  ])
    expect(asfQuerySchema.safeParse(q).success).toBe(false);
});
it('queries the fixed ASF endpoint, forwards date bounds, caches and preserves unknown metadata', async () => {
  const calls: string[] = [];
  const app = express()
    .use(
      asfDiscoveryRouter((async (url: URL) => {
        calls.push(String(url));
        return new Response(
          JSON.stringify({
            type: 'FeatureCollection',
            features: [
              {
                properties: {
                  fileID: 'fixture',
                  platform: 'NISAR',
                  processingLevel: 'GCOV',
                  startTime: '2026-09-01T00:00:00Z',
                  mainBandPolarization: ['HH', 'HV'],
                },
              },
            ],
          }),
        );
      }) as typeof fetch),
    )
    .listen(0, '127.0.0.1');
  await new Promise<void>((r) => app.once('listening', r));
  const base = `http://127.0.0.1:${(app.address() as { port: number }).port}`;
  try {
    expect((await fetch(base + '?lat=&lon=89&start=2026-09-01&end=2026-10-01')).status).toBe(400);
    const q = '?lat=25&lon=89&start=2026-09-01&end=2026-10-01';
    const body = await (await fetch(base + q)).json();
    expect(body.records[0].polarization).toBe('HH + HV');
    expect(body.records[0].collection).toBeNull();
    await fetch(base + q);
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]);
    expect(url.hostname).toBe('api.daac.asf.alaska.edu');
    expect(url.searchParams.get('processingLevel')).toBe('GCOV');
    expect(url.searchParams.get('intersectsWith')).toBe('POINT(89 25)');
    expect(url.searchParams.get('end')).toBe('2026-10-01T23:59:59Z');
  } finally {
    await new Promise<void>((r) => app.close(() => r()));
  }
});
it('returns an explicit upstream error without generating observations', async () => {
  const app = express()
    .use(
      asfDiscoveryRouter(
        (async () => new Response('unavailable', { status: 503 })) as typeof fetch,
      ),
    )
    .listen(0, '127.0.0.1');
  await new Promise<void>((r) => app.once('listening', r));
  try {
    const res = await fetch(
      `http://127.0.0.1:${(app.address() as { port: number }).port}?lat=25&lon=89&start=2026-09-01&end=2026-10-01`,
    );
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain('no substitute');
  } finally {
    await new Promise<void>((r) => app.close(() => r()));
  }
});
it('withholds ancillary products, malformed dates, duplicate records and unsafe access links', () => {
  const p = {
    fileID: 'test-fixture',
    platform: 'NISAR',
    processingLevel: 'GCOV',
    startTime: '2026-09-01T00:00:00Z',
    url: 'https://evil.example/file',
  };
  const rows = asfRecords([
    { properties: p },
    { properties: p },
    { properties: { ...p, fileID: 'ancillary', processingLevel: 'ECMWF_SMST' } },
    { properties: { ...p, fileID: 'bad', startTime: 'invalid' } },
  ]);
  expect(rows).toHaveLength(1);
  expect(rows[0].accessUrl).toBeNull();
  expect(rows[0].polarization).toBeNull();
});
