import { it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { datasetSchema } from '../shared/schema';

it('accepts the actual importer output through the API contract (synthetic HDF5 software fixtures only)', async () => {
  const root = process.cwd();
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'sarflow-import-api-'));
  const python = path.join(root, '.venv-water', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  try {
    execFileSync(python, [path.join(root, 'tests/create_water_fixture.py'), temporary], { stdio: 'pipe' });
    const input = path.join(temporary, 'data/water-inputs');
    const output = path.join(temporary, 'software-test.json');
    execFileSync(python, [path.join(root, 'scripts/import_gcov.py'), path.join(input, '0.h5'), path.join(input, '1.h5'),
      '--id', 'software-test', '--title', 'Synthetic interoperability test', '--location', 'Software test only',
      '--row', '0', '--col', '0', '--size', '16', '--output', output], { stdio: 'pipe' });
    const dataset = datasetSchema.parse(JSON.parse(await readFile(output, 'utf8')));
    expect(dataset.observations).toHaveLength(2);
    expect(dataset.observations[0].date).toBe('2026-01-01T00:00:00.000Z');
    expect(dataset.observations[0].sourceId).toBe('SYNTHETIC-FIXTURE-0');
  } finally { await rm(temporary, { recursive: true }); }
}, 15000);
