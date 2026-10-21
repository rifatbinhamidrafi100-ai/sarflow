import { z } from 'zod';
import { analyze } from './analysis';
import { datasetSchema, type Analysis, type Dataset } from './schema';

export const evidenceParametersSchema = z.object({
  before: z.number().int().nonnegative(),
  after: z.number().int().nonnegative(),
  threshold: z.number().min(0.5).max(10),
  filter: z.boolean(),
});
export type EvidenceParameters = z.infer<typeof evidenceParametersSchema>;

/** A result must belong to the exported inputs, pair and method, not just look plausible. */
function verifyResult(actual: Analysis, expected: Analysis) {
  const { elapsedMs: _actualTime, ...actualValues } = actual;
  const { elapsedMs: _expectedTime, ...expectedValues } = expected;
  // Compare each known field independently of object property insertion order.
  for (const key of Object.keys(expectedValues) as (keyof typeof expectedValues)[]) {
    if (JSON.stringify(actualValues[key]) !== JSON.stringify(expectedValues[key])) {
      throw new Error(
        'Analysis does not match the current inputs and settings. Run analysis again.',
      );
    }
  }
}

/** Export boundary for numerical analysis. RGB visual investigations must use their own contract. */
export function buildEvidencePackage(
  input: Dataset,
  settings: EvidenceParameters,
  result: Analysis | null,
  exported = new Date().toISOString(),
) {
  const dataset = datasetSchema.parse(input);
  const parameters = evidenceParametersSchema.parse(settings);
  z.iso.datetime().parse(exported);
  const { before, after, threshold, filter } = parameters;
  if (before >= after || after >= dataset.observations.length) {
    throw new Error('Select a chronological pair of different observations.');
  }
  if (result) verifyResult(result, analyze(dataset, before, after, threshold, filter));
  const synthetic = dataset.status === 'synthetic';
  const safeResult = result ? { ...result, areaKm2: synthetic ? null : result.areaKm2 } : null;
  const warnings = [
    ...new Set([
      ...dataset.provenance.limitations,
      ...(synthetic
        ? ['Synthetic grids do not establish physical area.']
        : [
            'Input observation status is supplied by the dataset; calibration and quality review are not independently verified.',
          ]),
      'Threshold candidates do not confirm a hazard, damage, or cause.',
      'Threshold sensitivity is not an event probability or confidence interval.',
    ]),
  ];
  const observation = (index: number) => {
    const o = dataset.observations[index];
    return { id: o.id, sourceId: o.sourceId, date: o.date };
  };
  return {
    schemaVersion: '1.0.0' as const,
    dataset,
    parameters,
    result: safeResult,
    exported,
    observations: { before: observation(before), after: observation(after) },
    labels: {
      input: synthetic ? ('illustrative' as const) : ('measured' as const),
      result: safeResult ? (synthetic ? ('illustrative' as const) : ('processed' as const)) : null,
    },
    method: {
      id: 'common-support-log-ratio-v1',
      formula: '10 * log10(after / before)',
      inputUnit: dataset.unit,
      outputUnit: 'dB',
      filter: filter ? '3x3 mean in linear power on common valid support' : 'none',
      selection: 'absolute delta >= threshold',
      steps: [
        ...dataset.provenance.processing,
        'Intersect paired validity masks',
        ...(filter ? ['Apply 3x3 mean in linear power'] : []),
        'Compute per-cell power log-ratio in dB',
        'Apply absolute change threshold',
      ],
    },
    quality: {
      analysisStatus: safeResult ? ('complete' as const) : ('not-run' as const),
      calibrationStatus: synthetic
        ? ('not-applicable' as const)
        : ('not-independently-verified' as const),
      totalCells: dataset.width * dataset.height,
      commonValidCells: safeResult?.valid ?? null,
      excludedCells: safeResult?.excluded ?? null,
    },
    metrics: {
      changedCells: safeResult?.changed ?? null,
      increasedCells: safeResult?.increase ?? null,
      decreasedCells: safeResult?.decrease ?? null,
      meanSignedChangeDb: safeResult?.mean ?? null,
      changedCellPercent: safeResult ? (100 * safeResult.changed) / safeResult.valid : null,
      percentageDenominator: 'common valid cells',
      candidateAreaKm2: safeResult?.areaKm2 ?? null,
    },
    validation: {
      status: 'not-validated' as const,
      eventConfidence: null,
      referenceComparison: null,
    },
    warnings,
    disclaimer: synthetic
      ? 'SYNTHETIC DEMO — NOT NASA OBSERVATIONS'
      : 'Processed research output; calibration not independently verified; no validated event classification',
  };
}

export type EvidencePackage = ReturnType<typeof buildEvidencePackage>;
