import { z } from 'zod';
export const coverageSchema = z.object({
  date: z.string(), retrieved: z.string(), query: z.url(), collection: z.string(),
  total: z.number().int().nonnegative().nullable(), truncated: z.boolean(),
  records: z.array(z.object({id:z.string(), title:z.string(), acquired:z.string(), source:z.url(),
    polygon:z.array(z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)])).min(4)})),
});
export type Coverage = z.infer<typeof coverageSchema>;
