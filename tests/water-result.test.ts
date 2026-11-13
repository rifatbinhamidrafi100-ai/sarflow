import { describe, expect, it } from 'vitest';
import { parseWaterResult } from '../shared/water-result';

const fixture = () => ({
  algorithm: 'sarflow-water-candidates-v1',
  dataType: 'synthetic-software-fixture',
  location: 'Software test only',
  commonValidCells: 3,
  counts: { '0': 1, '1': 1, '2': 0, '3': 0, '4': 1, '5': 1 },
  legend: {
    '0': 'Excluded',
    '1': 'Persistent',
    '2': 'New',
    '3': 'Receding',
    '4': 'Other',
    '5': 'Insufficient',
  },
  observations: [{ id: 'fixture', date: '2026-01-01', sha256: 'a'.repeat(64) }],
  perDateValidCells: [3],
  temporalMeansDb: [-20],
  thresholdBaseline: { candidateCells: 1 },
  limitations: ['Synthetic test only'],
  previews: [{ file: 'tile-0-0.png', row: 0, col: 0, width: 2, height: 2 }],
  outputs: ['classes'],
  window: { width: 2, height: 2, transform: [1, 0, 0, 0, -1, 0] },
  accuracyEvaluation: null,
  areaKm2: null,
  parameters: { co_db: -17 },
  terrain: { source: 'Fixture' },
});

describe('water result display contract', () => {
  it('preserves the complete receipt rather than stripping provenance', () => {
    const input = fixture();
    expect(parseWaterResult(input)).toEqual(input);
  });
  it.each([
    ['inconsistent class total', { counts: { ...fixture().counts, '1': 8 } }],
    ['negative support', { commonValidCells: -1 }],
    ['common support exceeds date support', { perDateValidCells: [2] }],
    ['missing date mean', { temporalMeansDb: [] }],
    ['non-finite mean', { temporalMeansDb: [Infinity] }],
    ['mean without support', { commonValidCells: 0 }],
    ['too many candidates', { thresholdBaseline: { candidateCells: 4 } }],
    ['unknown provenance', { dataType: 'real-looking-demo' }],
    ['unsupported algorithm', { algorithm: 'unknown' }],
    ['unjustified area', { areaKm2: 12 }],
    ['unsafe output path', { outputs: ['../private'] }],
    [
      'out-of-window preview',
      { previews: [{ file: 'tile-1-0.png', row: 1, col: 0, width: 2, height: 2 }] },
    ],
  ])('withholds %s', (_name, patch) => {
    expect(() => parseWaterResult({ ...fixture(), ...patch })).toThrow('Invalid water result');
  });
  it('allows explicit zero common support with null means and zero candidates', () => {
    expect(
      parseWaterResult({
        ...fixture(),
        commonValidCells: 0,
        temporalMeansDb: [null],
        thresholdBaseline: { candidateCells: 0 },
      }).commonValidCells,
    ).toBe(0);
  });
});
