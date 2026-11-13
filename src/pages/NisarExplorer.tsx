import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { asfResultSchema, type AsfResult } from '../../shared/asf-discovery';
import { Download, External } from '../components/ui';
import './nisar-explorer.css';
import AsfFootprintMap from '../components/AsfFootprintMap';

export default function NisarExplorer() {
  const [params] = useSearchParams();
  const [lat, setLat] = useState(params.get('lat') ?? '25.15');
  const [lon, setLon] = useState(params.get('lon') ?? '89.8');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [result, setResult] = useState<AsfResult | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function search() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    setResult(null);
    setSelected('');
    try {
      const response = await fetch(
        `/api/asf-discovery?${new URLSearchParams({ lat, lon, start, end })}`,
        {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
        },
      );
      const body = await response.json();
      if (!response.ok) throw Error(body.error ?? 'Search unavailable.');
      const data = asfResultSchema.parse(body);
      if (
        data.query.lat !== Number(lat) ||
        data.query.lon !== Number(lon) ||
        data.query.start !== start ||
        data.query.end !== end
      )
        throw Error('The returned search does not match your request. Retry.');
      if (!controller.signal.aborted) {
        setResult(data);
        setSelected(data.records[0]?.id ?? '');
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : 'Search failed. Retry.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const record = result?.records.find((r) => r.id === selected);
  return (
    <section className="page nisar-explorer">
      <header>
        <span className="tiny">Explore. Understand. Investigate.</span>
        <h1>NISAR Explorer</h1>
        <p>
          Find real radar products through ASF. Understand what they contain before starting an
          investigation.
        </p>
      </header>
      <nav className="nisar-paths" aria-label="Choose your experience">
        <Link to="/world">
          <strong>Explore Earth</strong>
          <span>Find a place and compare radar previews.</span>
        </Link>
        <Link to="/getting-started">
          <strong>Understand the data</strong>
          <span>Learn the difference between an image and a measurement.</span>
        </Link>
        <Link to="/water">
          <strong>Investigate water</strong>
          <span>Check local calibrated inputs and processing availability.</span>
        </Link>
      </nav>
      <section className="nisar-search" aria-labelledby="asf-heading">
        <h2 id="asf-heading">Discover GCOV products</h2>
        <p>
          NISAR L-band · Level 2 geocoded covariance · ASF Search API. This first integration
          searches GCOV only; it does not promise all NISAR products or S-band access.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <label>
            Latitude
            <input
              type="number"
              step="any"
              min="-84.8"
              max="84.8"
              required
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="any"
              min="-179.8"
              max="179.8"
              required
              value={lon}
              onChange={(e) => setLon(e.target.value)}
            />
          </label>
          <label>
            Start date (UTC)
            <input type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            End date (UTC)
            <input
              type="date"
              required
              min={start || undefined}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? 'Searching ASF…' : 'Search observations'}
          </button>
        </form>
        <p className="tiny">
          Use coordinates from <Link to="/world">the Earth map</Link>. A point search finds
          candidate coverage, not confirmed usable pixels. Up to 50 records per search; narrow the
          dates if the limit is reached.
        </p>
        {busy && (
          <p role="status">
            Checking ASF catalogue metadata. No large science files are being downloaded.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {result && (
          <>
            <p role="status">
              {result.records.length} records for {result.query.lat}°, {result.query.lon}° ·{' '}
              {result.query.start} to {result.query.end} UTC.
            </p>
            <p className="tiny">
              Checked {new Date(result.checkedAt).toUTCString()}. {result.omitted} unsupported,
              duplicate or invalid records omitted.{' '}
              {result.limitReached
                ? 'Result limit reached. Narrow your date range; this is not a complete history.'
                : 'This is a bounded source response, not a guarantee of complete mission coverage.'}
            </p>
            <div className="actions">
              <External href={result.sourceQuery}>Original ASF query</External>
              <Download
                label="Export discovery evidence"
                name="sarflow-asf-discovery.json"
                value={{
                  ...result,
                  kind: 'catalogue-discovery',
                  quantitativeResult: null,
                  limitations: [
                    'Catalogue metadata is not a measurement or a validated event result.',
                    'File access, grid compatibility and quality masks have not been verified.',
                  ],
                }}
              />
            </div>
            {!result.records.length && (
              <p>
                No matching usable GCOV records returned. Try another date range or point; an empty
                result does not prove the area was never observed.
              </p>
            )}
            {!!result.records.length && (
              <div className="nisar-results">
                <AsfFootprintMap result={result} selected={selected} />
                <nav className="asf-timeline" aria-label="Acquisition timeline">
                  {[...result.records].reverse().map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      aria-pressed={r.id === selected}
                      onClick={() => setSelected(r.id)}
                      title={r.id}
                    >
                      <time dateTime={r.acquiredAt}>
                        {r.acquiredAt.slice(0, 10)}
                        <br />
                        {r.acquiredAt.slice(11, 19)} UTC
                      </time>
                    </button>
                  ))}
                </nav>
                <p className="tiny">
                  Actual acquisitions, oldest to newest. Spacing is by observation, not elapsed
                  time. Missing dates are not filled.
                </p>
                <label>
                  Available observations
                  <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                    {result.records.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.acquiredAt} · {r.id}
                      </option>
                    ))}
                  </select>
                </label>
                {record && (
                  <article aria-label="Selected product">
                    <h3>What is this observation?</h3>
                    <p>
                      A geocoded radar covariance product. It can support backscatter investigations
                      with an appropriate method; it is not a ready-made flood map.
                    </p>
                    <dl>
                      <dt>Product identifier</dt>
                      <dd>{record.id}</dd>
                      <dt>Acquired (UTC)</dt>
                      <dd>{record.acquiredAt}</dd>
                      <dt>Source collection / maturity label</dt>
                      <dd>{record.collection ?? 'Not supplied by source'}</dd>
                      <dt>Sensor</dt>
                      <dd>{record.sensor ?? 'Not supplied by source'}</dd>
                      <dt>Polarization</dt>
                      <dd>{record.polarization ?? 'Not supplied by source'}</dd>
                      <dt>Flight direction</dt>
                      <dd>{record.direction ?? 'Not supplied by source'}</dd>
                      <dt>Analysis and independent evaluation</dt>
                      <dd>Not performed by this catalogue search</dd>
                    </dl>
                    <p>
                      If the collection says PROVISIONAL, do not treat that as confirmed event
                      accuracy. Check the product documentation and quality information.
                    </p>
                    {record.accessUrl ? (
                      <External href={record.accessUrl}>
                        Open source science file — Earthdata sign-in may be required
                      </External>
                    ) : (
                      <p>No verified source-file URL supplied.</p>
                    )}
                    <p className="tiny">
                      Science files may be several gigabytes. Opening this link may start a
                      download. SARFlow has not tested your access or downloaded this file.
                    </p>
                    <details>
                      <summary>Explain radar terms to me</summary>
                      <dl>
                        <dt>Backscatter</dt>
                        <dd>
                          How strongly the surface returns radar energy. Bright or dark does not
                          identify a cause by itself.
                        </dd>
                        <dt>Polarization</dt>
                        <dd>
                          The orientation of transmitted and received radar signals. Different
                          channels reveal different scattering responses.
                        </dd>
                        <dt>Geocoded</dt>
                        <dd>Placed on a geographic grid so it can be mapped.</dd>
                        <dt>Coherence and interferometry</dt>
                        <dd>
                          Ways to compare related radar signals and phase. They require suitable
                          products and processing; this GCOV search does not calculate displacement.
                        </dd>
                      </dl>
                    </details>
                  </article>
                )}
              </div>
            )}
          </>
        )}
      </section>
      <section className="nisar-search">
        <h2>ASF tools, with clear boundaries</h2>
        <div className="nisar-paths">
          <article>
            <h3>Discover</h3>
            <p>This page queries ASF Search API. Vertex is ASF’s own map-based catalogue.</p>
            <External href="https://search.asf.alaska.edu/">Open Vertex</External>
          </article>
          <article>
            <h3>Understand</h3>
            <p>
              Inspect the product guide and maturity information before selecting a scientific
              method.
            </p>
            <External href="https://nisar-docs.asf.alaska.edu/">NISAR data guide</External>
          </article>
          <article>
            <h3>Process</h3>
            <p>
              HyP3 is a separate processing service. SARFlow does not submit HyP3 jobs or claim
              NISAR workflow support through it.
            </p>
            <External href="https://hyp3-docs.asf.alaska.edu/">HyP3 supported workflows</External>
          </article>
        </div>
        <p>
          Want to practice first? <Link to="/explore">Open the labelled teaching lab</Link> or{' '}
          <Link to="/resources">browse official learning resources</Link>.
        </p>
      </section>
    </section>
  );
}
