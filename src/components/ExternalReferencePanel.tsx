import { useEffect, useRef, useState } from 'react';
import {
  externalReferenceSchema,
  referenceBounds,
  referenceRings,
  referenceTemporalContext,
  type ExternalReference,
  type ReferenceGeometry,
} from '../../shared/external-reference';
import { Download, External } from './ui';
import './external-reference.css';

function shapePath(g: ReferenceGeometry) {
  return referenceRings(g)
    .map((ring) => ring.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${-y}`).join(' ') + ' Z')
    .join(' ');
}

export default function ExternalReferencePanel({
  before,
  after,
  mapAvailable = false,
  onLayerChange,
  onFocus,
}: {
  before?: string;
  after?: string;
  mapAvailable?: boolean;
  onLayerChange?: (data: ExternalReference | null) => void;
  onFocus?: () => void;
}) {
  const [data, setData] = useState<ExternalReference | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const [show, setShow] = useState(false),
    [selected, setSelected] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    onLayerChange?.(show && mapAvailable ? data : null);
  }, [show, mapAvailable, data, onLayerChange]);
  async function load() {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/data/references/rasuwa-emsr927.json', { signal: c.signal });
      if (!response.ok) throw Error(`External reference unavailable (HTTP ${response.status}).`);
      const text = await response.text();
      if (new TextEncoder().encode(text).length > 1000000)
        throw Error('Reference exceeds the supported size.');
      const parsed = externalReferenceSchema.parse(JSON.parse(text));
      if (!c.signal.aborted) setData(parsed);
    } catch (e) {
      if (!c.signal.aborted)
        setError(e instanceof Error ? e.message : 'Reference could not be validated.');
    } finally {
      if (!c.signal.aborted) setLoading(false);
    }
  }
  const temporal = data ? referenceTemporalContext(data, before, after) : null;
  const bounds = data ? referenceBounds(data) : null;
  const feature = data?.event.features[selected];
  return (
    <section className="panel external-reference" aria-label="External mapped reference evidence">
      <span className="tiny">External optical interpretation / separate evidence layer</span>
      <h2>Compare with Copernicus mapping</h2>
      <p>
        Inspect the public EMSR927 mapping for Syapru Besi alongside the NISAR observations. The
        source category is <strong>mass movement / landslide</strong>, not a floodwater mask or a
        SARFlow detection.
      </p>
      {!data && (
        <button disabled={loading} onClick={() => void load()}>
          {loading
            ? 'Loading external mapping…'
            : error
              ? 'Retry external mapping'
              : 'Load external mapping'}
        </button>
      )}
      {error && (
        <p className="notice" role="alert">
          {error} No replacement geometry or comparison score is generated.
        </p>
      )}
      {data && bounds && temporal && (
        <>
          <p className="notice">
            External mapping loaded. Not field-validated. Quantitative agreement with NISAR: not
            evaluated.
          </p>
          <dl className="reference-metadata">
            <div>
              <dt>Product</dt>
              <dd>{data.product}</dd>
            </div>
            <div>
              <dt>Reference observation</dt>
              <dd>
                {data.referenceObservationDate} / {data.referenceObservationType}
              </dd>
            </div>
            <div>
              <dt>Reference scope</dt>
              <dd>AOI01 Syapru Besi only / {data.event.features.length} mapped event feature(s)</dd>
            </div>
          </dl>
          <div className="reference-view">
            <svg
              role="img"
              aria-label="Copernicus externally mapped landslide footprint, longitude and latitude coordinates"
              viewBox={`${bounds[0]} ${-bounds[3]} ${bounds[2] - bounds[0]} ${bounds[3] - bounds[1]}`}
            >
              {data.aoi.features.map((f, i) => (
                <path
                  key={`aoi-${i}`}
                  d={shapePath(f.geometry)}
                  fill="#edf1f4"
                  stroke="#596b7c"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={1.5}
                />
              ))}
              {data.event.features.map((f, i) => (
                <path
                  key={`event-${i}`}
                  d={shapePath(f.geometry)}
                  fill="#a6227055"
                  fillRule="evenodd"
                  stroke="#a62270"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={1.5}
                />
              ))}
            </svg>
            <p className="tiny">
              Magenta: source-mapped mass movement. Dashed AOI boundary on the geographic map marks
              the mapped coverage. This preview uses geographic longitude/latitude, not a metric
              distance scale.
            </p>
          </div>
          {onLayerChange && (
            <div className="actions">
              <label>
                <input
                  type="checkbox"
                  checked={show}
                  disabled={!mapAvailable}
                  onChange={(e) => setShow(e.target.checked)}
                />{' '}
                Show external mapping on geographic map
              </label>
              <button disabled={!mapAvailable || !show} onClick={onFocus}>
                Zoom to mapped reference area
              </button>
              {!mapAvailable && (
                <p className="tiny">
                  Return to the geographic map to overlay this layer; the reference preview remains
                  available here.
                </p>
              )}
            </div>
          )}
          <h3>Inspect the mapped feature</h3>
          <div className="actions">
            {data.event.features.map((_, i) => (
              <button key={i} aria-pressed={selected === i} onClick={() => setSelected(i)}>
                Inspect mapped feature {i + 1}
              </button>
            ))}
          </div>
          {feature && (
            <dl className="reference-metadata">
              <div>
                <dt>Source event category</dt>
                <dd>{String(feature.properties.event_type)}</dd>
              </div>
              <div>
                <dt>Source description</dt>
                <dd>{String(feature.properties.obj_desc)}</dd>
              </div>
              <div>
                <dt>Source interpretation method</dt>
                <dd>{String(feature.properties.det_method)}</dd>
              </div>
            </dl>
          )}
          <h3>Dates and comparison limits</h3>
          <p>
            Selected NISAR interval: {before?.slice(0, 10) ?? 'not selected'} to{' '}
            {after?.slice(0, 10) ?? 'not selected'}. External optical observation:{' '}
            {data.referenceObservationDate}.
          </p>
          {temporal.chronologicalPair ? (
            <p>
              By UTC calendar date, the optical source is {temporal.daysAfterBefore} days after the
              selected before observation and {temporal.daysBeforeAfter} days before the selected
              after observation.{' '}
              {temporal.referenceWithinSelectedInterval
                ? 'It falls within this interval.'
                : 'It falls outside this interval.'}
            </p>
          ) : (
            <p>Select a chronological pair before assessing temporal correspondence.</p>
          )}
          <p>{temporal.warning}</p>
          <details>
            <summary>Source provenance and limitations</summary>
            <ul>
              {data.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p>{data.attribution}</p>
            <p>Archived (UTC): {new Date(data.retrieved).toISOString()}</p>
            {data.sources.map((s) => (
              <div key={s.layer}>
                <strong>{s.layer} source archive SHA-256</strong>
                <code>{s.archiveSha256}</code>
                <External href={s.url}>Original public source archive</External>
              </div>
            ))}
          </details>
          <div className="actions">
            <External href={data.sourcePage}>Publisher metadata and interpretation dates</External>
            <External href={data.officialPage}>Copernicus activation</External>
            <External href={data.terms}>Source terms</External>
            <Download
              label="Export external reference evidence"
              value={{ ...data, temporalContext: temporal, sarflowQuantitativeResult: null }}
              name="sarflow-rasuwa-external-reference.json"
            />
          </div>
        </>
      )}
    </section>
  );
}
