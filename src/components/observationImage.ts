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

export async function loadObservationPixels(url: string, signal: AbortSignal): Promise<ImageData> {
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
    return pixels;
  } finally {
    image.close();
  }
}
