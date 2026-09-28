import { z } from 'zod';

const label = z.string().trim().min(1).max(160).regex(/^[^\u0000-\u001f<>]*$/);
const timestamp = z.iso.datetime({ offset: true }).nullable();
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const processorStatusSchema = z.object({
  configured: z.literal(true),
  status: z.enum(['ready', 'stale']),
  checkedAt: timestamp,
  nextCheckAt: timestamp,
  collections: z.object({ active: label, unreviewed: z.array(label).max(100) }),
  locations: z.array(z.object({
    id: label, name: label, latestAcquisition: timestamp, lastChecked: timestamp,
    state: label, discovered: count, downloaded: count, processed: count,
    message: z.string().max(500),
  })).max(100),
  publication: z.object({ released: count, withheld: count }),
  alerts: z.array(z.object({
    id: label, location: label, date: z.iso.date(),
    classification: z.literal('reference-evaluated new-water candidate'),
    areaKm2: z.number().finite().nonnegative(),
    evaluationDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })).max(100),
});

export const monitoringSchema = z.union([
  z.object({ configured: z.literal(false), status: z.literal('not-configured'),
    message: z.literal('Scheduled processor is not connected.') }),
  processorStatusSchema,
]);
export type MonitoringStatusData = z.infer<typeof monitoringSchema>;
