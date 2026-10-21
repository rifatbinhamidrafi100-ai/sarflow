import { z } from 'zod';
import {
  buildEvidencePackage,
  evidenceParametersSchema,
  type EvidencePackage,
} from './evidence-package';
import { datasetSchema } from './schema';

export const SAVED_KEY = 'sarflow.investigations.v1';
export const MAX_SAVED = 5;
const MAX_BYTES = 4_000_000;
const noteSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(120),
  note: z.string().max(2000),
  hypothesis: z.string().max(1000),
  savedAt: z.iso.datetime(),
  evidence: z.unknown(),
});
export type SavedInvestigation = Omit<z.infer<typeof noteSchema>, 'evidence'> & {
  evidence: EvidencePackage;
};
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const count = z.number().int().min(0).max(65536);
const raster = z.array(z.number().nullable()).max(65536);
const analysisSchema = z
  .object({
    delta: raster,
    before: raster,
    after: raster,
    mask: z.array(z.union([z.literal(-1), z.literal(0), z.literal(1)]).nullable()).max(65536),
    valid: count,
    excluded: count,
    changed: count,
    increase: count,
    decrease: count,
    mean: z.number(),
    areaKm2: z.number().nonnegative().nullable(),
    sensitivity: z.array(z.object({ threshold: z.number(), count }).strict()).length(3),
    histogram: z.array(z.object({ label: z.string().max(50), count }).strict()).length(12),
    threshold: z.number().min(0.5).max(10),
    elapsedMs: z.number().nonnegative(),
  })
  .strict();

export function parseEvidencePackage(raw: unknown): EvidencePackage {
  const parsed = z
    .object({
      schemaVersion: z.literal('1.0.0'),
      dataset: datasetSchema,
      parameters: evidenceParametersSchema,
      result: analysisSchema.nullable(),
      exported: z.iso.datetime(),
    })
    .parse(raw);
  return buildEvidencePackage(parsed.dataset, parsed.parameters, parsed.result, parsed.exported);
}

export function parseSavedInvestigation(raw: unknown): SavedInvestigation {
  const entry = noteSchema.parse(raw);
  return { ...entry, evidence: parseEvidencePackage(entry.evidence) };
}

export function loadInvestigations(storage: StorageLike): SavedInvestigation[] {
  const text = storage.getItem(SAVED_KEY);
  if (text === null) return [];
  if (new TextEncoder().encode(text).length > MAX_BYTES)
    throw Error('Saved investigation storage exceeds the supported size.');
  const envelope = z
    .object({ version: z.literal(1), entries: z.array(noteSchema).max(MAX_SAVED) })
    .parse(JSON.parse(text));
  if (new Set(envelope.entries.map((e) => e.id)).size !== envelope.entries.length)
    throw Error('Duplicate saved investigation identifiers.');
  return envelope.entries.map(parseSavedInvestigation);
}

export function saveInvestigation(
  storage: StorageLike,
  entry: SavedInvestigation,
): SavedInvestigation[] {
  const note = noteSchema.parse(entry),
    evidence = parseEvidencePackage(note.evidence);
  const existing = loadInvestigations(storage),
    found = existing.some((e) => e.id === entry.id);
  if (!found && existing.length >= MAX_SAVED)
    throw Error('Five investigations are already saved. Export your work before adding more.');
  const entries = [{ ...note, evidence }, ...existing.filter((e) => e.id !== note.id)];
  const text = JSON.stringify({ version: 1, entries });
  if (new TextEncoder().encode(text).length > MAX_BYTES)
    throw Error('Saved investigations exceed the 4 MB local limit. Export evidence instead.');
  storage.setItem(SAVED_KEY, text);
  return entries;
}
