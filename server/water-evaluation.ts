import { readFile, lstat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { waterEvaluation } from '../shared/water-evaluation.js';

export async function readWaterEvaluation(directory: string) {
  const evaluationFile = path.join(directory, 'evaluation.json');
  try {
    await lstat(evaluationFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  const info = await lstat(evaluationFile);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 1024 * 1024)
    throw Error('Invalid evaluation file');
  const evaluation = waterEvaluation.parse(JSON.parse(await readFile(evaluationFile, 'utf8')));
  const receipt = await readFile(path.join(directory, 'result.json'));
  if (createHash('sha256').update(receipt).digest('hex') !== evaluation.processingReceiptSha256)
    throw Error('Evaluation belongs to another processing receipt');
  const result = JSON.parse(receipt.toString('utf8'));
  if (
    !Array.isArray(result.observations) ||
    JSON.stringify(
      result.observations.map((item: { id: string; date: string }) => [item.id, item.date]),
    ) !== JSON.stringify(evaluation.scope.observations.map((item) => [item.id, item.date]))
  )
    throw Error('Evaluation observations do not match processing receipt');
  if (
    !Number.isInteger(result.window?.width) ||
    !Number.isInteger(result.window?.height) ||
    result.window.width * result.window.height !== evaluation.support.totalCells
  )
    throw Error('Evaluation window does not match processing receipt');
  if (
    result.algorithm !== 'sarflow-water-candidates-v1' ||
    !['calibrated-measurements', 'synthetic-software-fixture'].includes(result.dataType) ||
    (result.dataType === 'synthetic-software-fixture') !==
      (evaluation.status === 'software-fixture-only')
  )
    throw Error('Evaluation data status mismatch');
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path.join(directory, 'classes.tif')))
    digest.update(chunk);
  if (
    digest.digest('hex') !== evaluation.predictionSha256 ||
    result.outputHashes?.['classes.tif'] !== evaluation.predictionSha256
  )
    throw Error('Evaluation prediction checksum mismatch');
  return evaluation;
}
