// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { useRadarUpdates, RADAR_REFRESH_MS } from '../src/data/useRadarUpdates';
import type { Observatory } from '../shared/observatory';

const archive = JSON.parse(readFileSync('public/data/observatory.json', 'utf8')) as Observatory;
const receipt = (retrieved = '2026-09-28T00:00:00Z') => ({ ...structuredClone(archive), retrieved });
let hidden = false;
beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}

it('checks the selected location after debounce and refreshes only while visible', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(receipt()));
  vi.stubGlobal('fetch', fetcher);
  const hook = renderHook(() => useRadarUpdates('28', '85.3'));
  await advance(499); expect(fetcher).not.toHaveBeenCalled();
  await advance(1); expect(fetcher).toHaveBeenCalledTimes(1);
  expect(hook.result.current.data).toBeDefined();
  hidden = true;
  await advance(RADAR_REFRESH_MS); expect(fetcher).toHaveBeenCalledTimes(1);
  hidden = false;
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(fetcher).toHaveBeenCalledTimes(2);
  await advance(RADAR_REFRESH_MS); expect(fetcher).toHaveBeenCalledTimes(3);
});

it('aborts the previous location and ignores its late response', async () => {
  const first = deferred<Response>(), second = deferred<Response>();
  const fetcher = vi.fn<typeof fetch>().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  vi.stubGlobal('fetch', fetcher);
  const hook = renderHook(({ lat }) => useRadarUpdates(lat, '85.3'), { initialProps: { lat: '28' } });
  await advance(500);
  const originalSignal = fetcher.mock.calls[0][1]!.signal!;
  hook.rerender({ lat: '29' });
  expect(originalSignal.aborted).toBe(true);
  expect(hook.result.current.data).toBeUndefined();
  await advance(500);
  await act(async () => { second.resolve(Response.json(receipt('2026-09-28T02:00:00Z'))); });
  await act(async () => { first.resolve(Response.json(receipt('2026-09-28T01:00:00Z'))); });
  expect(hook.result.current.data?.retrieved).toBe('2026-09-28T02:00:00Z');
  expect(hook.result.current.key).toBe('29,85.3');
});

it('retains the last valid observations when the automatic refresh fails', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(receipt()))
    .mockResolvedValueOnce(Response.json({ error: 'NASA unavailable' }, { status: 502 }));
  vi.stubGlobal('fetch', fetcher);
  const hook = renderHook(() => useRadarUpdates('28', '85.3'));
  await advance(500); const previous = hook.result.current.data;
  await advance(RADAR_REFRESH_MS);
  expect(hook.result.current.data).toBe(previous);
  expect(hook.result.current.message).toContain('Previous observations are retained');
  expect(hook.result.current.busy).toBe(false);
});

it('aborts on unmount and removes polling and visibility listeners', async () => {
  const pending = deferred<Response>();
  const fetcher = vi.fn<typeof fetch>().mockReturnValue(pending.promise);
  vi.stubGlobal('fetch', fetcher);
  const hook = renderHook(() => useRadarUpdates('28', '85.3'));
  await advance(500);
  const signal = fetcher.mock.calls[0][1]!.signal!;
  hook.unmount(); expect(signal.aborted).toBe(true);
  await advance(RADAR_REFRESH_MS * 2);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(Response.json(receipt())); });
});

it('accepts fresh provenance even when the granule IDs are unchanged', async () => {
  const next = receipt('2026-09-28T03:00:00Z');
  next.regions[0].observations[0].polygon = [[85, 28], [86, 28], [86, 29], [85, 28]];
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(receipt()))
    .mockResolvedValueOnce(Response.json(next));
  vi.stubGlobal('fetch', fetcher);
  const hook = renderHook(() => useRadarUpdates('28', '85.3'));
  await advance(500);
  await advance(RADAR_REFRESH_MS);
  expect(hook.result.current.data?.retrieved).toBe(next.retrieved);
  expect(hook.result.current.data?.regions[0].observations[0].polygon).toEqual(next.regions[0].observations[0].polygon);
});
