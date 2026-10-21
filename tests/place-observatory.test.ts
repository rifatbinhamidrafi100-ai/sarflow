import { it, expect, vi } from 'vitest';
import express from 'express';
import { placeObservatoryRouter } from '../server/place-observatory';
import { placeObservatorySchema, localInputCandidatesForRecord, acquisitionAgeDays, placeEvidenceExport } from '../shared/place-observatory';
import { demoDatasets } from '../shared/demo';

const entry = (index = 0) => ({ id: `G${100 + index}-ASF`, title: `NISAR-PRODUCT-${index}`, time_start: `2026-07-${String(index % 28 + 1).padStart(2, '0')}T00:00:00Z`,
  updated: '2026-08-01T00:00:00Z', polygons: [['24 89 24 90 25 90 24 89']] });
async function serve(fetcher: typeof fetch) {
  const server = express().use(placeObservatoryRouter(fetcher)).listen(0, '127.0.0.1');
  await new Promise<void>(r => server.once('listening', r));
  return { url: `http://127.0.0.1:${(server.address() as { port: number }).port}`, close: () => new Promise<void>(r => server.close(() => r())) };
}

it('retains single acquisitions, separates lifecycle timestamps and caches metadata', async () => {
  const upstream = vi.fn(async (_url: unknown) => new Response(JSON.stringify({ feed: { entry: [entry()] } }), { headers: { 'CMR-Hits': '1' } }));
  const server = await serve(upstream as typeof fetch);
  try {
    for (const query of ['lat=&lon=89', 'lat=90&lon=89', 'lat=24&lon=89&page=11', 'lat=24&lon=89&page=1.5']) expect((await fetch(`${server.url}?${query}`)).status).toBe(400);
    const data = placeObservatorySchema.parse(await (await fetch(`${server.url}?lat=24&lon=89`)).json());
    expect(data.records).toHaveLength(1); expect(data.historyComplete).toBe(true);
    expect(data.records[0].footprint![0]).toEqual([89, 24]);
    expect(data.records[0].catalogUpdatedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(data.records[0].sourceAvailableAt).toBeNull(); expect(data.records[0].processedAt).toBeNull();
    expect(data.records[0].validatedAt).toBeNull(); expect(data.source.resolutionMetres).toBeNull();
    await fetch(`${server.url}?lat=24&lon=89`); expect(upstream).toHaveBeenCalledTimes(1);
    expect(new URL(String(upstream.mock.calls[0][0])).searchParams.get('point')).toBe('89,24');
  } finally { await server.close(); }
});

it('quarantines malformed/duplicate records but preserves unknown or unsafe footprints', async () => {
  const unsafe = { ...entry(2), polygons: [['24 179 24 -179 25 -179 24 179']] };
  const records = [entry(), { ...entry(1), time_start: '2026-02-30T00:00:00Z' }, entry(), unsafe, { ...entry(3), updated: 'unknown', polygons: [] }];
  const server = await serve((async () => new Response(JSON.stringify({ feed: { entry: records } }), { headers: { 'CMR-Hits': '5' } })) as typeof fetch);
  try {
    const data = placeObservatorySchema.parse(await (await fetch(`${server.url}?lat=24&lon=89`)).json());
    expect(data.records).toHaveLength(3); expect(data.omittedRecords).toBe(2); expect(data.historyComplete).toBe(false);
    expect(data.records[1].footprint).toBeNull(); expect(data.records[2].catalogUpdatedAt).toBeNull();
  } finally { await server.close(); }
});

it('reports bounded pagination and never claims complete history without a source count', async () => {
  for (const total of ['220', null]) {
    const server = await serve((async () => new Response(JSON.stringify({ feed: { entry: Array.from({ length: 100 }, (_, index) => entry(index)) } }), { headers: total ? { 'CMR-Hits': total } : {} })) as typeof fetch);
    try {
      const data = placeObservatorySchema.parse(await (await fetch(`${server.url}?lat=24&lon=89&page=1`)).json());
      expect(data.nextPage).toBe(2); expect(data.historyComplete).toBe(false);
    } finally { await server.close(); }
  }
});

it('keeps upstream failure and oversized responses explicit and retryable', async () => {
  for (const response of [new Response('upstream error', { status: 503 }), new Response('broken json'), new Response('{}', { headers: { 'content-length': '9000000' } })]) {
    const server = await serve((async () => response) as typeof fetch);
    try {
      const result = await fetch(`${server.url}?lat=24&lon=89`);
      expect(result.status).toBe(502); expect((await result.json()).error).toContain('could not be verified');
    } finally { await server.close(); }
  }
});

it('matches local measured subsets by exact identity, UTC instant, provenance and location', async () => {
  const server = await serve((async () => new Response(JSON.stringify({ feed: { entry: [entry()] } }))) as typeof fetch);
  try {
    const catalog = placeObservatorySchema.parse(await (await fetch(`${server.url}?lat=24&lon=89`)).json());
    const record = catalog.records[0];
    const matched = { ...demoDatasets[0], status: 'observed' as const, bounds: [88, 23, 90, 25] as [number, number, number, number],
      provenance: { ...demoDatasets[0].provenance, files: [{ name: 'test.h5', sha256: 'a'.repeat(64) }] },
      observations: [{ ...demoDatasets[0].observations[0], sourceId: record.title, date: '2026-07-01T00:00:00.000Z' }] };
    expect(localInputCandidatesForRecord(catalog, record, [matched])).toHaveLength(1);
    expect(localInputCandidatesForRecord(catalog, record, [{ ...matched, status: 'synthetic' }])).toHaveLength(0);
    expect(localInputCandidatesForRecord(catalog, record, [{ ...matched, bounds: [1, 1, 2, 2] }])).toHaveLength(0);
    expect(localInputCandidatesForRecord(catalog, record, [{ ...matched, observations: [{ ...matched.observations[0], sourceId: 'different' }] }])).toHaveLength(0);
    expect(localInputCandidatesForRecord(catalog, record, [{ ...matched, observations: [{ ...matched.observations[0], date: '2026-07-02T00:00:00Z' }] }])).toHaveLength(0);
    expect(placeEvidenceExport(catalog, [matched]).quantitativeResult).toBeNull();
    const candidate = placeEvidenceExport(catalog, [matched]).localInputCandidates[0].datasets[0];
    expect(candidate.pointSupportVerified).toBe(false);
    expect(candidate.matchBasis).toContain('approximate display-envelope');
    expect(acquisitionAgeDays('2026-07-01T00:00:00Z', '2026-07-13T12:00:00Z')).toBe(12);
    expect(acquisitionAgeDays('2027-01-01T00:00:00Z', catalog.checkedAt)).toBeNull();
  } finally { await server.close(); }
});
