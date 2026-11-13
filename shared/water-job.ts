import { z } from 'zod';

/** Durable execution state, distinct from scientific evaluation status. */
export const waterJobRecord = z
  .object({
    version: z.literal(1),
    id: z.string().uuid(),
    created: z.number().finite().nonnegative(),
    updated: z.number().finite().nonnegative(),
    status: z.enum(['running', 'complete', 'failed', 'cancelled']),
    message: z.string().max(3000),
  })
  .strict();
export type WaterJobRecord = z.infer<typeof waterJobRecord>;
