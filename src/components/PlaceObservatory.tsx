import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  acquisitionAgeDays,
  localInputCandidatesForRecord,
  placeEvidenceExport,
  placeObservatorySchema,
  type PlaceObservatory as PlaceCatalog,
} from '../../shared/place-observatory';
import { datasetSchema, type Dataset } from '../../shared/schema';
import { Download, External } from './ui';
import './place-observatory.css';

function utc(value: string | null) {
  return value
    ? new Date(value)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, ' UTC')
    : 'Not recorded';
}

export default function PlaceObservatory({
  latitude,
  longitude,
  revision = 0,
  compact = false,
}: {
  latitude: string;
  longitude: string;
  revision?: number;
  compact?: boolean;
}) {
  const heading = useId(),
    key = `${latitude},${longitude}`;
  const [manual, setManual] = useState(0),
    [pagination, setPagination] = useState({ key, page: 1 });
  const page = pagination.key === key ? pagination.page : 1;
  const [state, setState] = useState<{
    key: string;
    catalog: PlaceCatalog;
    datasets: Dataset[];
    inputsChecked: boolean;
  } | null>(null);
  const [selectedId, setSelectedId] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const data = state?.key === key ? state : null;
  useEffect(() => {
    active.current?.abort();
    if (!manual && !revision) return;
    if (
      !latitude.trim() ||
      !longitude.trim() ||
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude)) ||
      Math.abs(Number(latitude)) > 84.8 ||
      Math.abs(Number(longitude)) > 179.8
    ) {
      setBusy(false);
      setError('Enter supported latitude and longitude before checking evidence.');
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]);
    async function load() {
      const results = await Promise.allSettled([
        fetch(
          `/api/place-observatory?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&page=${page}`,
          { signal },
        ).then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw Error(body.error ?? 'Place catalog unavailable');
          return placeObservatorySchema.parse(body);
        }),
        fetch('/api/datasets', { signal }).then(async (response) => {
          if (!response.ok) throw Error('Registered inputs unavailable');
          return datasetSchema.array().parse(await response.json());
        }),
      ]);
      if (controller.signal.aborted) return;
      if (results[0].status === 'rejected') {
        setError(
          results[0].reason instanceof Error
            ? results[0].reason.message
            : 'Place catalog unavailable. Retry.',
        );
      } else {
        const catalog = results[0].value;
        // Reject a mismatched response rather than attaching another place's evidence.
        if (
          catalog.place.latitude !== Number(latitude) ||
          catalog.place.longitude !== Number(longitude) ||
          catalog.page !== page
        ) {
          setError('The source response does not match this place and page. Retry.');
        } else {
          setState({
            key,
            catalog,
            datasets: results[1].status === 'fulfilled' ? results[1].value : [],
            inputsChecked: results[1].status === 'fulfilled',
          });
          setSelectedId(catalog.records.at(-1)?.id ?? '');
        }
      }
      setBusy(false);
    }
    // Wait for coordinate editing to settle, beyond the API's per-client cooldown.
    const timer = setTimeout(() => void load(), 1600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [latitude, longitude, key, page, manual, revision]);
  const catalog = data?.catalog,
    selected =
      catalog?.records.find((record) => record.id === selectedId) ?? catalog?.records.at(-1);
  const inputs =
    selected && data ? localInputCandidatesForRecord(data.catalog, selected, data.datasets) : [];
  const age =
    catalog && selected ? acquisitionAgeDays(selected.acquiredAt, catalog.checkedAt) : null;
  const previous =
    catalog && selected ? catalog.records[catalog.records.indexOf(selected) - 1] : undefined;
  const gap =
    previous && selected ? acquisitionAgeDays(previous.acquiredAt, selected.acquiredAt) : null;
  const nextPage = (value: number) => {
    setPagination({ key, page: value });
  };

  return (
    <section
      className={`place-observatory${compact ? ' place-observatory-compact' : ''}`}
      aria-labelledby={heading}
      aria-busy={busy}
    >
      <header>
        <div>
          <h3 id={heading}>Place Observatory</h3>
          <p>What has actually been observed here?</p>
        </div>
        <button disabled={busy} onClick={() => setManual((value) => value + 1)}>
          {busy
            ? 'Checking evidence…'
            : error
              ? 'Retry place evidence'
              : data
                ? 'Refresh place evidence'
                : 'Load place evidence'}
        </button>
      </header>
      {!data && !busy && !error && (
        <p>
          Load source records for this point, including single observations that cannot yet form a
          comparison.
        </p>
      )}
      {busy && <p role="status">Checking source records and registered numerical inputs…</p>}
      {error && (
        <p role="alert">
          {error}
          {data ? ' Earlier checked evidence remains below.' : ''}
        </p>
      )}
      {catalog && data && (
        <>
          <p className="place-check">
            {catalog.place.latitude.toFixed(4)}°, {catalog.place.longitude.toFixed(4)}° · checked{' '}
            <time dateTime={catalog.checkedAt}>{utc(catalog.checkedAt)}</time>
          </p>
          <p>
            {catalog.records.length} usable catalog records on page {catalog.page}
            {catalog.sourceTotalRecords !== null
              ? ` of ${catalog.sourceTotalRecords} source records`
              : '; source total unavailable'}
            .{' '}
            {catalog.historyComplete
              ? 'All returned records fit on this page.'
              : 'This is a bounded history sample.'}
          </p>
          {catalog.omittedRecords > 0 && (
            <p>
              {catalog.omittedRecords} malformed or duplicate source records omitted on this page.
            </p>
          )}
          {!data.inputsChecked && (
            <p className="notice">
              Registered numerical inputs could not be checked. Their availability is unknown.
            </p>
          )}
          {!catalog.records.length ? (
            <p role="status">
              No usable catalog observations were returned for this point and page. This does not
              establish that no satellite has observed this place.
            </p>
          ) : (
            <div className="place-ledger-grid">
              <div>
                <h4>Acquisition timeline</h4>
                <p className="tiny">
                  Actual times; gaps are preserved. Separate products can share a date.
                </p>
                <ol className="place-timeline" aria-label="Place acquisition records">
                  {catalog.records.map((record) => (
                    <li key={record.id}>
                      <button
                        aria-pressed={record.id === selected?.id}
                        onClick={() => setSelectedId(record.id)}
                      >
                        <time dateTime={record.acquiredAt}>{utc(record.acquiredAt)}</time>
                        <span>{record.id}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
              {selected && (
                <div className="place-record">
                  <h4>Selected source record</h4>
                  <p>
                    {age === null
                      ? 'Acquisition age unavailable.'
                      : `Acquired ${age} full days before this catalog check.`}{' '}
                    This is observation age, not source-publication delay.
                  </p>
                  {gap !== null && (
                    <p>
                      {gap} full days since the previous record in this page. This interval is not a
                      guaranteed revisit schedule.
                    </p>
                  )}
                  <dl>
                    <dt>Sensor / product</dt>
                    <dd>
                      {catalog.source.mission} {catalog.source.sensor} · {catalog.source.product} ·{' '}
                      {catalog.source.processingLevel} · {catalog.source.maturity}
                    </dd>
                    <dt>Variable</dt>
                    <dd>{catalog.source.variable}</dd>
                    <dt>Spatial resolution</dt>
                    <dd>Check the actual product; not verified from this catalog.</dd>
                    <dt>Acquired</dt>
                    <dd>
                      <time dateTime={selected.acquiredAt}>{utc(selected.acquiredAt)}</time>
                    </dd>
                    <dt>Catalog record updated</dt>
                    <dd>{utc(selected.catalogUpdatedAt)}</dd>
                    <dt>First source publication</dt>
                    <dd>Unknown; a catalog update does not establish it.</dd>
                    <dt>Raw download receipt</dt>
                    <dd>Not recorded in this ledger</dd>
                    <dt>Candidate registered subset</dt>
                    <dd>
                      {!data.inputsChecked
                        ? 'Unknown; input check failed'
                        : inputs.length
                          ? `${inputs.map((input) => input.title).join(', ')} — display bounds overlap; point support unverified`
                          : 'No matching registered subset with overlapping display bounds'}
                    </dd>
                    <dt>Analysis receipt</dt>
                    <dd>Not recorded in this ledger</dd>
                    <dt>Event validation</dt>
                    <dd>Not established in this ledger</dd>
                  </dl>
                  <External href={selected.source}>Open original NASA record</External>
                  <details>
                    <summary>Product ID & footprint</summary>
                    <p>{selected.title}</p>
                    <p>{catalog.source.collection}</p>
                    {selected.footprint ? (
                      <p>
                        Catalog outline: {selected.footprint.length} vertices. It describes the
                        product footprint; valid measurement coverage must be checked separately.
                      </p>
                    ) : (
                      <p>No safe simple outline is available for this record.</p>
                    )}
                  </details>
                  {inputs.length > 0 && (
                    <p className="tiny">
                      Subsets are operator supplied. Display bounds approximate the native window;
                      valid pixels at this point require a separate check. Import timestamps,
                      bounds, CRS, polarization and provenance are included in the export.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <nav className="actions" aria-label="Catalog history pages">
            <button
              disabled={busy || catalog.page === 1}
              onClick={() => nextPage(catalog.page - 1)}
            >
              Newer history page
            </button>
            <button
              disabled={busy || catalog.nextPage === null}
              onClick={() => nextPage(catalog.nextPage!)}
            >
              Older history page
            </button>
          </nav>
          <details className="place-readiness">
            <summary>Surface-water investigation readiness</summary>
            <p>
              Start with compatible calibrated observations, review their quality and terrain
              support, then compare against independent dated water/non-water evidence.
            </p>
            <p>
              {data.inputsChecked
                ? `${catalog.records.filter((record) => localInputCandidatesForRecord(catalog, record, data.datasets).length > 0).length} records on this page have a candidate numerical subset with overlapping display bounds; point support is unverified.`
                : 'Local numerical-input readiness is unknown.'}{' '}
              Catalog grouping alone cannot verify a compatible temporal baseline.
            </p>
            <p>
              Calibrated downloads require your manual Earthdata sign-in. Source records can be
              explored without signing in.
            </p>
            <div className="actions">
              <Link className="button" to="/water">
                Open surface-water workflow
              </Link>
              <External href="https://nisar-docs.asf.alaska.edu/earthaccess/">
                Official data-access guide
              </External>
            </div>
          </details>
          <details>
            <summary>Known unknowns & source method</summary>
            <ul>
              {catalog.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              Optical, precipitation, thermal and vegetation adapters have not been connected to
              this ledger. Available evidence differs by place.
            </p>
            <External href={catalog.source.query}>Reproduce this NASA query</External>
          </details>
          <div className="actions">
            <Download
              label="Export place evidence ledger"
              name="sarflow-place-evidence.json"
              value={{
                ...placeEvidenceExport(catalog, data.datasets),
                localInputsChecked: data.inputsChecked,
                ...(!data.inputsChecked ? { localInputCandidates: null } : {}),
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}
