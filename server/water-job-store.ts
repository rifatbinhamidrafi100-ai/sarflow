import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { waterJobRecord, type WaterJobRecord } from '../shared/water-job.js';

/** Small atomic records for the existing single-process local worker. */
export function saveWaterJob(root: string, record: WaterJobRecord) {
  const data = waterJobRecord.parse(record);
  const directory = path.join(root, data.id);
  const file = path.join(directory, 'job-state.json');
  const temporary = file + '.tmp';
  writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  renameSync(temporary, file);
}

export function recoverWaterJobs(root: string): WaterJobRecord[] {
  if (!existsSync(root)) return [];
  const recovered: WaterJobRecord[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const file = path.join(root, entry.name, 'job-state.json');
    try {
      const info = lstatSync(file);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 8192) continue;
      const record = waterJobRecord.parse(JSON.parse(readFileSync(file, 'utf8')));
      if (record.id !== entry.name) continue;
      if (record.status === 'running') {
        record.status = 'failed';
        record.message =
          'Server restarted during processing. Partial outputs are unavailable; submit a new job.';
        record.updated = Date.now();
        saveWaterJob(root, record);
      }
      recovered.push(record);
    } catch {
      // Corrupt or foreign records never make outputs available.
    }
  }
  return recovered;
}
