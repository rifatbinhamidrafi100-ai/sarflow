import policy from './collection-policy.json' with { type: 'json' };
export const GCOV_COLLECTION = policy.active;
export const GCOV_LAYER = policy.gibsLayer;
export const COLLECTION_POLICY = policy;

/** CMR metadata may be malformed; never turn an invalid timestamp into a date. */
export function acquisitionDate(value: unknown): string | null {
 if (typeof value !== 'string') return null;
 const day=value.slice(0,10);
 return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(value)) &&
  new Date(day).toISOString().slice(0,10)===day ? day : null;
}
