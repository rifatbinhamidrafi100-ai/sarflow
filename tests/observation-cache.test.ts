// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const pixels = { width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255]) } as ImageData;
let fetcher: ReturnType<typeof vi.fn>;
let decoded: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  fetcher = vi.fn(async () => ({ ok: true, blob: async () => new Blob() }));
  decoded = vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() }));
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('createImageBitmap', decoded);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(), getImageData: () => pixels,
  } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('reuses inspected pixels when returning to a comparison date', async () => {
  const { loadObservationPixels } = await import('../src/components/observationImage');
  const signal = new AbortController().signal;
  const first = await loadObservationPixels('/first.png', signal);
  await loadObservationPixels('/second.png', signal);
  expect(await loadObservationPixels('/first.png', signal)).toBe(first);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(decoded).toHaveBeenCalledTimes(2);
});

it('refreshes pixels after five minutes rather than hiding upstream updates indefinitely', async () => {
  const { loadObservationPixels } = await import('../src/components/observationImage');
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  await loadObservationPixels('/changing.png', new AbortController().signal);
  clock.mockReturnValue(302000);
  await loadObservationPixels('/changing.png', new AbortController().signal);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('does not reuse empty coverage as a permanent missing observation', async () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue({
    drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  } as unknown as CanvasRenderingContext2D);
  const { loadObservationPixels } = await import('../src/components/observationImage');
  for (let i = 0; i < 2; i++)
    await expect(loadObservationPixels('/empty.png', new AbortController().signal)).rejects.toThrow('no visible pixels');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('evicts old dates when decoded pixels exceed the memory budget', async () => {
  const data = new Uint8ClampedArray(2 * 1024 * 1024); data[3] = 255;
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue({
    drawImage: vi.fn(), getImageData: () => ({ data }),
  } as unknown as CanvasRenderingContext2D);
  const { loadObservationPixels } = await import('../src/components/observationImage');
  for (let i = 0; i < 17; i++) await loadObservationPixels(`/date-${i}.png`, new AbortController().signal);
  await loadObservationPixels('/date-0.png', new AbortController().signal);
  expect(fetcher).toHaveBeenCalledTimes(18);
});

it('honors cancellation even when a date is cached', async () => {
  const { loadObservationPixels } = await import('../src/components/observationImage');
  await loadObservationPixels('/cached.png', new AbortController().signal);
  const canceled = new AbortController(); canceled.abort();
  await expect(loadObservationPixels('/cached.png', canceled.signal)).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('shares a prefetch with a visible consumer without canceling the other consumer', async () => {
  let complete!: (value: unknown) => void;
  fetcher.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  const { loadObservationPixels } = await import('../src/components/observationImage');
  const background = new AbortController();
  const prefetched = loadObservationPixels('/shared.png', background.signal);
  const abandoned = expect(prefetched).rejects.toThrow();
  const visible = loadObservationPixels('/shared.png', new AbortController().signal);
  background.abort();
  complete({ok:true,blob:async()=>new Blob()});
  await abandoned;
  expect(await visible).toBe(pixels);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
