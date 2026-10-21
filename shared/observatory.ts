import { z } from 'zod';
import { boundsSchema } from './schema.js';
export const actualFrameSchema = z.object({
  id: z.string(),
  retrieved: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  acquired: z.string(),
  title: z.string(),
  image: z
    .string()
    .refine(
      (v) =>
        /^\/observations\/[a-z0-9-]+\.png$/.test(v) ||
        v.startsWith('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?'),
    ),
  display: z
    .object({
      image: z.string().regex(/^\/observations\/[a-z0-9-]+\.webp$/),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      bytes: z.number().int().positive(),
      encoding: z.literal('lossless-webp'),
    })
    .optional(),
  thumbnail: z.string().optional(),
  thumbnailRequest: z.url().optional(),
  request: z.url(),
  sha256: z.string().length(64).nullable(),
  bytes: z.number().nullable(),
  polygon: z.array(z.tuple([z.number(), z.number()])),
  source: z.url(),
});
export const regionSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  topic: z.string(),
  center: z.tuple([z.number(), z.number()]),
  bounds: boundsSchema,
  description: z.string(),
  query: z.url(),
  observations: z.array(actualFrameSchema).min(2),
});
export const observatorySchema = z.object({
  version: z.number(),
  retrieved: z.string(),
  source: z.string(),
  layer: z.string(),
  collection: z.string(),
  status: z.string(),
  limitations: z.array(z.string()),
  regions: z.array(regionSchema).min(1),
});
export type Observatory = z.infer<typeof observatorySchema>;
export type Region = z.infer<typeof regionSchema>;
export type ActualFrame = z.infer<typeof actualFrameSchema>;
export function selectionReport(
  archive: Observatory,
  region: Region,
  before: number,
  after: number,
  note: string,
  maxPixels = 768,
) {
  return {
    format: 'SARFlow visual investigation v1',
    exported: new Date().toISOString(),
    source: archive.source,
    collection: archive.collection,
    region: { name: region.name, bounds: region.bounds },
    before: region.observations[before],
    after: region.observations[after],
    displayRequests: {
      before: observationDisplayImage(region.observations[before], maxPixels),
      after: observationDisplayImage(region.observations[after], maxPixels),
      previewBefore: observationDisplayImage(region.observations[before], 384),
      previewAfter: observationDisplayImage(region.observations[after], 384),
    },
    userInterpretation: note,
    limitations: archive.limitations,
    quantitativeResult: null,
  };
}

/** Display derivatives only; original source requests and hashes remain authoritative. */
export function observationDisplayImage(frame: ActualFrame, maxPixels = 768) {
  if (frame.display) return frame.display.image;
  if (!frame.image.startsWith('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?'))
    return frame.image;
  const preview = new URL(frame.image);
  const width = Number(preview.searchParams.get('WIDTH'));
  const height = Number(preview.searchParams.get('HEIGHT'));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    return frame.image;
  const scale = Math.min(1, maxPixels / Math.max(width, height));
  if (scale === 1) return frame.image;
  preview.searchParams.set('WIDTH', String(Math.max(1, Math.round(width * scale))));
  preview.searchParams.set('HEIGHT', String(Math.max(1, Math.round(height * scale))));
  return preview.toString();
}
