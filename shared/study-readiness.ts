import { datasetSchema, type Dataset } from './schema';

export const focusedStudy = {
  id: 'brahmaputra-radar-change',
  title: 'Brahmaputra: follow the radar evidence',
  question: 'How did radar return change across this river corridor?',
  point: { latitude: 25.15, longitude: 89.8 },
  archiveRegion: 'brahmaputra',
  method: '10 × log10(after linear power / before linear power), using common valid cells',
  thresholdDb: 3,
  smoothing: false,
} as const;

interface NumericalCandidate {
  id: string;
  title: string;
  before: string;
  after: string;
  commonValidPixels: number;
  totalPixels: number;
  sources: { productId: string; acquiredAt: string; sha256: string }[];
}

function rejectReason(dataset: Dataset): string | null {
  if (dataset.status !== 'observed')
    return 'Synthetic teaching input, not an observed study result.';
  if (dataset.provenance.generator)
    return 'A generated input cannot establish an observed study result.';
  const [west, south, east, north] = dataset.bounds;
  const { latitude, longitude } = focusedStudy.point;
  if (longitude < west || longitude > east || latitude < south || latitude > north)
    return 'Display envelope does not contain the study point.';
  const host = new URL(dataset.provenance.url).hostname;
  if (!(
    host === 'nasa.gov' ||
    host.endsWith('.nasa.gov') ||
    host === 'asf.alaska.edu' ||
    host.endsWith('.asf.alaska.edu')
  ))
    return 'A recognized source reference is required.';
  if (
    !/^GCOV\b/.test(dataset.provenance.product) ||
    !/^EPSG:(326|327)(0[1-9]|[1-5]\d|60)$/.test(dataset.crs)
  )
    return 'Declared GCOV product and projected source-grid reference are required.';
  const files = dataset.provenance.files ?? [];
  const ids = dataset.observations.map((o) => o.sourceId);
  if (new Set(ids).size !== ids.length)
    return 'Independent source product identifiers are required.';
  if (new Set(files.map((f) => f.sha256)).size !== files.length)
    return 'Distinct source file hashes are required for independent acquisitions.';
  for (const observation of dataset.observations) {
    if (
      observation.id !== observation.sourceId ||
      !observation.sourceId.startsWith('NISAR_L2_PR_GCOV_')
    )
      return 'Observation identity must match its declared NISAR GCOV source product.';
    if (files.filter((f) => f.name === `${observation.sourceId}.h5`).length !== 1)
      return 'Each acquisition requires one matching source filename and SHA-256 record.';
  }
  return null;
}

/** Inspect declared inputs, never authenticate remote bytes or infer independent validation. */
export function assessStudyInputs(inputs: unknown[]) {
  const numericalCandidates: NumericalCandidate[] = [];
  const rejected: { id: string; reason: string }[] = [];
  for (const input of inputs) {
    const parsed = datasetSchema.safeParse(input);
    if (!parsed.success) {
      rejected.push({
        id: 'invalid-input',
        reason: 'Dataset does not satisfy the numerical input contract.',
      });
      continue;
    }
    const dataset = parsed.data;
    const reason = rejectReason(dataset);
    if (reason) {
      rejected.push({ id: dataset.id, reason });
      continue;
    }
    const first = dataset.observations[0];
    const last = dataset.observations.at(-1)!;
    const commonValidPixels = first.power.filter(
      (value, i) => value !== null && last.power[i] !== null,
    ).length;
    if (!commonValidPixels) {
      rejected.push({
        id: dataset.id,
        reason: 'The first/last pair has no common valid measurement cells.',
      });
      continue;
    }
    numericalCandidates.push({
      id: dataset.id,
      title: dataset.title,
      before: first.date,
      after: last.date,
      commonValidPixels,
      totalPixels: dataset.width * dataset.height,
      sources: dataset.observations.map((o) => ({
        productId: o.sourceId,
        acquiredAt: o.date,
        sha256: dataset.provenance.files!.find((f) => f.name === `${o.sourceId}.h5`)!.sha256,
      })),
    });
  }
  return {
    version: '1.0.0' as const,
    study: focusedStudy,
    numericalCandidates,
    rejected,
    sourceBytesVerified: false as const,
    pointSupportVerified: false as const,
    independentValidation: 'not-provided' as const,
    eventConfirmed: false as const,
    accuracy: null,
    affectedAreaKm2: null,
    limitations: [
      'Registry checks assess declared inputs, not source authenticity or independent calibration.',
      'A geographic display envelope does not prove exact valid pixel support at the selected point.',
      'Radar-intensity change alone does not establish flooding, damage or its cause.',
      'No independent event/date-matched evaluation is attached to this assessment.',
    ],
  };
}
