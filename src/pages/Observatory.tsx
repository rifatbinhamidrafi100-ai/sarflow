import PlaceObservatory from '../components/PlaceObservatory';
import ExternalReferencePanel from '../components/ExternalReferencePanel';
import { referenceTemporalContext, type ExternalReference } from '../../shared/external-reference';
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  ArrowRight,
  Database,
  Download as DownloadIcon,
  Eye,
  FileText,
  Layers,
  MapPin,
  Pause,
  Play,
  Search,
  ShieldCheck,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { useObservatory } from '../data/observatory';
import { useRadarUpdates } from '../data/useRadarUpdates';
import { appendLiveObservations, updatedSelection } from '../../shared/live-observations';
import { MonitoringStatus } from '../components/MonitoringStatus';
import { loadObservationPixels } from '../components/observationImage';
import { selectionReport, observationDisplayImage } from '../../shared/observatory';
import type { Observatory as ObservatoryArchive, Region } from '../../shared/observatory';
import { date, Download, Empty, External } from '../components/ui';
import './observatory.css';
import Investigation from '../components/Investigation';
import ChangeTracker from '../components/ChangeTracker';
import ArchiveCompare from '../components/ArchiveCompare';
import { visualInvestigation } from '../../shared/investigation';
import '../components/radar-story.css';
import './observatory-workspace.css';
const ObservationMap = lazy(() => import('../components/ObservationMap'));

export default function Observatory() {
  const { data, error, retry } = useObservatory();
  const [params, setParams] = useSearchParams();
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const region =
    data?.regions.find((r) => r.id === params.get('region')) ??
    data?.regions.find((r) => r.id === 'brahmaputra') ??
    data?.regions[0];
  if (error)
    return (
      <Empty title="Real observation archive unavailable" retry={retry}>
        {error} <Link to="/explore">Open the teaching lab</Link>
      </Empty>
    );
  if (!data || !region)
    return (
      <div className="empty" role="status">
        Loading actual NISAR observation archive…
      </div>
    );
  return (
    <>
      <LiveRegion
        key={region.id}
        data={data}
        region={region}
        recentRegions={recentIds
          .map((id) => data.regions.find((r) => r.id === id))
          .filter((r): r is Region => !!r)}
        choose={(id) => {
          if (region && id !== region.id)
            setRecentIds((ids) =>
              [region.id, ...ids.filter((value) => value !== region.id && value !== id)].slice(
                0,
                5,
              ),
            );
          setParams({ region: id });
        }}
      />
      <details className="page obs-supporting-tools">
        <summary>Place evidence record</summary>
        <PlaceObservatory
          latitude={String(region.center[1])}
          longitude={String(region.center[0])}
        />
      </details>
      <details className="page obs-supporting-tools">
        <summary>Processing connection</summary>
        <MonitoringStatus />
      </details>
    </>
  );
}

function LiveRegion({
  data,
  region,
  choose,
  recentRegions,
}: {
  data: ObservatoryArchive;
  region: Region;
  choose: (id: string) => void;
  recentRegions: Region[];
}) {
  const updates = useRadarUpdates(
    String(region.center[1]),
    String(region.center[0]),
    true,
    region.observations.at(-1)!.title.split('_').slice(5, 10).join('_'),
  );
  const [current, setCurrent] = useState(region);
  useEffect(() => {
    if (updates.data)
      setCurrent((previous) => appendLiveObservations(data, previous, updates.data));
  }, [data, updates.data]);
  const merged =
    current === region
      ? data
      : {
          ...data,
          source: 'NASA CMR / NASA GIBS - archive with newly discovered dates',
          regions: data.regions.map((r) => (r.id === region.id ? current : r)),
        };
  return (
    <>
      <details className="page obs-update-details">
        <summary>Observation updates</summary>
        <div role="status">
          <p>
            {updates.busy ? 'Checking NASA for new dates…' : updates.message}{' '}
            {updates.checked && `Last checked: ${new Date(updates.checked).toLocaleString()}.`}
          </p>
          <button disabled={updates.busy} onClick={updates.refresh}>
            Check new dates now
          </button>
        </div>
      </details>
      <RegionWorkspace
        data={merged}
        region={current}
        choose={choose}
        recentRegions={recentRegions}
      />
    </>
  );
}

