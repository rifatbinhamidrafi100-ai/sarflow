import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as ml from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Download, External } from '../components/ui';
import { useObservatory } from '../data/observatory';
import './world.css';
import { exportEarth } from '../components/exportEarth';
import WorldLayers, { type WorldObservationState } from '../components/WorldLayers';
import LocationInvestigation from '../components/LocationInvestigation';
import type { ObservationSelection } from './Observatory';
ml.setWorkerUrl(workerUrl);
const tile = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg';
const attribution =
  '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2024) · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>';
type Place = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};
export default function World() {
  const [hd, setHd] = useState(true),
    [exporting, setExporting] = useState(false),
    [exportMessage, setExportMessage] = useState('');
  const [leftOpen, setLeftOpen] = useState(true),
    [rightOpen, setRightOpen] = useState(true);
  const [recent, setRecent] = useState<{ name: string; latitude: number; longitude: number }[]>([]);
  const [selection, setSelection] = useState<ObservationSelection | null>(null);
  const [observation, setObservation] = useState<WorldObservationState | null>(null);
  const [workspaceTarget, setWorkspaceTarget] = useState<HTMLDivElement | null>(null);
  const camera = useRef<{
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
    globe: boolean;
  } | null>(null);
  const stage = useRef<HTMLElement>(null);
  const container = useRef<HTMLDivElement>(null),
    map = useRef<ml.Map | null>(null),
    request = useRef<AbortController | null>(null);
  const [attempt, setAttempt] = useState(0),
    [status, setStatus] = useState('Loading world imagery'),
    [error, setError] = useState(''),
    [globe, setGlobe] = useState(true),
    [ready, setReady] = useState(false);
  const [query, setQuery] = useState(''),
    [results, setResults] = useState<Place[]>([]),
    [searchStatus, setSearchStatus] = useState(''),
    [searching, setSearching] = useState(false);
  const [lat, setLat] = useState('28'),
    [lon, setLon] = useState('85.3'),
    [coordinateError, setCoordinateError] = useState(''),
    [view, setView] = useState({ longitude: 30, latitude: 20, zoom: 1.4 });
  const [namedLocation, setNamedLocation] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const locationName =
    namedLocation &&
    namedLocation.latitude === Number(lat) &&
    namedLocation.longitude === Number(lon)
      ? namedLocation.name
      : undefined;
  const [nameState, setNameState] = useState('Finding location name...'),
    [nameRetry, setNameRetry] = useState(0);
  const displayedLocation = locationName ?? nameState;
  useEffect(() => {
    if (locationName) return;
    const c = new AbortController();
    setNameState('Finding location name...');
    const timer = setTimeout(() => {
      void fetch(`/api/places/reverse?lat=${lat}&lon=${lon}`, { signal: c.signal })
        .then(async (r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((b) => {
          if (c.signal.aborted) return;
          if (typeof b.name === 'string' && b.name)
            setNamedLocation({ name: b.name, latitude: Number(lat), longitude: Number(lon) });
          else setNameState('No place name available');
        })
        .catch(() => {
          if (!c.signal.aborted) setNameState('Location name unavailable');
        });
    }, 1100);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [lat, lon, locationName, nameRetry]);
  useEffect(() => {
    if (!map.current || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return;
    const el = document.createElement('div');
    el.className = 'world-place-pin';
    el.textContent = displayedLocation;
    const marker = new ml.Marker({ element: el, anchor: 'bottom', offset: [0, -14] })
      .setLngLat([Number(lon), Number(lat)])
      .addTo(map.current);
    return () => {
      marker.remove();
    };
  }, [lat, lon, displayedLocation, ready, hd]);
  const { data } = useObservatory();
  useEffect(() => {
    if (!container.current) return;
    let canceled = false;
    setReady(false);
    setError('');
    setStatus('Loading world imagery');
    let failed = false;
    const timeout = setTimeout(() => {
      if (!canceled) {
        setError('Imagery is taking too long to load. Retry the connection.');
        setStatus('Imagery unavailable');
      }
    }, 20000);
    let m: ml.Map;
    try {
      m = new ml.Map({
        container: container.current,
        center: camera.current?.center ?? [30, 20],
        zoom: camera.current?.zoom ?? 1.4,
        bearing: camera.current?.bearing ?? 0,
        pitch: camera.current?.pitch ?? 0,
        pixelRatio: hd ? Math.min(3, Math.max(2, window.devicePixelRatio)) : 1,
        maxZoom: 14,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        style: {
          version: 8,
          projection: { type: camera.current?.globe === false ? 'mercator' : 'globe' },
          sources: {
            earth: {
              type: 'raster',
              tiles: [tile],
              tileSize: hd ? 128 : 256,
              maxzoom: 14,
              attribution,
            },
          },
          layers: [
            { id: 'ocean', type: 'background', paint: { 'background-color': '#112a3b' } },
            { id: 'earth', type: 'raster', source: 'earth', paint: { 'raster-fade-duration': 0 } },
          ],
        },
      });
    } catch {
      clearTimeout(timeout);
      setError('This browser could not initialize WebGL. Try a WebGL-capable browser.');
      return;
    }
    map.current = m;
    setGlobe(camera.current?.globe ?? true);
    m.addControl(new ml.NavigationControl(), 'top-right');
    m.addControl(new ml.ScaleControl(), 'bottom-left');
    m.on('error', () => {
      failed = true;
      clearTimeout(timeout);
      setReady(false);
      setError('Some imagery tiles could not load. Retry the connection.');
      setStatus('Incomplete imagery');
    });
    m.on('movestart', () => {
      setReady(false);
      setStatus('Loading view');
    });
    m.on('moveend', () => {
      const c = m.getCenter();
      setView({
        longitude: Number(c.wrap().lng.toFixed(5)),
        latitude: Number(c.lat.toFixed(5)),
        zoom: Number(m.getZoom().toFixed(2)),
      });
    });
    m.on('idle', () => {
      clearTimeout(timeout);
      if (!failed) {
        setReady(true);
        setStatus('World imagery loaded');
        setError('');
      }
    });
    m.on('click', (e) => {
      setNamedLocation(null);
      setLat(e.lngLat.lat.toFixed(5));
      setLon(e.lngLat.wrap().lng.toFixed(5));
    });
    return () => {
      canceled = true;
      clearTimeout(timeout);
      camera.current = {
        center: [m.getCenter().lng, m.getCenter().lat],
        zoom: m.getZoom(),
        bearing: m.getBearing(),
        pitch: m.getPitch(),
        globe: (m.getProjection()?.type ?? 'globe') === 'globe',
      };
      m.remove();
      map.current = null;
    };
  }, [attempt, hd]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => map.current?.resize());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function go(latitude: number, longitude: number, zoom = 11, name?: string) {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 85 ||
      Math.abs(longitude) > 180
    ) {
      setCoordinateError(
        'Use latitude −85 to 85 and longitude −180 to 180. Polar caps are outside this map projection.',
      );
      return;
    }
    setCoordinateError('');
    if (name) {
      setNamedLocation({ name, latitude, longitude });
      setRecent((previous) =>
        [
          { name, latitude, longitude },
          ...previous.filter((p) => p.latitude !== latitude || p.longitude !== longitude),
        ].slice(0, 5),
      );
    }
    setLat(String(latitude));
    setLon(String(longitude));
    map.current?.flyTo({
      center: [longitude, latitude],
      zoom,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200,
    });
  }
  async function search() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSearching(true);
    setResults([]);
    setSearchStatus('Searching places');
    try {
      const r = await fetch(`/api/places?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error ?? 'Search unavailable');
      setResults(body.results);
      setSearchStatus(
        body.results.length
          ? 'Select a place below.'
          : 'No places found. Try another name or coordinates.',
      );
    } catch (e) {
      if (!controller.signal.aborted)
        setSearchStatus(e instanceof Error ? e.message : 'Search unavailable');
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }
  function save() {
    const m = map.current;
    if (!m || !ready) return;
    try {
      const original = m.getCanvas(),
        canvas = document.createElement('canvas');
      canvas.width = original.width;
      canvas.height = original.height + 130;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(original, 0, 0);
      ctx.fillStyle = '#112a3b';
      ctx.fillRect(0, original.height, canvas.width, 130);
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(10, Math.min(18, canvas.width / 60))}px sans-serif`;
      [
        'SARFlow · 2024 optical mosaic · not NISAR / not live',
        `Center: ${view.latitude}, ${view.longitude}; zoom ${view.zoom}`,
        'Sentinel-2 cloudless https://s2maps.eu by EOX IT Services GmbH https://eox.at',
        'Contains modified Copernicus Sentinel data 2024 · CC BY-NC-SA 4.0',
        'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      ].forEach((t, i) => ctx.fillText(t, 12, original.height + 23 + i * 23, canvas.width - 24));
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob),
          a = document.createElement('a');
        a.href = url;
        a.download = 'sarflow-world-view.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    } catch {
      setError(
        'Image export failed. The imagery service may not permit canvas export in this browser.',
      );
    }
  }
  return (
    <div className="world-page">
      <header className="world-heading">
        <div>
          <span className="tiny">SARFlow / Earth workspace</span>
          <h1>Explore the whole Earth.</h1>
          <p>Find a place. Choose an observation. Investigate the evidence.</p>
        </div>
        <Link className="button" to="/observatory">
          NISAR time machine
        </Link>
      </header>
      <div className="world-panel-toggles" aria-label="Workspace panels">
        <button
          aria-expanded={leftOpen}
          aria-controls="world-location-panel"
          onClick={() => setLeftOpen((v) => !v)}
        >
          {leftOpen ? 'Hide location panel' : 'Show location panel'}
        </button>
        <span>Drag to explore · click to select a location</span>
        <button
          aria-expanded={rightOpen}
          aria-controls="world-results-panel"
          onClick={() => setRightOpen((v) => !v)}
        >
          {rightOpen ? 'Hide results panel' : 'Show results panel'}
        </button>
      </div>
      <div className="world-workspace" data-left={leftOpen} data-right={rightOpen}>
        <aside
          id="world-location-panel"
          className="world-sidebar"
          aria-label="Location and data"
          hidden={!leftOpen}
        >
          <div className="world-panel-title">
            <span className="tiny">01 / Location & data</span>
            <h2>Find a place</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <label htmlFor="world-search">City or place name</label>
            <div className="world-search">
              <input
                id="world-search"
                value={query}
                minLength={2}
                maxLength={100}
                required
                placeholder="Kathmandu, Nepal"
                onChange={(e) => setQuery(e.target.value)}
              />
              <button disabled={searching}>{searching ? 'Searching…' : 'Search'}</button>
            </div>
          </form>
          <p role="status">{searchStatus}</p>
          <div className="world-results">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  go(p.latitude, p.longitude, 11, [p.name, p.country].filter(Boolean).join(', '))
                }
              >
                {p.name}
                <small>{[p.admin1, p.country].filter(Boolean).join(', ')}</small>
              </button>
            ))}
          </div>
          {recent.length > 0 && (
            <section className="world-recent">
              <h3>Recent locations</h3>
              {recent.map((p) => (
                <button
                  key={`${p.latitude},${p.longitude}`}
                  onClick={() => go(p.latitude, p.longitude, 11, p.name)}
                >
                  {p.name}
                </button>
              ))}
            </section>
          )}
          <section className="world-datasets">
            <h3>Available datasets</h3>
            <div>
              <strong>Sentinel-2 optical mosaic</strong>
              <span>2024 · background context</span>
            </div>
            <div>
              <strong>NISAR radar catalog</strong>
              <span>Dated footprints & observation discovery</span>
            </div>
            <p className="tiny">A catalog record is not a downloaded, calibrated measurement.</p>
          </section>
          <WorldLayers
            locationName={displayedLocation}
            map={map.current}
            archive={data ?? null}
            latitude={Number(lat)}
            longitude={Number(lon)}
            onStateChange={setObservation}
          />
          <details className="world-prepared">
            <summary>Prepared radar investigations</summary>
            {data?.regions.map((r) => (
              <div className="world-study" key={r.id}>
                <button
                  onClick={() =>
                    go(r.center[1], r.center[0], 9, [r.name, r.country].filter(Boolean).join(', '))
                  }
                >
                  {r.name}
                </button>
                <Link to={`/observatory?region=${r.id}`}>Open dated NISAR imagery</Link>
              </div>
            ))}
          </details>
          <section className="world-analysis-options">
            <h3>Analysis options</h3>
            <p>Discover dated observations in Results to compare available imagery.</p>
            <Link className="button" to={`/global-radar?lat=${lat}&lon=${lon}`}>
              Animate radar at this location
            </Link>
          </section>
          <details className="world-advanced">
            <summary>Advanced Settings</summary>
            <p className="tiny">
              Coordinates, map projection, rendering quality and attributed exports.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                go(Number(lat), Number(lon));
              }}
            >
              <div className="world-coordinates">
                <label>
                  Latitude
                  <input
                    aria-label="World latitude"
                    required
                    type="number"
                    step="any"
                    min="-85"
                    max="85"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    aria-label="World longitude"
                    required
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                  />
                </label>
              </div>
              <button>Go to coordinates</button>
            </form>
            {coordinateError && <p role="alert">{coordinateError}</p>}
            <nav className="world-scales" aria-label="Geographic zoom level">
              {[
                ['Country', 4],
                ['Region', 7],
                ['City', 10],
                ['Exact location', 14],
              ].map(([label, zoom]) => (
                <button key={label} onClick={() => go(Number(lat), Number(lon), Number(zoom))}>
                  {label}
                </button>
              ))}
            </nav>
            <div className="world-advanced-actions">
              <button
                onClick={() =>
                  go(
                    Number(
                      ((Math.asin((Math.random() * 2 - 1) * 0.995) * 180) / Math.PI).toFixed(5),
                    ),
                    Number((Math.random() * 359.6 - 179.8).toFixed(5)),
                    5,
                  )
                }
              >
                Drop me anywhere
              </button>
              <button
                aria-pressed={globe}
                onClick={() => {
                  map.current?.setProjection({ type: globe ? 'mercator' : 'globe' });
                  setGlobe(!globe);
                }}
              >
                {globe ? 'Switch to flat map' : 'Switch to globe'}
              </button>
              <label className="world-quality">
                Image quality
                <select
                  aria-label="Earth image quality"
                  value={hd ? 'hd' : 'standard'}
                  disabled={exporting}
                  onChange={(e) => setHd(e.target.value === 'hd')}
                >
                  <option value="hd">HD · finer tiles</option>
                  <option value="standard">Standard · lower data use</option>
                </select>
              </label>
              <button
                disabled={!ready || exporting}
                onClick={async () => {
                  if (!map.current) return;
                  setExporting(true);
                  setExportMessage('Rendering 4K imagery...');
                  try {
                    await exportEarth(map.current);
                    setExportMessage('4K PNG saved with source attribution.');
                  } catch (e) {
                    setExportMessage(e instanceof Error ? e.message : 'Export failed. Retry.');
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                {exporting ? 'Rendering 4K...' : 'Save 4K Earth PNG'}
              </button>
              <button disabled={!ready} onClick={save}>
                Save map PNG
              </button>
              <Download
                label="Export view metadata"
                name="sarflow-world-view.json"
                value={{
                  ...view,
                  projection: globe ? 'globe' : 'mercator',
                  layer: tile,
                  year: 2024,
                  source: 'EOX / Copernicus Sentinel-2',
                  license: 'CC BY-NC-SA 4.0',
                  measurementType: 'Optical visualization, not SAR',
                  quantitativeResult: null,
                }}
              />
            </div>
            <details>
              <summary>Image source & technical details</summary>
              <p>
                Sentinel-2 cloudless 2024 is a multi-acquisition optical mosaic. It is not NISAR, a
                photograph of today, or a flood-detection layer.
              </p>
              <p>
                HD requests finer tiles with at least 2× rendering density. The 4K export renders a
                new map. Zoom is capped at 14; enlargement cannot create ground detail. Polar caps
                and source gaps are not filled.
              </p>
              <External href="https://maps.eox.at/">EOX maps & attribution</External>
              <p>CC BY-NC-SA 4.0 · non-commercial use. Internet required.</p>
            </details>
          </details>
          {!locationName && nameState === 'Location name unavailable' && (
            <button onClick={() => setNameRetry((v) => v + 1)}>Retry location name</button>
          )}
          <p className="tiny">
            Place names:{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap contributors
            </a>
            . Nearest mapped locality, not an exact address.
          </p>
        </aside>
        <section ref={stage} className="world-stage" aria-label="Global satellite map">
          <div className="world-toolbar">
            <span className="world-map-source">Optical context · 2024</span>
            <button
              onClick={() => map.current?.flyTo({ center: [30, 20], zoom: 1.4, duration: 0 })}
            >
              Whole world
            </button>
            <button
              onClick={() => {
                const action = document.fullscreenElement
                  ? document.exitFullscreen()
                  : stage.current?.requestFullscreen();
                void action?.catch(() => setError('Fullscreen is unavailable in this browser.'));
              }}
            >
              Fullscreen map
            </button>
          </div>
          {exportMessage && (
            <p className="world-export-status" role="status">
              {exportMessage}
            </p>
          )}
          <div ref={container} className="world-canvas" />
          <div className="world-location-watermark">{displayedLocation} | SARFlow</div>
          <div className="world-status">
            <span role="status">{status}</span>
            <span>
              {view.latitude}°, {view.longitude}° · zoom {view.zoom}
            </span>
          </div>
          {error && (
            <div className="world-error" role="alert">
              <p>{error}</p>
              <button onClick={() => setAttempt((a) => a + 1)}>Retry world imagery</button>
            </div>
          )}
        </section>
        <aside
          id="world-results-panel"
          className="world-result-panel"
          aria-label="Results"
          hidden={!rightOpen}
        >
          <div className="world-panel-title">
            <span className="tiny">02 / Results</span>
            <h2>Selected location</h2>
          </div>
          <p className="world-selected-place">{displayedLocation}</p>
          <p className="tiny">
            {Number(lat).toFixed(4)}°, {Number(lon).toFixed(4)}°
          </p>
          <LocationInvestigation
            latitude={lat}
            longitude={lon}
            workspaceTarget={workspaceTarget}
            onSelection={setSelection}
          />
          <dl className="world-result-facts">
            <div>
              <dt>Selected observation (UTC)</dt>
              <dd>{selection?.date ?? 'Discover observations first'}</dd>
            </div>
            <div>
              <dt>Analysis status</dt>
              <dd>{selection?.status ?? 'No observation selected'}</dd>
            </div>
            <div>
              <dt>Footprint query date</dt>
              <dd>{observation?.date || 'No date available'}</dd>
            </div>
            <div>
              <dt>Global footprint sample</dt>
              <dd>
                {observation?.busy
                  ? 'Checking catalog…'
                  : observation?.loaded
                    ? `${observation.count} catalog outlines loaded`
                    : 'Not loaded'}
              </dd>
            </div>
            <div>
              <dt>Estimated inundated area</dt>
              <dd>Not calculated</dd>
            </div>
            <div>
              <dt>Reference comparison</dt>
              <dd>{selection?.referenceDate ?? 'No reference selected'}</dd>
            </div>
          </dl>

          <section className="world-limitations">
            <h3>Data quality & limitations</h3>
            <p>
              The globe shows optical context. Catalog outlines indicate where observations may
              exist; they do not confirm usable pixels.
            </p>
            <p>
              Inundation and damage have not been calculated here. Browse-image comparison is visual
              evidence, not a calibrated change measurement.
            </p>
            <details>
              <summary>Understand the layers</summary>
              <p>
                Cyan: catalog footprints. White: prepared studies. Amber: reported Nepal event, not
                a radar detection. Blue: selected location. The background mosaic combines
                acquisitions from 2024.
              </p>
            </details>
          </section>
        </aside>
      </div>
      <div ref={setWorkspaceTarget} className="world-observation-workspace" />
    </div>
  );
}
