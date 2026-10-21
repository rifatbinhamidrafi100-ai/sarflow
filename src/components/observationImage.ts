export class MissingBrowsePixels extends Error {
  constructor() {
    super(
      'NASA lists this acquisition, but its browse image has no visible pixels here. Choose another observation date; this is not evidence of no change.',
    );
  }
}

/** Black pixels can be valid radar imagery; only alpha determines visibility. */
export function hasVisiblePixels(rgba: Uint8ClampedArray): boolean {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > 0) return true;
  return false;
}

// Keep decoded dates across comparison changes without retaining an unbounded raster archive.
const images = new Map<string, { pixels: ImageData; expires: number }>();
const byteLimit = 32 * 1024 * 1024;
let cachedBytes = 0;
function forget(url: string) {
  const entry = images.get(url);
  if (entry) cachedBytes -= entry.pixels.data.byteLength;
  images.delete(url);
}

export async function loadObservationPixels(url: string, signal: AbortSignal): Promise<ImageData> {
  signal.throwIfAborted();
  const cached = images.get(url);
  if (cached && cached.expires > Date.now()) {
    images.delete(url);
    images.set(url, cached);
    return cached.pixels;
  }
  if (cached) forget(url);
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
  });
  if (!response.ok) throw Error('The observation image could not be downloaded. Retry this date.');
  const image = await createImageBitmap(await response.blob());
  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw Error('This browser could not inspect the observation image.');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height);
    if (!hasVisiblePixels(pixels.data)) throw new MissingBrowsePixels();
    signal.throwIfAborted();
    if (pixels.data.byteLength <= byteLimit) {
      // Another visible workspace may have finished the same URL while this one decoded it.
      forget(url);
      while (cachedBytes + pixels.data.byteLength > byteLimit) forget(images.keys().next().value!);
      images.set(url, { pixels, expires: Date.now() + 5 * 60 * 1000 });
      cachedBytes += pixels.data.byteLength;
    }
    return pixels;
  } finally {
    image.close();
  }
}