export type ObservationSelection = { date: string; referenceDate: string | null; status: string };
export function RegionWorkspace({
  data,
  region,
  choose,
  onSelection,
  recentRegions = [],
}: {
  data: ObservatoryArchive;
  region: Region;
  choose: (id: string) => void;
  onSelection?: (selection: ObservationSelection) => void;
  recentRegions?: Region[];
}) {
  const panelId = useId();
  const [locationOpen, setLocationOpen] = useState(true),
    [resultsOpen, setResultsOpen] = useState(true);
  const [index, setIndex] = useState(region.observations.length - 1),
    [reference, setReference] = useState(0);
  const [playing, setPlaying] = useState(false),
    [detailPixels, setDetailPixels] = useState(1536),
    [speed, setSpeed] = useState(1);
  const [studio, setStudio] = useState<'swipe' | 'split' | 'opacity'>('swipe'),
    [lens, setLens] = useState('processed');
  const [compare, setCompare] = useState(false),
    [split, setSplit] = useState(50),
    [opacity, setOpacity] = useState(1),
    [footprint, setFootprint] = useState(false),
    [studyArea, setStudyArea] = useState(true);
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('Loading observations'),
    [point, setPoint] = useState<[number, number] | null>(null),
    [note, setNote] = useState('');
  const [archiveView, setArchiveView] = useState(false);
  const [externalReference, setExternalReference] = useState<ExternalReference | null>(null),
    [referenceFocus, setReferenceFocus] = useState(0);
  const previousIds = useRef(region.observations.map((f) => f.id));
  const ids = region.observations.map((f) => f.id).join(',');
  useEffect(() => {
    const next = region.observations.map((f) => f.id),
      previous = previousIds.current;
    if (previous.join(',') !== next.join(',')) {
      setIndex((i) => updatedSelection(previous, next, i, true));
      setReference((i) => updatedSelection(previous, next, i, false));
      setPlaying(false);
      previousIds.current = next;
    }
  }, [ids, region]);
  const evidence = useRef<HTMLDialogElement>(null);
  const frame = region?.observations[Math.min(index, region.observations.length - 1)];
  const before = region?.observations[Math.min(reference, region.observations.length - 1)];
  const prefetch = useRef<{ controller: AbortController; requested: Set<string> } | null>(null);
  useEffect(() => {
    if (!playing || archiveView) return;
    const session = { controller: new AbortController(), requested: new Set<string>() };
    prefetch.current = session;
    return () => {
      session.controller.abort();
      prefetch.current = null;
    };
  }, [playing, archiveView, region.id]);
  useEffect(() => {
    const session = prefetch.current;
    const next = region.observations[index + 1];
    if (!session || !next || !status.endsWith('imagery loaded')) return;
    const url = observationDisplayImage(next, 384);
    if (session.requested.has(url)) return;
    session.requested.add(url);
    // One next-date preview, only during playback. Errors remain visible if that date is selected.
    void loadObservationPixels(url, session.controller.signal).catch(() => {});
  }, [playing, index, status, region]);
  useEffect(() => {
    onSelection?.({
      date: frame.acquired,
      referenceDate: compare ? before.acquired : null,
      status,
    });
  }, [frame.acquired, before.acquired, compare, status, onSelection]);
  useEffect(() => {
    if (!playing || !status.endsWith('imagery loaded')) return;
    const timer = setTimeout(() => {
      if (index >= region.observations.length - 1) setPlaying(false);
      else {
        setStatus('Loading observation');
        setIndex(index + 1);
      }
    }, 2200 / speed);
    return () => clearTimeout(timer);
  }, [playing, speed, region, index, status]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  const report = {
    ...selectionReport(data, region, reference, index, note, playing ? 384 : detailPixels),
    displayState: status,
    externalMappingReference: externalReference
      ? {
          ...externalReference,
          temporalContext: referenceTemporalContext(
            externalReference,
            before.acquired,
            frame.acquired,
          ),
        }
      : null,
  };
  return (
    <div className="observatory">
      <div className="observatory-header">
        <div>
          <span className="obs-kicker">
            <span />
            NISAR observation workspace
          </span>
          <h1>Earth, in motion.</h1>
        </div>
        <div className="actions">
          <Link
            className="button"
            to={`/world?lat=${region.center[1]}&lon=${region.center[0]}&zoom=16`}
          >
            Satellite photo
          </Link>
          <button onClick={() => evidence.current?.showModal()}>
            <ShieldCheck size={16} />
            Evidence
          </button>
        </div>
      </div>
      <p className="obs-context-note">
        NISAR radar imagery for visual comparison. Flood extent and damage have not been calculated.{' '}
        A quick preview appears first. Pause playback to load your selected detail. For photographic
        context, open Satellite photo. Radar colors and texture are not an optical photograph.
      </p>
      <nav className="obs-panel-toggles" aria-label="Observation workspace panels">
        <button
          aria-expanded={locationOpen}
          aria-controls={`${panelId}-location`}
          onClick={() => setLocationOpen((v) => !v)}
        >
          {locationOpen ? 'Hide location & data' : 'Show location & data'}
        </button>
        <span>Location / Observation / Evidence</span>
        <button
          aria-expanded={resultsOpen}
          aria-controls={`${panelId}-results`}
          onClick={() => setResultsOpen((v) => !v)}
        >
          {resultsOpen ? 'Hide results' : 'Show results'}
        </button>
      </nav>
      <div className="observatory-body" data-location={locationOpen} data-results={resultsOpen}>
        <aside
          id={`${panelId}-location`}
          className="observation-sidebar"
          aria-label="Observation location and data"
          hidden={!locationOpen}
        >
          <div className="obs-sidebar-section">
            <div className="section-heading">
              <h2>Study regions</h2>
              <span className="count-pill">{data.regions.length}</span>
            </div>
            <label className="obs-search">
              <Search size={16} />
              <input
                aria-label="Find a prepared region"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a prepared region"
              />
            </label>
            <div className="region-list">
              {data.regions
                .filter((r) => `${r.name} ${r.country}`.toLowerCase().includes(query.toLowerCase()))
                .map((r) => (
                  <button
                    key={r.id}
                    className={r.id === region.id ? 'selected' : ''}
                    aria-pressed={r.id === region.id}
                    onClick={() => choose(r.id)}
                  >
                    <img
                      src={
                        r.observations.at(-1)!.thumbnail ??
                        observationDisplayImage(r.observations.at(-1)!, 160)
                      }
                      alt=""
                      loading="lazy"
                    />
                    <span>
                      <strong>{r.name}</strong>
                      <small>{r.country}</small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
            </div>
            {!data.regions.some((r) =>
              `${r.name} ${r.country}`.toLowerCase().includes(query.toLowerCase()),
            ) && (
              <p className="tiny">
                No archived region matches. This search covers the prepared archive regions.
              </p>
            )}
          </div>

          {recentRegions.length > 0 && (
            <section className="obs-sidebar-section obs-recent">
              <h2>Recent locations</h2>
              {recentRegions.map((r) => (
                <button key={r.id} onClick={() => choose(r.id)}>
                  {r.name}
                </button>
              ))}
            </section>
          )}
          <section className="obs-sidebar-section">
            <h2>Observation date</h2>
            <label htmlFor={`${panelId}-date`}>Available observations</label>
            <select
              id={`${panelId}-date`}
              aria-label="Selected observation date"
              value={index}
              onChange={(e) => {
                setPlaying(false);
                setIndex(Number(e.target.value));
              }}
            >
              {region.observations.map((f, i) => (
                <option key={f.id} value={i}>
                  {date(f.date)} - {f.acquired.slice(11, 19)} UTC
                </option>
              ))}
            </select>
            <p className="tiny">
              {region.observations.length} available observations. Dates are acquisitions, not live
              updates.
            </p>
          </section>
          <section className="obs-sidebar-section">
            <h2>Available dataset</h2>
            <div className="actual-layer">
              <Database size={18} />
              <div>
                <strong>NISAR L-SAR</strong>
                <small>Radar browse imagery</small>
              </div>
            </div>
            <p className="tiny">
              Processed colors support visual comparison. Calibrated measurement arrays are
              separate.
            </p>
          </section>
          <section className="obs-sidebar-section obs-analysis-options">
            <h2>Analysis options</h2>
            <button
              disabled={index === 0}
              onClick={() => {
                setReference(index - 1);
                setCompare(true);
                setPlaying(false);
                setLens('comparison');
              }}
            >
              Compare previous observation
            </button>
            <Link className="button" to="/water">
              Check calibrated water analysis
            </Link>
            <Link className="button" to="/global-radar">
              Search another location
            </Link>
          </section>
          <details className="obs-advanced">
            <summary>Advanced Settings</summary>
            <Link className="button" to="/explore">
              Numerical analysis lab
            </Link>
            <div className="actions">
              <button
                aria-pressed={archiveView}
                onClick={() => {
                  setPlaying(false);
                  setArchiveView((v) => !v);
                }}
              >
                {archiveView ? 'Return to geographic map' : 'Use archived image viewer'}
              </button>
            </div>
            <div className="obs-sidebar-section">
              <h2>
                <Layers size={16} />
                Observation layers
              </h2>
              <div className="actual-layer">
                <div className="layer-icon">
                  <Database size={19} />
                </div>
                <div>
                  <strong>NISAR L-SAR</strong>
                  <small>GCOV · false-color daily mosaic</small>
                </div>
                <span className="real-pill">Actual</span>
              </div>
              <label className="range-label">
                Radar opacity <strong>{Math.round(opacity * 100)}%</strong>
                <input
                  type="range"
                  aria-label="Radar opacity"
                  disabled={archiveView}
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={archiveView}
                  checked={studyArea}
                  onChange={(e) => setStudyArea(e.target.checked)}
                />
                Study boundary & center
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={archiveView}
                  checked={footprint}
                  onChange={(e) => setFootprint(e.target.checked)}
                />
                Matching granule footprint
              </label>
              <p className="tiny">
                {archiveView
                  ? 'Opacity, footprint and coordinate inspection require the geographic map.'
                  : 'Outline may extend beyond this prepared view.'}
              </p>
            </div>
            <div className="lens-guide">
              <strong>Change Lens</strong>
              <div className="actions">
                <button
                  disabled
                  title="Raw radar samples are not included in this browse collection"
                >
                  Raw observation — unavailable
                </button>
                <button
                  aria-pressed={lens === 'processed' && !compare}
                  onClick={() => {
                    setLens('processed');
                    setCompare(false);
                  }}
                >
                  Processed observation
                </button>
                <button
                  aria-pressed={compare}
                  onClick={() => {
                    setCompare(true);
                    setPlaying(false);
                    setLens('comparison');
                  }}
                >
                  Before / after
                </button>
                <button
                  disabled
                  title="Requires calibrated power arrays; RGB differences are not scientific measurements"
                >
                  Difference — calibrated data required
                </button>
                <button
                  disabled
                  title="No validated detection is available from the displayed RGB imagery"
                >
                  Detected change — unavailable
                </button>
                <button
                  aria-pressed={lens === 'uncertainty'}
                  onClick={() => {
                    setLens('uncertainty');
                    setPlaying(false);
                  }}
                >
                  Uncertainty
                </button>
              </div>
              {lens === 'uncertainty' && (
                <p role="status">
                  Confidence is not estimated. Missing pixels, changing acquisition modes, mosaic
                  composition and environmental conditions can alter the view. Inspect the receipts
                  below; the map remains a processed visualization.
                </p>
              )}
            </div>
            <details className="obs-acquisition-details">
              <summary>Acquisition archive</summary>
              <div className="obs-sidebar-section">
                <div className="section-heading">
                  <h2>Acquisition archive</h2>
                  <span className="count-pill">{region.observations.length}</span>
                </div>
                <div className="acquisition-list">
                  {region.observations.map((f, i) => (
                    <button
                      key={f.id}
                      className={i === index ? 'selected' : ''}
                      aria-pressed={i === index}
                      onClick={() => {
                        setIndex(i);
                        setPlaying(false);
                      }}
                    >
                      <span className="acquisition-dot" />
                      <span>
                        <strong>{date(f.date)}</strong>
                        <small>{f.acquired.slice(11, 19)} UTC · GCOV</small>
                      </span>
                      <span className="tiny">T{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            </details>
            <p className="tiny">
              GCOV false-color daily mosaics. Opacity and outlines change the display; they do not
              measure flood area.
            </p>
            <External href="https://hyp3-docs.asf.alaska.edu/nisar-docs/worldview/">
              Product guide
            </External>
          </details>
        </aside>

        <section className="observation-stage" aria-label="Real NISAR imagery explorer">
          <div className="obs-stage-toolbar">
            <div>
              <MapPin size={16} />
              <strong>{region.name}</strong>
              <span>{region.topic}</span>
            </div>
            <div className="obs-view-modes">
              <label className="obs-detail-control">
                Image detail
                <select
                  aria-label="Radar image detail"
                  value={detailPixels}
                  onChange={(e) => {
                    setPlaying(false);
                    setDetailPixels(Number(e.target.value));
                  }}
                >
                  <option value="1536">Detailed · source size</option>
                  <option value="768">Balanced · 768 px</option>
                  <option value="384">Quick · 384 px</option>
                </select>
              </label>
              <button
                className={!compare ? 'selected' : ''}
                aria-pressed={!compare}
                onClick={() => setCompare(false)}
              >
                <Eye size={15} />
                Observe
              </button>
              <button
                className={compare ? 'selected' : ''}
                aria-pressed={compare}
                onClick={() => {
                  setPlaying(false);
                  setCompare(true);
                }}
              >
                <ArrowLeftRight size={15} />
                Compare
              </button>
            </div>
          </div>
          <div className="obs-map-wrap">
            {archiveView ? (
              <ArchiveCompare
                frame={frame}
                before={before}
                compare={compare}
                split={split}
                mode={studio}
                maxPixels={playing ? 384 : detailPixels}
                onStatus={setStatus}
              />
            ) : (
              <Suspense fallback={<div className="empty">Loading the geographic canvas…</div>}>
                <ObservationMap
                  region={region}
                  frame={frame}
                  detailPixels={playing ? 384 : detailPixels}
                  before={before}
                  compare={compare}
                  mode={studio}
                  split={studio === 'split' ? 50 : split}
                  opacity={opacity}
                  footprint={footprint}
                  studyArea={studyArea}
                  onStatus={(next) => {
                    setStatus(next);
                    if (next.endsWith('unavailable')) setPlaying(false);
                  }}
                  onPrevious={
                    index > 0
                      ? () => {
                          setPlaying(false);
                          setIndex((value) => value - 1);
                        }
                      : undefined
                  }
                  onPoint={setPoint}
                  referenceData={externalReference}
                  referenceFocus={referenceFocus}
                />
              </Suspense>
            )}
            <div className="obs-image-label">
              <span className="real-pill">
                {status === 'Browse coverage unavailable'
                  ? 'No browse pixels for this date'
                  : 'Actual NISAR imagery'}
              </span>
              <strong key={`${frame.id}-${compare}`}>
                {compare ? `${date(before.date)} / ${date(frame.date)}` : date(frame.date)}
              </strong>
              <span>False-color visualization · not optical imagery</span>
            </div>
            <div className="obs-north" aria-hidden="true">
              N ↑
            </div>
            <div className="obs-coordinates">
              {archiveView
                ? `Archived bounds: ${region.bounds.join(', ')}`
                : point
                  ? `${point[1].toFixed(5)}°, ${point[0].toFixed(5)}°`
                  : 'Click anywhere on the map to inspect coordinates'}
            </div>
          </div>
          {compare && (
            <div className="real-compare-controls">
              <label>
                Studio mode
                <select
                  aria-label="Comparison studio mode"
                  value={studio}
                  onChange={(e) => setStudio(e.target.value as typeof studio)}
                >
                  <option value="swipe">Swipe</option>
                  <option value="split">Split screen</option>
                  <option value="opacity">Opacity blend</option>
                </select>
              </label>
              <label>
                Reference date
                <select
                  aria-label="Reference acquisition"
                  value={reference}
                  onChange={(e) => setReference(Number(e.target.value))}
                >
                  {region.observations.map((f, i) => (
                    <option key={f.id} value={i}>
                      {date(f.date)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {studio === 'opacity' ? 'After image opacity' : 'Swipe comparison'}
                <input
                  disabled={studio === 'split'}
                  type="range"
                  aria-label="Real imagery swipe"
                  min="0"
                  max="100"
                  value={split}
                  onChange={(e) => setSplit(Number(e.target.value))}
                />
              </label>
              <span className="tiny">
                Left / base: reference date. Right / overlay: selected date.{' '}
                {archiveView ? 'Fixed archived bounds.' : 'Shared zoom and pan.'}
                <br />
                {reference === index
                  ? 'Same acquisition selected on both sides.'
                  : 'Visual comparison only; no numerical detection.'}
              </span>
            </div>
          )}
          <div
            className="obs-play-progress"
            data-running={playing && status.endsWith('imagery loaded')}
            aria-hidden="true"
          >
            <span
              key={`${index}-${playing}-${status}-${speed}`}
              style={{ animationDuration: `${2200 / speed}ms` }}
            />
          </div>
          <div className="observation-timebar">
            <div className="obs-player">
              <button
                aria-label="Previous acquisition"
                disabled={index === 0}
                onClick={() => {
                  setPlaying(false);
                  setIndex(index - 1);
                }}
              >
                <SkipBack size={16} />
              </button>
              <button
                className="primary"
                aria-label={playing ? 'Pause observations' : 'Play observations'}
                onClick={() => {
                  if (!playing && index === region.observations.length - 1) setIndex(0);
                  setCompare(false);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button
                aria-label="Next acquisition"
                disabled={index === region.observations.length - 1}
                onClick={() => {
                  setPlaying(false);
                  setIndex(index + 1);
                }}
              >
                <SkipForward size={16} />
              </button>
              <select
                aria-label="Observation playback speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value="0.5">0.5×</option>
                <option value="1">1×</option>
                <option value="2">2×</option>
              </select>
            </div>
            <div className="real-timeline">
              <input
                type="range"
                aria-label="Real acquisition timeline"
                min="0"
                max={region.observations.length - 1}
                value={index}
                onChange={(e) => {
                  setPlaying(false);
                  setIndex(Number(e.target.value));
                }}
              />
              <div>
                {region.observations.map((f, i) => (
                  <button
                    key={f.id}
                    className={i === index ? 'selected' : ''}
                    onClick={() => {
                      setPlaying(false);
                      setIndex(i);
                    }}
                  >
                    {date(f.date)}
                  </button>
                ))}
              </div>
            </div>
            <span className="obs-frame-number">
              {index + 1}
              <small>/ {region.observations.length}</small>
            </span>
          </div>
          <div className="observation-status">
            <span role="status">
              <i />
              {status}
            </span>
            <span>
              NASA GIBS / ASF · {frame.sha256 ? 'archived' : 'queried'}{' '}
              {date(frame.retrieved ?? data.retrieved)}
            </span>
            <button onClick={() => evidence.current?.showModal()}>
              View processing & source
              <FileText size={13} />
            </button>
          </div>
        </section>
        <aside
          id={`${panelId}-results`}
          className="obs-results"
          aria-label="Observation results"
          hidden={!resultsOpen}
        >
          <span className="tiny">RESULTS</span>
          <h2>{region.name}</h2>
          <p>{region.country}</p>
          <dl className="obs-result-facts">
            <div>
              <dt>Observation date (UTC)</dt>
              <dd>
                <time dateTime={frame.acquired}>
                  {date(frame.date)}
                  <span>{frame.acquired.slice(11, 19)} UTC</span>
                </time>
              </dd>
            </div>
            <div>
              <dt>Analysis status</dt>
              <dd>View status: {status}</dd>
            </div>
            <div>
              <dt>Estimated inundated area</dt>
              <dd>Not calculated</dd>
            </div>
            <div>
              <dt>Reference observation (UTC)</dt>
              <dd>
                {compare ? (
                  <time dateTime={before.acquired}>
                    {date(before.date)}
                    <span>{before.acquired.slice(11, 19)} UTC</span>
                  </time>
                ) : (
                  'Select Compare to choose a reference'
                )}
              </dd>
            </div>
            <div>
              <dt>Comparison</dt>
              <dd>
                {compare
                  ? reference === index
                    ? 'Same observation on both sides'
                    : 'Visual comparison only'
                  : 'Single observation'}
              </dd>
            </div>
          </dl>
          <section className="obs-quality">
            <h3>Data quality & limitations</h3>
            <p>
              Processed radar colors cannot be converted into calibrated backscatter measurements.
            </p>
            <p>No flood cause, damage or detection accuracy is established by this view.</p>
            <p>Blue marker: study center. Dashed boundary: image extent, not detected flooding.</p>
            <details>
              <summary>Source, coverage & interpretation</summary>
              <p>{region.description}</p>
              <p>
                Blue point: study center. Dashed boundary: prepared image extent, not a detected
                hazard. Prepared view bounds: {region.bounds.join(', ')}. Gaps in imagery are not
                evidence of no change.
              </p>
              <ul>
                {data.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <button onClick={() => evidence.current?.showModal()}>
                View processing & source
                <FileText size={13} />
              </button>
            </details>
            {region.id === 'nepal-rasuwa' && (
              <p>
                Reported event: 26 August 2026.{' '}
                <Link to="/cases/nepal-rasuwa-2026">Event reports & limitations</Link>
              </p>
            )}
          </section>
          <article>
            <h3>Investigation notes</h3>
            <label className="sr-only" htmlFor="observation-note">
              Your visual interpretation
            </label>
            <textarea
              id="observation-note"
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe what you notice. What additional evidence would you need?"
            />
            <div className="actions">
              <Download
                label="Export investigation"
                name={`sarflow-${region.id}-investigation.json`}
                value={{ ...report, inspectedCoordinate: point }}
              />
              <span className="tiny">
                Includes source URLs, image hashes, dates, and your note.
              </span>
            </div>
          </article>
        </aside>
      </div>
      <details className="obs-supporting-tools">
        <summary>Investigation summary & exports</summary>
        <ChangeTracker
          region={region}
          before={reference}
          after={index}
          onCompare={(a, b) => {
            setPlaying(false);
            setReference(a);
            setIndex(b);
            setCompare(true);
            setLens('comparison');
          }}
        />
      </details>
      {region.id === 'nepal-rasuwa' && (
        <ExternalReferencePanel
          before={before.acquired}
          after={frame.acquired}
          mapAvailable={!archiveView}
          onLayerChange={setExternalReference}
          onFocus={() => setReferenceFocus((v) => v + 1)}
        />
      )}
      <details className="obs-supporting-tools">
        <summary>Change evidence & receipts</summary>
        <Investigation value={visualInvestigation(data, region, reference, index)} />
      </details>
      <dialog
        ref={evidence}
        className="evidence observation-evidence"
        aria-labelledby="real-evidence-title"
      >
        <div className="drawer-head">
          <ShieldCheck />
          <h2 id="real-evidence-title">Real observation evidence</h2>
          <button aria-label="Close observation evidence" onClick={() => evidence.current?.close()}>
            <X size={20} />
          </button>
        </div>
        <span className="badge observed">
          {frame.sha256 ? 'ARCHIVED NISAR VISUALIZATION' : 'ON-DEMAND NISAR VISUALIZATION'}
        </span>
        <dl className="metadata">
          <dt>Source</dt>
          <dd>{data.source}</dd>
          <dt>Collection</dt>
          <dd>{data.collection}</dd>
          <dt>Acquisition</dt>
          <dd>{frame.acquired}</dd>
          <dt>Matching granule</dt>
          <dd>{frame.id}</dd>
          <dt>Product identifier</dt>
          <dd>{frame.title}</dd>
          <dt>Display layer</dt>
          <dd>{data.layer}</dd>
          <dt>Requested bounds</dt>
          <dd>{region.bounds.join(', ')}</dd>
          <dt>Display raster</dt>
          <dd>
            {new URL(frame.request).searchParams.get('WIDTH')} ×{' '}
            {new URL(frame.request).searchParams.get('HEIGHT')} PNG · geographic WMS
          </dd>
          <dt>SHA-256</dt>
          <dd>{frame.sha256 ?? 'Not captured · on-demand NASA image'}</dd>
        </dl>
        <p>
          Source → calibrated GCOV products → NASA false-color daily mosaic → bounded WMS image →
          geographic display. No quantitative change is computed from PNG values.
        </p>
        <h3>Interpretation limits</h3>
        <ul>
          {data.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className="evidence-source-links">
          <External href={frame.source}>Matching NASA CMR record</External>
          <External href={frame.request}>Exact NASA image request</External>
          <External href={region.query}>Reproduce catalog search</External>
          <a href={frame.image} download>
            <DownloadIcon size={15} />
            Download original archived PNG
          </a>
        </div>
        <div className="actions">
          <Download
            label="Export observation evidence"
            name={`sarflow-${region.id}-evidence.json`}
            value={report}
          />
        </div>
      </dialog>
    </div>
  );
}
