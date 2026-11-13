import { z } from 'zod';

const cells = z
  .number()
  .int()
  .nonnegative()
  .max(1024 * 1024);
const dimension = z.number().int().min(1).max(1024);
const classId = z.enum(['0', '1', '2', '3', '4', '5']);

/** Display contract for the current worker, not a test of scientific accuracy.
 * Pass through provenance fields so exported evidence is never silently stripped.
 */
export const waterResult = z
  .object({
    algorithm: z.literal('sarflow-water-candidates-v1'),
    dataType: z.enum(['calibrated-measurements', 'synthetic-software-fixture']),
    location: z.string().min(1),
    commonValidCells: cells,
    counts: z.record(classId, cells),
    legend: z.record(classId, z.string().min(1)),
    observations: z
      .array(
        z
          .object({
            id: z.string().min(1),
            date: z.string().min(1),
          })
          .passthrough(),
      )
      .min(1)
      .max(30),
    perDateValidCells: z.array(cells).max(30),
    temporalMeansDb: z.array(z.number().finite().nullable()).max(30),
    thresholdBaseline: z.object({ candidateCells: cells }).passthrough(),
    limitations: z.array(z.string()).min(1),
    previews: z
      .array(
        z
          .object({
            file: z.string().regex(/^tile-\d+-\d+\.png$/),
            row: cells,
            col: cells,
            width: dimension,
            height: dimension,
          })
          .passthrough(),
      )
      .max(16),
    outputs: z
      .array(z.enum(['classes', 'reasons', 'anomaly', 'delta', 'baseline', 'target']))
      .min(1)
      .max(6),
    window: z.object({ width: dimension, height: dimension }).passthrough(),
    accuracyEvaluation: z.null(),
    areaKm2: z.null(),
  })
  .passthrough()
  .superRefine((value, context) => {
    const reject = (message: string) => context.addIssue({ code: 'custom', message });
    const total = value.window.width * value.window.height;
    if (Object.values(value.counts).reduce((sum, count) => sum + count, 0) !== total)
      reject('Class counts must cover the whole window, including exclusions.');
    if (
      value.commonValidCells > total ||
      value.perDateValidCells.some((n) => n > total || n < value.commonValidCells)
    )
      reject('Valid-cell counts are inconsistent with the window or common support.');
    if (
      value.perDateValidCells.length !== value.observations.length ||
      value.temporalMeansDb.length !== value.observations.length
    )
      reject('Every observation must have a support count and temporal mean.');
    if (value.temporalMeansDb.some((n) => (value.commonValidCells === 0 ? n !== null : n === null)))
      reject('Temporal means must reflect whether common support exists.');
    if (value.thresholdBaseline.candidateCells > value.commonValidCells)
      reject('Signal-change candidates cannot exceed common support.');
    if (new Set(value.outputs).size !== value.outputs.length) reject('Duplicate output artifacts.');
    if (new Set(value.observations.map((o) => o.id)).size !== value.observations.length)
      reject('Duplicate observation identifiers.');
    for (const tile of value.previews) {
      if (
        tile.row + tile.height > value.window.height ||
        tile.col + tile.width > value.window.width ||
        tile.file !== `tile-${tile.row}-${tile.col}.png`
      )
        reject('Preview tile does not match its window coordinates.');
    }
  });

export type WaterResult = z.infer<typeof waterResult>;

export function parseWaterResult(value: unknown): WaterResult {
  const parsed = waterResult.safeParse(value);
  if (!parsed.success)
    throw Error(
      'Invalid water result. Measurements and exports withheld. Check the processing artifacts before retrying.',
    );
  return parsed.data;
}
