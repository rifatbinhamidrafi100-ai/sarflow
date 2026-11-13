import { useEffect, useRef, useState } from 'react';
import type { discoverWaterReferences } from '../../server/water-reference';
type References = Awaited<ReturnType<typeof discoverWaterReferences>>;
export default function WaterReferenceSearch() {
  const [data, setData] = useState<References | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  return (
    <section className="panel" aria-label="NASA water reference discovery">
      <h2>Find independent water-reference candidates</h2>
      <p>
        Search NASA Earthdata for JPL OPERA optical water products at your study point and dates. No
        NASA API Portal key is needed for this metadata search.
      </p>
      <form
        className="actions"
        onSubmit={async (event) => {
          event.preventDefault();
          active.current?.abort();
          const controller = new AbortController();
          active.current = controller;
          const values = new FormData(event.currentTarget);
          const query = new URLSearchParams();
          for (const key of ['lat', 'lon', 'start', 'end']) query.set(key, String(values.get(key)));
          setBusy(true);
          setError('');
          setData(null);
          try {
            const response = await fetch(`/api/water-references?${query}`, {
              signal: controller.signal,
            });
            const body = await response.json();
            if (!response.ok) throw Error(body.error ?? 'Reference discovery failed');
            if (!controller.signal.aborted) setData(body);
          } catch (cause) {
            if (!controller.signal.aborted)
              setError(cause instanceof Error ? cause.message : 'Reference discovery failed');
          } finally {
            if (!controller.signal.aborted) setBusy(false);
          }
        }}
      >
        <label>
          Reference latitude
          <input name="lat" type="number" step="any" min="-90" max="90" required />
        </label>
        <label>
          Reference longitude
          <input name="lon" type="number" step="any" min="-180" max="180" required />
        </label>
        <label>
          Reference start date
          <input name="start" type="date" required />
        </label>
        <label>
          Reference end date
          <input name="end" type="date" required />
        </label>
        <button disabled={busy}>
          {busy ? 'Searching NASA…' : 'Find NASA reference observations'}
        </button>
      </form>
      {busy && <p role="status">Querying the actual NASA catalogue…</p>}
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p role="status">
            {data.records.length
              ? `${data.records.length} reference candidates returned.`
              : 'No reference candidates matched this point and interval.'}{' '}
            {data.truncated && 'Results are limited to the latest 50; narrow the date interval.'}{' '}
            Evaluation: not performed.
          </p>
          <ul>
            {data.records.map((record) => (
              <li key={record.id}>
                <a href={record.source} target="_blank" rel="noreferrer">
                  {record.title}
                </a>
                <br />
                <time>{record.acquired}</time>
              </li>
            ))}
          </ul>
          <details>
            <summary>Source and reproducibility</summary>
            <p>
              {data.collection} · retrieved {data.retrievedAt}
            </p>
            <ul>
              {data.limitations.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
            <button
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
                );
                const a = document.createElement('a');
                a.href = url;
                a.download = 'sarflow-reference-discovery.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download reference discovery receipt
            </button>
          </details>
        </>
      )}
      <p className="tiny">
        Catalogue candidates are not validation labels. Review acquisition dates, clouds, shadows,
        grid alignment and reference independence before evaluating a SARFlow result.
      </p>
    </section>
  );
}
