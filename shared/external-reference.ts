import { z } from 'zod';

const https = z
  .url()
  .refine((url) => new URL(url).protocol === 'https:', 'Reference source must use HTTPS');
const point = z.tuple([z.number().min(-180).max(180), z.number().min(-85).max(85)]);
const ring = z
  .array(point)
  .min(4)
  .max(50000)
  .refine(
    (r) => r[0][0] === r.at(-1)![0] && r[0][1] === r.at(-1)![1],
    'Reference ring must be closed',
  );
const polygon = z.array(ring).min(1).max(100);
const geometry = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: polygon }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygon).min(1).max(100) }),
]);
const collection = z.object({
  type: z.literal('FeatureCollection'),
  features: z
    .array(
      z.object({
        type: z.literal('Feature'),
        properties: z.record(
          z.string().max(80),
          z.union([z.string().max(500), z.number(), z.null()]),
        ),
        geometry,
      }),
    )
    .min(1)
    .max(2000),
});

export const externalReferenceSchema = z
  .object({
    version: z.literal(1),
    id: z.literal('emsr927-aoi01-v1'),
    regionId: z.literal('nepal-rasuwa'),
    title: z.string().max(160),
    producer: z.string().max(200),
    distributor: z.string().max(100),
    product: z.string().max(120),
    eventDate: z.iso.date(),
    referenceObservationDate: z.iso.date(),
    referenceObservationType: z.string().max(200),
    published: z.iso.date(),
    retrieved: z.iso.datetime({ offset: true }),
    sourcePage: https,
    officialPage: https,
    terms: https,
    attribution: z.string().max(500),
    status: z.literal('external-mapped-reference-not-field-validated'),
    comparisonStatus: z.literal('not-evaluated'),
    limitations: z.array(z.string().max(1000)).min(1).max(30),
    sources: z
      .array(
        z.object({
          layer: z.enum(['event', 'aoi']),
          url: https,
          archiveSha256: z.string().regex(/^[a-f0-9]{64}$/),
          sourceGeojsonSha256: z.string().regex(/^[a-f0-9]{64}$/),
          bytes: z.number().int().positive().max(5000000),
        }),
      )
      .length(2),
    event: collection,
    aoi: collection,
  })
  .superRefine((data, ctx) => {
    let points = 0;
    for (const layer of [data.event, data.aoi])
      for (const feature of layer.features) {
        const polygons =
          feature.geometry.type === 'Polygon'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;
        for (const polygon of polygons) for (const ring of polygon) points += ring.length;
      }
    if (points > 50000)
      ctx.addIssue({ code: 'custom', message: 'Reference coordinate budget exceeded' });
    if (new Set(data.sources.map((s) => s.layer)).size !== 2)
      ctx.addIssue({ code: 'custom', message: 'Require separate event and AOI source records' });
    if (
      data.event.features.some(
        (f) =>
          f.properties.obj_desc !== 'Landslide' || f.properties.event_type !== '6-Mass Movement',
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Unexpected source category; do not relabel this product as floodwater',
      });
    }
  });
export type ExternalReference = z.infer<typeof externalReferenceSchema>;
export type ReferenceGeometry = ExternalReference['event']['features'][number]['geometry'];

export function referenceRings(g: ReferenceGeometry): [number, number][][] {
  return g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
}
export function referenceBounds(data: ExternalReference): [number, number, number, number] {
  const points = data.aoi.features.flatMap((f) => referenceRings(f.geometry).flat());
  return points.reduce<[number, number, number, number]>(
    (b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)],
    [180, 85, -180, -85],
  );
}
export function referenceTemporalContext(data: ExternalReference, before?: string, after?: string) {
  const reference = Date.parse(data.referenceObservationDate + 'T00:00:00Z');
  const a = before ? Date.parse(before) : NaN,
    b = after ? Date.parse(after) : NaN;
  const valid = Number.isFinite(a) && Number.isFinite(b) && a < b;
  const calendarA = valid ? Date.parse(new Date(a).toISOString().slice(0, 10) + 'T00:00:00Z') : NaN;
  const calendarB = valid ? Date.parse(new Date(b).toISOString().slice(0, 10) + 'T00:00:00Z') : NaN;
  return {
    comparisonStatus: 'not-evaluated' as const,
    chronologicalPair: valid,
    referenceDate: data.referenceObservationDate,
    temporalPrecision: 'UTC-calendar-days' as const,
    daysAfterBefore: valid ? (reference - calendarA) / 86400000 : null,
    daysBeforeAfter: valid ? (calendarB - reference) / 86400000 : null,
    referenceWithinSelectedInterval: valid
      ? calendarA <= reference && reference <= calendarB
      : null,
    warning:
      'Different dates and quantities are being compared visually. No binary flood labels, match score, damage claim or accuracy follows from this overlay.',
  };
}
