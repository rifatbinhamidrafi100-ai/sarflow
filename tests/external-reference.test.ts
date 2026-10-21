import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { externalReferenceSchema, referenceBounds, referenceTemporalContext } from '../shared/external-reference';

const raw = () => JSON.parse(readFileSync('public/data/references/rasuwa-emsr927.json', 'utf8'));
describe('archived external mapping reference', () => {
  it('preserves actual source category, coordinates and provenance without making a flood accuracy claim', () => {
    const d = externalReferenceSchema.parse(raw());
    expect(d.event.features).toHaveLength(1); expect(d.aoi.features).toHaveLength(1);
    expect(d.event.features[0].properties.obj_desc).toBe('Landslide');
    expect(d.event.features[0].properties.det_method).toBe('Photo-interpretation');
    expect(referenceBounds(d)).toEqual([85.32320008, 28.14911693, 85.34826837, 28.18818783]);
    expect(d.sources[0].archiveSha256).toBe('5fc4da39fd761664e25c3949f8d35417d5fb6435b1464628810f9e5d313c4e5d');
    expect(d.comparisonStatus).toBe('not-evaluated');
    expect(d.limitations.join(' ')).toContain('not a binary floodwater');
  });
  it('reports calendar-date mismatches and rejects invalid chronology without fabricated scores', () => {
    const d = externalReferenceSchema.parse(raw());
    const context = referenceTemporalContext(d, '2026-08-19T23:39:18Z', '2026-08-31T23:39:18Z');
    expect(context.daysAfterBefore).toBe(8); expect(context.daysBeforeAfter).toBe(4);
    expect(context.temporalPrecision).toBe('UTC-calendar-days');
    expect(context.referenceWithinSelectedInterval).toBe(true);
    expect(referenceTemporalContext(d, '2026-09-01', '2026-09-13').referenceWithinSelectedInterval).toBe(false);
    expect(referenceTemporalContext(d, '2026-09-01', '2026-08-19').daysAfterBefore).toBeNull();
    expect(referenceTemporalContext(d, undefined, undefined).chronologicalPair).toBe(false);
  });
  it('rejects open rings, invalid coordinates, relabeled hazard categories and unsafe source links', () => {
    const open = raw(); open.event.features[0].geometry.coordinates[0].pop();
    expect(externalReferenceSchema.safeParse(open).success).toBe(false);
    const coords = raw(); coords.event.features[0].geometry.coordinates[0][0][0] = 999;
    expect(externalReferenceSchema.safeParse(coords).success).toBe(false);
    const relabeled = raw(); relabeled.event.features[0].properties.obj_desc = 'Confirmed flood';
    expect(externalReferenceSchema.safeParse(relabeled).success).toBe(false);
    const links = raw(); links.sources[0].url = 'javascript:alert(1)';
    expect(externalReferenceSchema.safeParse(links).success).toBe(false);
  });
});
