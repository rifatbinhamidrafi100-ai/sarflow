import { z } from 'zod';

const day = z.string().date();
export const asfQuerySchema = z
  .object({
    lat: z.coerce.number().finite().min(-84.8).max(84.8),
    lon: z.coerce.number().finite().min(-179.8).max(179.8),
    start: day,
    end: day,
  })
  .refine((q) => q.start <= q.end, 'Start date must not follow end date.');

export const sourceLink = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.hostname.endsWith('.asf.alaska.edu') ||
        url.hostname.endsWith('.asf.earthdatacloud.nasa.gov'))
    );
  });
const coordinate = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
const ring = z
  .array(coordinate)
  .min(4)
  .max(1000)
  .refine((points) => {
    if (points.length < 4) return false;
    const first = points[0],
      last = points[points.length - 1];
    return (
      first[0] === last[0] &&
      first[1] === last[1] &&
      new Set(points.map((p) => p.join(','))).size >= 3 &&
      points.every((p, i) => i === 0 || Math.abs(p[0] - points[i - 1][0]) <= 180)
    );
  }, 'Unclosed, degenerate or dateline-crossing ring');
// Preserve source coordinates, including holes. Unsupported geometry is withheld, not repaired.
export const asfFootprintSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(ring).min(1).max(16),
});
export const asfRecordSchema = z.object({
  id: z.string().min(1).max(300),
  acquiredAt: z.string().datetime(),
  collection: z.string().nullable(),
  polarization: z.string().nullable(),
  sensor: z.string().nullable(),
  direction: z.string().nullable(),
  accessUrl: sourceLink.nullable(),
  footprint: asfFootprintSchema.nullable().default(null),
});
export const asfResultSchema = z.object({
  query: asfQuerySchema,
  sourceQuery: sourceLink,
  checkedAt: z.string().datetime(),
  records: z.array(asfRecordSchema).max(50),
  omitted: z.number().int().nonnegative(),
  limitReached: z.boolean(),
});
export type AsfResult = z.infer<typeof asfResultSchema>;

// Keep metadata supplied by ASF; do not infer quality, maturity or pixels from filenames.
export function asfRecords(features: unknown[]) {
  const records: z.infer<typeof asfRecordSchema>[] = [];
  const seen = new Set<string>();
  for (const feature of features) {
    const raw = z
      .object({ properties: z.record(z.string(), z.unknown()), geometry: z.unknown().optional() })
      .safeParse(feature);
    if (!raw.success) continue;
    const p = raw.data.properties;
    const footprint = asfFootprintSchema.safeParse(raw.data.geometry);
    if (p.platform !== 'NISAR' || p.processingLevel !== 'GCOV') continue;
    const text = (v: unknown) =>
      typeof v === 'string' && v.length > 0 && v.length <= 300 ? v : null;
    const parsed = asfRecordSchema.safeParse({
      id: p.fileID,
      acquiredAt: p.startTime,
      collection: text(p.collectionName),
      polarization:
        Array.isArray(p.mainBandPolarization) &&
        p.mainBandPolarization.length <= 8 &&
        p.mainBandPolarization.every((v) => typeof v === 'string' && v.length <= 8)
          ? p.mainBandPolarization.join(' + ')
          : (text(p.mainBandPolarization) ?? text(p.polarization)),
      sensor: text(p.sensor),
      direction: text(p.flightDirection),
      accessUrl: sourceLink.safeParse(p.url).success ? p.url : null,
      footprint: footprint.success ? footprint.data : null,
    });
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    records.push(parsed.data);
  }
  return records.sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt));
}
