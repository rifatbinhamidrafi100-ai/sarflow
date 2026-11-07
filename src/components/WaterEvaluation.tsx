import { useEffect, useState } from 'react';
import { waterEvaluation, type WaterEvaluation as Receipt } from '../../shared/water-evaluation';
import { Download } from './ui';

export function WaterEvaluation({ job }: { job: string }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [message, setMessage] = useState('Checking independent evaluation…');
  useEffect(() => {
    const controller = new AbortController();
    setReceipt(null);
    setMessage('Checking independent evaluation…');
    fetch(`/api/water/jobs/${encodeURIComponent(job)}/evaluation`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error('Evaluation could not be verified. Metrics withheld.');
        const body = await response.json();
        if (controller.signal.aborted) return;
        if (body.status === 'pending' && body.evaluation === null) {
          setMessage(
            'Independent evaluation pending. No reference agreement metrics are available.',
          );
          return;
        }
        const parsed = waterEvaluation.parse(body.evaluation);
        setReceipt(parsed);
        setMessage(
          parsed.status === 'software-fixture-only'
            ? 'Software fixture only — not real-world accuracy.'
            : parsed.status === 'no-evaluable-support'
              ? 'No jointly supported reference pixels.'
              : 'Reference agreement computed — scientific review still required.',
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setMessage(
            error instanceof Error && error.message.startsWith('Evaluation')
              ? error.message
              : 'Invalid evaluation receipt. Metrics withheld.',
          );
      });
    return () => controller.abort();
  }, [job]);
  return (
    <section aria-label="Independent evaluation">
      <h3>Independent evaluation</h3>
      <p role="status">{message}</p>
      {receipt && (
        <>
          <p>
            Reference: {receipt.reference.source}. Acquired: {receipt.reference.acquisitionTime}.
          </p>
          <p>
            Evaluated: {receipt.sampleSize} pixels. Excluded: {receipt.support.excludedCells} of{' '}
            {receipt.support.totalCells} window pixels.
          </p>
          <table>
            <caption>Agreement on supported pixels only</caption>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(receipt.metrics).map(([name, value]) => (
                <tr key={name}>
                  <td>{name === 'intersectionOverUnion' ? 'Intersection over union' : name}</td>
                  <td>{value === null ? 'Undefined' : `${(value * 100).toFixed(2)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <details>
            <summary>Reference method and limitations</summary>
            <p>Sampling: {receipt.reference.samplingMethod}</p>
            <p>Preparation: {receipt.reference.preparationMethod}</p>
            <p>{receipt.reference.limitations}</p>
            <ul>
              {receipt.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              Confusion matrix: TP {receipt.confusionMatrix.truePositive}, FP{' '}
              {receipt.confusionMatrix.falsePositive}, FN {receipt.confusionMatrix.falseNegative},
              TN {receipt.confusionMatrix.trueNegative}.
            </p>
          </details>
          <Download
            label="Export evaluation receipt JSON"
            value={receipt}
            name="sarflow-water-evaluation.json"
          />
        </>
      )}
    </section>
  );
}
