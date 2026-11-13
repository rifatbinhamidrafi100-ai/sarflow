import { expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { waterEvaluation } from '../shared/water-evaluation';
import { parseWaterResult } from '../shared/water-result';
import { readWaterEvaluation } from '../server/water-evaluation';
import { execFileSync } from 'node:child_process';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
it('accepts the actual Python pipeline and evaluator output without relabelling it observed', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sarflow-python-evaluation-'));
  try {
    const python = path.join(
      process.cwd(),
      '.venv-water',
      process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
    );
    execFileSync(python, ['tests/create_water_evaluation_fixture.py', directory], {
      stdio: 'pipe',
    });
    const evaluated = await readWaterEvaluation(path.join(directory, 'result'));
    const receipt = JSON.parse(await readFile(path.join(directory, 'result/result.json'), 'utf8'));
    expect(parseWaterResult(receipt)).toEqual(receipt);
    expect(evaluated?.status).toBe('software-fixture-only');
    expect(evaluated?.sampleSize).toBe(256);
    expect(evaluated?.confusionMatrix.truePositive).toBe(128);
    expect(evaluated?.confusionMatrix.trueNegative).toBe(128);
  } finally {
    await rm(directory, { recursive: true });
  }
}, 30000);
function fixture() {
  return {
    schemaVersion: '1.0',
    method: 'target-water-pixel-agreement-v1',
    status: 'software-fixture-only',
    createdAt: '2026-01-01T00:00:00Z',
    predictionSha256: hash('fixture'),
    processingReceiptSha256: hash('receipt'),
    reference: {
      source: 'Synthetic labels',
      acquisitionTime: '2026-01-01T00:00:00Z',
      samplingMethod: 'all fixture cells',
      preparationMethod: 'known values',
      limitations: 'Software only',
      independentOfPrediction: true,
      sha256: hash('labels'),
      files: [],
    },
    scope: { bounds: [0, 0, 1, 1], crs: 'EPSG:32646', observations: [] },
    sampleUnit: 'raster pixel',
    sampleSize: 4,
    support: {
      totalCells: 6,
      classifiedCells: 4,
      referenceValidCells: 6,
      evaluatedCells: 4,
      excludedCells: 2,
    },
    confusionMatrix: { truePositive: 1, falsePositive: 1, falseNegative: 1, trueNegative: 1 },
    metrics: { precision: 0.5, recall: 0.5, f1: 0.5, intersectionOverUnion: 1 / 3, accuracy: 0.5 },
    limitations: ['Software fixture, not real accuracy'],
  };
}

it('rejects metrics or counts inconsistent with the confusion matrix', () => {
  const value = fixture();
  expect(waterEvaluation.safeParse(value).success).toBe(true);
  expect(waterEvaluation.safeParse({ ...value, sampleSize: 5 }).success).toBe(false);
  expect(
    waterEvaluation.safeParse({ ...value, support: { ...value.support, classifiedCells: 6 } })
      .success,
  ).toBe(false);
  expect(
    waterEvaluation.safeParse({ ...value, metrics: { ...value.metrics, accuracy: 1 } }).success,
  ).toBe(false);
  expect(
    waterEvaluation.safeParse({ ...value, metrics: { ...value.metrics, accuracy: null } }).success,
  ).toBe(false);
});

it('binds an evaluation to its processing receipt and actual prediction bytes', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sarflow-evaluation-'));
  try {
    expect(await readWaterEvaluation(directory)).toBeNull();
    const value = fixture();
    const receipt = JSON.stringify({
      window: { width: 3, height: 2 },
      observations: [],
      algorithm: 'sarflow-water-candidates-v1',
      dataType: 'synthetic-software-fixture',
      outputHashes: { 'classes.tif': hash('fixture') },
    });
    value.processingReceiptSha256 = hash(receipt);
    await writeFile(path.join(directory, 'result.json'), receipt);
    await writeFile(path.join(directory, 'classes.tif'), 'fixture');
    await writeFile(path.join(directory, 'evaluation.json'), JSON.stringify(value));
    expect((await readWaterEvaluation(directory))?.sampleSize).toBe(4);
    await writeFile(path.join(directory, 'classes.tif'), 'changed');
    await expect(readWaterEvaluation(directory)).rejects.toThrow('prediction checksum');
    await writeFile(path.join(directory, 'classes.tif'), 'fixture');
    await writeFile(path.join(directory, 'result.json'), receipt + ' ');
    await expect(readWaterEvaluation(directory)).rejects.toThrow('another processing receipt');
  } finally {
    await rm(directory, { recursive: true });
  }
});

it('refuses fixture metrics relabelled as observed agreement', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'sarflow-status-'));
  try {
    const value = fixture();
    const receipt = JSON.stringify({
      window: { width: 3, height: 2 },
      observations: [],
      algorithm: 'sarflow-water-candidates-v1',
      dataType: 'synthetic-software-fixture',
    });
    value.processingReceiptSha256 = hash(receipt);
    value.status = 'agreement-computed';
    await writeFile(path.join(directory, 'result.json'), receipt);
    await writeFile(path.join(directory, 'evaluation.json'), JSON.stringify(value));
    await expect(readWaterEvaluation(directory)).rejects.toThrow('status mismatch');
  } finally {
    await rm(directory, { recursive: true });
  }
});
