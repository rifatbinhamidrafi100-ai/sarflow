import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ObservationSelection } from '../pages/Observatory';
import { observatorySchema, type Observatory } from '../../shared/observatory';
import PlaceObservatory from './PlaceObservatory';
const Workspace = lazy(() =>
  import('../pages/Observatory').then((m) => ({ default: m.RegionWorkspace })),
);

export default function LocationInvestigation({
  latitude,
  longitude,
  workspaceTarget,
  onSelection,
}: {
  latitude: string;
  longitude: string;
  workspaceTarget?: HTMLElement | null;
  onSelection?: (selection: ObservationSelection | null) => void;
}) {
  const [data, setData] = useState<Observatory | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('Discover the observations at your selected location.'),
    [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const [catalogRevision, setCatalogRevision] = useState(0);
  useEffect(() => {
    request.current?.abort();
    setData(null);
    setBusy(false);
    setFailed(false);
    onSelection?.(null);
    setMessage('Location selected. Discover observations to continue.');
    return () => request.current?.abort();
  }, [latitude, longitude, onSelection]);
  async function discover() {
    setCatalogRevision((value) => value + 1);
    request.current?.abort();
    const c = new AbortController();
    request.current = c;
    setBusy(true);
    setFailed(false);
    setData(null);
    onSelection?.(null);
    setMessage('Checking NASA for repeated acquisitions…');
    try {
      const r = await fetch(
        `/api/global-radar?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
        { signal: c.signal },
      );
      const body = await r.json();
      if (!r.ok) throw Error(body.error ?? 'Discovery unavailable');
      if (body.empty) {
        setMessage(
          `${body.noObservations ? 'NO OBSERVATION AVAILABLE FOR THIS LOCATION.' : 'NO COMPARABLE OBSERVATION PAIR AVAILABLE.'} ${body.message}`,
        );
        return;
      }
      const archive = observatorySchema.parse(body);
      setData(archive);
      setMessage(
        `${archive.regions[0].observations.length} acquisition dates found. Select a date, compare its previous observation, then inspect the evidence.`,
      );
    } catch (e) {
      if (!c.signal.aborted) {
        setFailed(true);
        setMessage(e instanceof Error ? e.message : 'Discovery failed. Retry.');
      }
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  }
  const workspace = data && (
    <Suspense fallback={<p role="status">Loading observation workspace…</p>}>
      <Workspace
        key={`${data.retrieved}-${latitude}-${longitude}`}
        data={data}
        region={data.regions[0]}
        choose={() => {}}
        onSelection={onSelection}
      />
    </Suspense>
  );
  return (
    <section
      id="location-investigation"
      className="location-investigation"
      aria-label="Selected location investigation"
    >
      <header>
        <div>
          <h3>Observation investigation</h3>
        </div>
        <button className="primary" disabled={busy} onClick={() => void discover()}>
          {busy
            ? 'Finding observations…'
            : failed
              ? 'Retry observation discovery'
              : 'Discover observations here'}
        </button>
      </header>
      <p role="status">{message}</p>
      <PlaceObservatory
        latitude={latitude}
        longitude={longitude}
        revision={catalogRevision}
        compact
      />
      {data && workspaceTarget && (
        <a className="button" href="#world-observation-comparison">
          Open observation comparison ↓
        </a>
      )}
      {workspaceTarget
        ? createPortal(<div id="world-observation-comparison">{workspace}</div>, workspaceTarget)
        : workspace}
    </section>
  );
}
