import { z } from 'zod';
import type { Dataset } from './schema.js';
import { GCOV_COLLECTION } from './collection-policy.js';

const timestamp = z.iso.datetime({ offset: true });
const nasaUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === 'https:' &&
    url.hostname === 'cmr.earthdata.nasa.gov' &&
    !url.username &&
    !url.password
  );
});
const point = z.tuple([z.number().min(-180).max(180), z.number().min(-85).max(85)]);
export const placeRecordSchema = z.object({
  id: z.string().regex(/^G\d+-ASF$/),
  title: z.string().min(1).max(1024),
  acquiredAt: timestamp,
  catalogUpdatedAt: timestamp.nullable(),
  source: nasaUrl,
  footprint: z.array(point).min(4).max(1000).nullable(),
  // A catalog update is not the original publication time or an ingestion receipt.
  sourceAvailableAt: z.null(),
  downloadedAt: z.null(),
  processedAt: z.null(),
  validatedAt: z.null(),
});
export const placeObservatorySchema = z.object({
  version: z.literal('1.0.0'),
  checkedAt: timestamp,
  place: z.object({
    latitude: z.number().min(-84.8).max(84.8),
    longitude: z.number().min(-179.8).max(179.8),
  }),
  source: z.object({
    mission: z.literal('NISAR'),
    sensor: z.literal('L-SAR'),
    collection: z.literal(GCOV_COLLECTION),
    product: z.literal('GCOV'),
    variable: z.literal('Geocoded polarimetric covariance / radar backscatter'),
    processingLevel: z.literal('L2'),
    maturity: z.literal('PROVISIONAL'),
    resolutionMetres: z.null(),
    query: nasaUrl,
  }),
  page: z.number().int().min(1).max(10),
  pageSize: z.literal(100),
  sourceTotalRecords: z.number().int().nonnegative().nullable(),
  returnedRecords: z.number().int().min(0).max(100),
  omittedRecords: z.number().int().min(0).max(100),
  nextPage: z.number().int().min(2).max(10).nullable(),
  historyComplete: z.boolean(),
  records: z.array(placeRecordSchema).max(100),
  limitations: z.array(z.string().max(1000)).max(20),
});
export type PlaceObservatory = z.infer<typeof placeObservatorySchema>;
export type PlaceRecord = z.infer<typeof placeRecordSchema>;

/** Candidate association by exact product/time and approximate display-envelope overlap.
 * Envelope overlap does not establish native-window containment or valid point support.
 */
export function localInputCandidatesForRecord(
  catalog: PlaceObservatory,
  record: PlaceRecord,
  datasets: Dataset[],
) {
  return datasets.filter((dataset) => {
    if (dataset.status !== 'observed' || !dataset.provenance.files?.length) return false;
    const { latitude, longitude } = catalog.place;
    const [west, south, east, north] = dataset.bounds;
    if (longitude < west || longitude > east || latitude < south || latitude > north) return false;
    return dataset.observations.some(
      (observation) =>
        (observation.sourceId === record.id || observation.sourceId === record.title) &&
        Date.parse(observation.date) === Date.parse(record.acquiredAt),
    );
  });
}

export function acquisitionAgeDays(acquired: string, checked: string) {
  const elapsed = Date.parse(checked) - Date.parse(acquired);
  return Number.isFinite(elapsed) && elapsed >= 0 ? Math.floor(elapsed / 86400000) : null;
}

export function placeEvidenceExport(catalog: PlaceObservatory, datasets: Dataset[]) {
  return {
    format: 'SARFlow place evidence ledger v1',
    catalog,
    localInputCandidates: catalog.records.map((record) => ({
      observationId: record.id,
      datasets: localInputCandidatesForRecord(catalog, record, datasets).map((dataset) => ({
        id: dataset.id,
        importedAt: dataset.provenance.created,
        bounds: dataset.bounds,
        matchBasis: 'Exact product and UTC instant; approximate display-envelope overlap',
        pointSupportVerified: false,
        crs: dataset.crs,
        polarization: dataset.polarization,
        provenance: dataset.provenance,
      })),
    })),
    quantitativeResult: null,
    eventValidation: null,
    limitations: [
      'Local input candidates describe operator-supplied subsets with approximate display-envelope overlap. Native-window containment and valid point support are not verified; source authentication, event validation and completed analysis are not established.',
    ],
  };
}
