import { expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { recoverWaterJobs, saveWaterJob } from '../server/water-job-store';
import { waterRouter } from '../server/water';

it('keeps the API available but refuses jobs when storage cannot be enumerated', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sarflow-storage-failure-'));
  mkdirSync(path.join(root, 'artifacts'));
  writeFileSync(path.join(root, 'artifacts/water-jobs'), 'not a directory');
  const server = express().use('/water', waterRouter(root)).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/water`;
    expect((await (await fetch(base + '/inputs')).json()).storageAvailable).toBe(false);
    expect(
      (
        await fetch(base + '/jobs', {
          method: 'POST',
          headers: { origin: 'http://127.0.0.1:5186', 'content-type': 'application/json' },
          body: '{}',
        })
      ).status,
    ).toBe(503);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(root, { recursive: true });
  }
});

it('recovers terminal states, fails interrupted jobs, and ignores corrupt records', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sarflow-recovery-'));
  try {
    for (const status of ['running', 'complete', 'cancelled', 'failed'] as const) {
      const id = randomUUID();
      mkdirSync(path.join(root, id));
      saveWaterJob(root, { version: 1, id, created: 1, updated: 1, status, message: status });
    }
    mkdirSync(path.join(root, 'foreign'));
    writeFileSync(path.join(root, 'foreign/job-state.json'), '{}');
    const recovered = recoverWaterJobs(root);
    expect(recovered).toHaveLength(4);
    expect(recovered.some((j) => j.status === 'running')).toBe(false);
    expect(recovered.filter((j) => j.status === 'failed')).toHaveLength(2);
    expect(recoverWaterJobs(root)).toEqual(recovered);
  } finally {
    rmSync(root, { recursive: true });
  }
});

it('serves a persisted completed result through a new router', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sarflow-restart-api-'));
  const id = randomUUID(),
    outputs = path.join(root, 'artifacts/water-jobs');
  mkdirSync(path.join(outputs, id), { recursive: true });
  saveWaterJob(outputs, {
    version: 1,
    id,
    created: Date.now(),
    updated: Date.now(),
    status: 'complete',
    message: 'Software fixture',
  });
  writeFileSync(
    path.join(outputs, id, 'result.json'),
    JSON.stringify({
      algorithm: 'sarflow-water-candidates-v1', dataType: 'synthetic-software-fixture',
      location: 'Software fixture', commonValidCells: 1,
      counts: { '0': 0, '1': 1, '2': 0, '3': 0, '4': 0, '5': 0 },
      legend: { '0': 'Excluded', '1': 'Persistent', '2': 'New', '3': 'Receding', '4': 'Other', '5': 'Insufficient' },
      observations: [{ id: 'fixture', date: '2026-01-01' }], perDateValidCells: [1], temporalMeansDb: [-25],
      thresholdBaseline: { candidateCells: 0 }, limitations: ['Software test only'],
      previews: [], outputs: ['classes'], window: { width: 1, height: 1 },
      accuracyEvaluation: null, areaKm2: null,
    }),
  );
  const server = express().use('/water', waterRouter(root)).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/water`;
    const response = await fetch(`${base}/jobs/${id}`);
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe('complete');
    expect((await fetch(`${base}/jobs/${id}/files/result.json`)).status).toBe(200);
    expect(await (await fetch(`${base}/jobs/${id}/evaluation`)).json()).toEqual({
      status: 'pending',
      evaluation: null,
    });
    writeFileSync(path.join(outputs, id, 'evaluation.json'), '{"metrics":{"accuracy":1}}');
    expect((await fetch(`${base}/jobs/${id}/evaluation`)).status).toBe(422);
    writeFileSync(path.join(outputs, id, 'result.json'), JSON.stringify({ commonValidCells: -1 }));
    expect((await fetch(`${base}/jobs/${id}`)).status).toBe(422);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(root, { recursive: true });
  }
});
