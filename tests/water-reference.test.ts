import { expect, it, vi } from 'vitest';
import { discoverWaterReferences } from '../server/water-reference';
const query = { lat: '25.15', lon: '89.8', start: '2026-09-01', end: '2026-10-31' };
it('uses official CMR collection and preserves source identifiers without claiming evaluation', async () => {
  const fetcher = vi.fn(
    async (_url: URL | RequestInfo) =>
      new Response(
        JSON.stringify({
          feed: {
            entry: [
              {
                id: 'G123-PODAAC',
                title: 'Source title',
                time_start: '2026-10-01T00:00:00Z',
              },
            ],
          },
        }),
        { headers: { 'CMR-Hits': '38' } },
      ),
  );
  const result = await discoverWaterReferences(query, fetcher);
  expect(String(fetcher.mock.calls[0][0])).toContain('short_name=OPERA_L3_DSWX-HLS_V1');
  expect(result.records[0].id).toBe('G123-PODAAC');
  expect(result.truncated).toBe(true);
  expect(result.evaluation).toBe('not-evaluated');
});
it('rejects invalid dates, coordinates and reversed intervals before network access', async () => {
  const fetcher = vi.fn();
  for (const input of [
    { ...query, lat: '91' },
    { ...query, start: '2026-02-30' },
    { ...query, end: '2026-08-01' },
  ])
    await expect(discoverWaterReferences(input, fetcher)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it('does not replace upstream errors or malformed records with made-up observations', async () => {
  await expect(
    discoverWaterReferences(query, async () => new Response('{}', { status: 503 })),
  ).rejects.toThrow();
  await expect(
    discoverWaterReferences(query, async () => new Response('{"feed":{"entry":[{}]}}')),
  ).rejects.toThrow();
});
