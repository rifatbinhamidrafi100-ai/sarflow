import { z } from 'zod';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const fraction = z.number().min(0).max(1).nullable();

/** Agreement is distinct from scientific validation or probabilistic confidence. */
export const waterEvaluation = z
  .object({
    schemaVersion: z.literal('1.0'),
    method: z.literal('target-water-pixel-agreement-v1'),
    status: z.enum(['software-fixture-only', 'agreement-computed', 'no-evaluable-support']),
    createdAt: z.string().datetime({ offset: true }),
    predictionSha256: hash,
    processingReceiptSha256: hash,
    reference: z.object({
      source: z.string().min(1),
      acquisitionTime: z.string().datetime({ offset: true }),
      samplingMethod: z.string().min(1),
      preparationMethod: z.string().min(1),
      limitations: z.string().min(1),
      independentOfPrediction: z.literal(true),
      sha256: hash,
      files: z.array(z.object({ name: z.string(), sha256: hash })),
    }),
    scope: z.object({
      bounds: z.array(z.number().finite()).length(4),
      crs: z.string().min(1),
      observations: z.array(z.object({ id: z.string(), date: z.string() }).passthrough()),
    }),
    sampleUnit: z.literal('raster pixel'),
    sampleSize: count,
    support: z.object({
      totalCells: count,
      classifiedCells: count,
      referenceValidCells: count,
      evaluatedCells: count,
      excludedCells: count,
    }),
    confusionMatrix: z.object({
      truePositive: count,
      falsePositive: count,
      falseNegative: count,
      trueNegative: count,
    }),
    metrics: z.object({
      precision: fraction,
      recall: fraction,
      f1: fraction,
      intersectionOverUnion: fraction,
      accuracy: fraction,
    }),
    limitations: z.array(z.string()).min(1),
  })
  .superRefine((value, context) => {
    const s = value.support,
      c = value.confusionMatrix;
    const total = c.truePositive + c.falsePositive + c.falseNegative + c.trueNegative;
    const invalid = (message: string) => context.addIssue({ code: 'custom', message });
    if (
      total !== value.sampleSize ||
      total !== s.evaluatedCells ||
      s.excludedCells + total !== s.totalCells ||
      total > s.classifiedCells ||
      total > s.referenceValidCells ||
      total < s.classifiedCells + s.referenceValidCells - s.totalCells ||
      s.classifiedCells > s.totalCells ||
      s.referenceValidCells > s.totalCells
    )
      invalid('Inconsistent evaluation support counts');
    if (
      (value.status === 'agreement-computed' && total === 0) ||
      (value.status === 'no-evaluable-support' && total !== 0)
    )
      invalid('Evaluation status contradicts support');
    const ratio = (n: number, d: number) => (d ? n / d : null);
    const expected = {
      precision: ratio(c.truePositive, c.truePositive + c.falsePositive),
      recall: ratio(c.truePositive, c.truePositive + c.falseNegative),
      f1: ratio(2 * c.truePositive, 2 * c.truePositive + c.falsePositive + c.falseNegative),
      intersectionOverUnion: ratio(
        c.truePositive,
        c.truePositive + c.falsePositive + c.falseNegative,
      ),
      accuracy: ratio(c.truePositive + c.trueNegative, total),
    };
    for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
      const actual = value.metrics[key],
        target = expected[key];
      if (target === null ? actual !== null : actual === null || Math.abs(actual - target) > 1e-10)
        invalid('Metrics do not match confusion matrix');
    }
  });
export type WaterEvaluation = z.infer<typeof waterEvaluation>;
