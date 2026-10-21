import { describe, expect, it } from 'vitest';
import { analyze } from '../shared/analysis';
import { createDemo } from '../shared/demo';
import { buildEvidencePackage } from '../shared/evidence-package';

const exported = '2026-10-16T12:00:00.000Z';
const parameters = { before: 0, after: 1, threshold: 3, filter: true };

describe('versioned evidence package', () => {
  it('preserves reproducible inputs, source identifiers, method and illustrative labels', () => {
    const d = createDemo(0), r = analyze(d, 0, 1, 3, true);
    const p = buildEvidencePackage(d, parameters, r, exported);
    expect(p.schemaVersion).toBe('1.0.0');
    expect(p.dataset).toEqual(d);
    expect(p.parameters).toEqual(parameters);
    expect(p.observations.before.sourceId).toBe(d.observations[0].sourceId);
    expect(p.observations.after.date).toBe(d.observations[1].date);
    expect(p.method.id).toBe('common-support-log-ratio-v1');
    expect(p.labels.input).toBe('illustrative');
    expect(p.labels.result).toBe('illustrative');
    expect(p.metrics.changedCells).toBe(r.changed);
    expect(p.metrics.changedCellPercent).toBeCloseTo(100 * r.changed / r.valid);
    expect(p.validation.status).toBe('not-validated');
    expect(p.validation.eventConfidence).toBeNull();
    expect(p.disclaimer).toContain('SYNTHETIC');
  });

  it('withholds synthetic area even when the supplied fixture has pixel area', () => {
    const d = createDemo(0); d.pixelAreaM2 = 100;
    const p = buildEvidencePackage(d, parameters, analyze(d, 0, 1, 3, true), exported);
    expect(p.result?.areaKm2).toBeNull();
    expect(p.metrics.candidateAreaKm2).toBeNull();
    expect(p.warnings).toContain('Synthetic grids do not establish physical area.');
  });

  it('represents an unrun analysis with null metrics instead of fabricated zeroes', () => {
    const p = buildEvidencePackage(createDemo(0), parameters, null, exported);
    expect(p.quality.analysisStatus).toBe('not-run');
    expect(p.result).toBeNull();
    expect(p.metrics.changedCells).toBeNull();
    expect(p.labels.result).toBeNull();
  });

  it('rejects stale or altered output, including a different filter', () => {
    const d = createDemo(0), r = analyze(d, 0, 1, 3, true);
    expect(() => buildEvidencePackage(d, { ...parameters, threshold: 4 }, r, exported)).toThrow('current inputs and settings');
    expect(() => buildEvidencePackage(d, parameters, { ...r, changed: r.changed + 1 }, exported)).toThrow('current inputs and settings');
    expect(() => buildEvidencePackage(d, { ...parameters, filter: false }, r, exported)).toThrow('current inputs and settings');
    expect(() => buildEvidencePackage(d, parameters, { ...r, delta: r.delta.map(() => 0) }, exported)).toThrow('current inputs and settings');
  });

  it('rejects invalid dataset, date, pair and threshold even without analysis', () => {
    const d = createDemo(0);
    expect(() => buildEvidencePackage(d, { ...parameters, after: 99 }, null, exported)).toThrow();
    expect(() => buildEvidencePackage(d, { ...parameters, before: 1 }, null, exported)).toThrow();
    expect(() => buildEvidencePackage(d, { ...parameters, threshold: NaN }, null, exported)).toThrow();
    expect(() => buildEvidencePackage(d, parameters, null, 'invalid')).toThrow();
    expect(() => buildEvidencePackage({ ...d, width: 3 }, parameters, null, exported)).toThrow();
  });

  it('keeps observed input status separate from calibration and event validation', () => {
    const d = createDemo(0); d.status = 'observed'; d.pixelAreaM2 = 100;
    const p = buildEvidencePackage(d, parameters, analyze(d, 0, 1, 3, true), exported);
    expect(p.labels.input).toBe('measured');
    expect(p.labels.result).toBe('processed');
    expect(p.quality.calibrationStatus).toBe('not-independently-verified');
    expect(p.validation.status).toBe('not-validated');
    expect(p.metrics.candidateAreaKm2).not.toBeNull();
    expect(p.warnings).toContain('Input observation status is supplied by the dataset; calibration and quality review are not independently verified.');
  });

  it('preserves finite area through JSON export for large finite supplied pixel areas', () => {
    const d = createDemo(0); d.status = 'observed'; d.pixelAreaM2 = 1e308;
    const settings = { ...parameters, after: 5, threshold: 0.5 };
    const p = buildEvidencePackage(d, settings, analyze(d, 0, 5, 0.5, true), exported);
    expect(Number.isFinite(p.metrics.candidateAreaKm2)).toBe(true);
    expect(JSON.parse(JSON.stringify(p)).metrics.candidateAreaKm2).toBe(p.metrics.candidateAreaKm2);
  });
});
