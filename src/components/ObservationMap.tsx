import { useEffect, useRef, useState } from 'react';
import * as ml from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { observationDisplayImage, type Region, type ActualFrame } from '../../shared/observatory';
import { referenceBounds, type ExternalReference } from '../../shared/external-reference';
import { LocateFixed, Maximize2, Minus, Plus } from 'lucide-react';
import { loadObservationPixels, MissingBrowsePixels } from './observationImage';
ml.setWorkerUrl(workerUrl);
type Props = {
  region: Region;
  frame: ActualFrame;
  before: ActualFrame;
  compare: boolean;
  mode?: 'swipe' | 'split' | 'opacity';
  split: number;
  opacity: number;
  footprint: boolean;
  studyArea?: boolean;
  referenceData?: ExternalReference | null;
  referenceFocus?: number;
  onStatus: (status: string) => void;
  onPoint: (p: [number, number]) => void;
  onPrevious?: () => void;
  detailPixels?: number;
};
export default function ObservationMap(props: Props) {
  const root = useRef<HTMLDivElement>(null),
    baseEl = useRef<HTMLDivElement>(null),
    overlayEl = useRef<HTMLDivElement>(null),
    maps = useRef<ml.Map[]>([]),
    latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false),
    [progress, setProgress] = useState(''),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!baseEl.current || !overlayEl.current) return;
    setReady(false);
    setError('');
    props.onStatus('Loading map');
    let canceled = false;
    const made: ml.Map[] = [];
    try {
      for (const container of [baseEl.current, overlayEl.current]) {
        const map = new ml.Map({
          container,
          style: {
            version: 8,
            sources: {
              land: {
                type: 'geojson',
                data: '/data/land.json',
                attribution: 'Natural Earth · NASA GIBS / ASF',
              },
            },
            layers: [
              { id: 'ocean', type: 'background', paint: { 'background-color': '#142734' } },
              {
                id: 'land',
                type: 'fill',
                source: 'land',
                paint: { 'fill-color': '#253b42', 'fill-outline-color': '#526c72' },
              },
            ],
          },
          center: props.region.center,
          zoom: 8,
          attributionControl: { compact: true },
          interactive: made.length === 0,
        });
        made.push(map);
        map.on('error', () => {
          if (!canceled) {
            setError('This observation could not render. Retry the map.');
            latest.current.onStatus('Image unavailable');
          }
        });
      }
    } catch {
      setError('WebGL is unavailable. Open the archived images in the observation list instead.');
      return;
    }
    maps.current = made;
    const [base, over] = made;
    base.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-right');
    base.on('move', () =>
      over.jumpTo({
        center: base.getCenter(),
        zoom: base.getZoom(),
        bearing: base.getBearing(),
        pitch: base.getPitch(),
      }),
    );
    base.on('click', (e) =>
      latest.current.onPoint([Number(e.lngLat.lng.toFixed(5)), Number(e.lngLat.lat.toFixed(5))]),
    );
    Promise.all(
      made.map((m) => new Promise<void>((resolve) => m.once('load', () => resolve()))),
    ).then(() => {
      if (!canceled) setReady(true);
    });
    return () => {
      canceled = true;
      made.forEach((m) => m.remove());
      maps.current = [];
    };
  }, [retry]);
  useEffect(() => {
    if (!ready || !root.current) return;
    const observer = new ResizeObserver(() => {
      for (const map of maps.current) map.resize();
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    const b = props.region.bounds;
    maps.current[0].fitBounds(
      [
        [b[0], b[1]],
        [b[2], b[3]],
      ],
      { padding: 25, duration: 0 },
    );
  }, [ready, props.region.id]);
  useEffect(() => {
    if (!ready) return;
    for (const map of maps.current) {
      const data = props.referenceData;
      if (!data) {
        for (const id of [
          'external-reference-fill',
          'external-reference-line',
          'external-reference-aoi',
        ])
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
        continue;
      }
      if (map.getSource('external-reference')) {
        (map.getSource('external-reference') as ml.GeoJSONSource).setData(data.event);
        (map.getSource('external-reference-aoi') as ml.GeoJSONSource).setData(data.aoi);
      } else {
        map.addSource('external-reference', {
          type: 'geojson',
          data: data.event,
          attribution: 'European Union 2026 · Copernicus EMS EMSR927 · UNESCO IHP-WINS',
        });
        map.addSource('external-reference-aoi', { type: 'geojson', data: data.aoi });
        map.addLayer({
          id: 'external-reference-fill',
          type: 'fill',
          source: 'external-reference',
          paint: { 'fill-color': '#d23796', 'fill-opacity': 0.2 },
        });
        map.addLayer({
          id: 'external-reference-line',
          type: 'line',
          source: 'external-reference',
          paint: { 'line-color': '#f46bc0', 'line-width': 2.5 },
        });
        map.addLayer({
          id: 'external-reference-aoi',
          type: 'line',
          source: 'external-reference-aoi',
          paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [3, 2] },
        });
      }
      for (const id of [
        'external-reference-fill',
        'external-reference-line',
        'external-reference-aoi',
      ])
        map.setLayoutProperty(id, 'visibility', 'visible');
    }
  }, [ready, props.referenceData]);
  useEffect(() => {
    if (!ready || !props.referenceFocus || !latest.current.referenceData) return;
    const b = referenceBounds(latest.current.referenceData);
    maps.current[0]?.fitBounds(
      [
        [b[0], b[1]],
        [b[2], b[3]],
      ],
      { padding: 35, duration: 0 },
    );
  }, [ready, props.referenceFocus]);
  useEffect(() => {
    if (!ready) return;
    const b = props.region.bounds,
      coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
        [b[0], b[3]],
        [b[2], b[3]],
        [b[2], b[1]],
        [b[0], b[1]],
      ];
    let canceled = false;
    const controller = new AbortController();
    props.onStatus('Loading observation');
    setProgress('Loading selected observation preview…');
    setError('');
    const images = [props.compare ? props.before : props.frame, props.frame];
    const pending: (() => void)[] = [];
    const checks = new Map<string, Promise<ImageData>>();
    for (const m of maps.current)
      if (m.getLayer('radar')) m.setLayoutProperty('radar', 'visibility', 'none');
    let generation = 0;
    async function display(maxPixels: number) {
      const phase = ++generation;
      await Promise.all(
        maps.current.map(async (m, i) => {
          const frame = images[i];
          const url = observationDisplayImage(frame, maxPixels);
          if (!checks.has(url)) checks.set(url, loadObservationPixels(url, controller.signal));
          const image = await checks.get(url)!;
          if (canceled || controller.signal.aborted || phase !== generation) return;
          if (!m.getSource('radar')) {
            m.addSource('radar', { type: 'image', coordinates });
            m.addLayer({
              id: 'radar',
              type: 'raster',
              source: 'radar',
              paint: {
                'raster-fade-duration': 0,
                'raster-opacity': props.opacity,
                'raster-resampling': 'linear',
              },
            });
          }
          // Reuse the inspected pixels. A second URL load could fail or briefly
          // display the prior date's texture beneath the new acquisition label.
          (m.getSource('radar') as ml.ImageSource).updateImage({ image, coordinates });
          m.setLayoutProperty('radar', 'visibility', 'visible');
          if (m.getLayer('external-reference-fill'))
            m.moveLayer('radar', 'external-reference-fill');
          const geo = {
            type: 'Feature' as const,
            properties: {},
            geometry: { type: 'Polygon' as const, coordinates: [frame.polygon] },
          };
          if (m.getSource('scene')) (m.getSource('scene') as ml.GeoJSONSource).setData(geo);
          else {
            m.addSource('scene', { type: 'geojson', data: geo });
            m.addLayer({
              id: 'scene',
              type: 'line',
              source: 'scene',
              paint: { 'line-color': '#ffe3a5', 'line-width': 2, 'line-dasharray': [3, 2] },
            });
          }
          await new Promise<void>((resolve, reject) => {
            const finish = () => {
              clearTimeout(timeout);
              m.off('idle', loaded);
              m.off('sourcedata', loaded);
              m.off('error', failed);
            };
            const loaded = () => {
              if (m.isSourceLoaded('radar')) {
                finish();
                resolve();
              }
            };
            const failed = () => {
              finish();
              reject(Error('Image unavailable'));
            };
            const timeout = setTimeout(failed, 30000);
            pending.push(() => {
              finish();
              resolve();
            });
            m.on('idle', loaded);
            m.on('sourcedata', loaded);
            m.on('error', failed);
            queueMicrotask(loaded);
            m.triggerRepaint();
          });
        }),
      );
    }
    let previewVisible = false;
    const detail = props.detailPixels ?? 768;
    (async () => {
      const needsDetail = images.some(
        (frame) => observationDisplayImage(frame, 384) !== observationDisplayImage(frame, detail),
      );
      if (needsDetail) {
        try {
          await display(384);
          if (canceled) return;
          previewVisible = true;
          setProgress('Preview visible · loading full detail…');
          props.onStatus('Preview visible; loading detail');
        } catch (cause) {
          if (!(cause instanceof MissingBrowsePixels)) throw cause;
          // A small preview can miss tiny coverage; inspect the requested detail before declaring a gap.
        }
      }
      await display(detail);
    })()
      .then(() => {
        if (!canceled) {
          setProgress('');
          props.onStatus(
            props.frame.sha256
              ? 'Archived imagery loaded'
              : detail === 384
                ? 'NASA preview imagery loaded'
                : 'NASA imagery loaded',
          );
        }
      })
      .catch((cause) => {
        if (!canceled) {
          controller.abort();
          pending.forEach((cancel) => cancel());
          if (previewVisible) {
            setProgress('Preview retained · requested detail unavailable');
            setError(
              'The preview is available, but the detailed image could not load. Retry the map to request it again.',
            );
            props.onStatus('Preview visible; detail unavailable');
            return;
          }
          setProgress('');
          for (const m of maps.current)
            if (m.getLayer('radar')) m.setLayoutProperty('radar', 'visibility', 'none');
          setError(
            cause instanceof MissingBrowsePixels
              ? cause.message
              : 'The observation image is unavailable. Retry or choose another acquisition.',
          );
          props.onStatus(
            cause instanceof MissingBrowsePixels
              ? 'Browse coverage unavailable'
              : 'Image unavailable',
          );
        }
      });
    return () => {
      canceled = true;
      controller.abort();
      pending.forEach((cancel) => cancel());
    };
  }, [ready, props.region.id, props.frame.id, props.before.id, props.compare, props.detailPixels]);
  useEffect(() => {
    if (!ready) return;
    for (const m of maps.current) {
      if (m.getLayer('radar')) m.setPaintProperty('radar', 'raster-opacity', props.opacity);
      if (m.getLayer('scene'))
        m.setLayoutProperty('scene', 'visibility', props.footprint ? 'visible' : 'none');
    }
  }, [ready, props.opacity, props.footprint, props.frame.id, props.compare]);
  useEffect(() => {
    if (!ready) return;
    const [west, south, east, north] = props.region.bounds;
    const boundary = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    };
    const center = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Point' as const, coordinates: props.region.center },
    };
    for (const map of maps.current) {
      for (const [id, data] of [
        ['study-boundary', boundary],
        ['study-center', center],
      ] as const) {
        const source = map.getSource(id) as ml.GeoJSONSource | undefined;
        if (source) source.setData(data);
        else map.addSource(id, { type: 'geojson', data });
      }
      if (!map.getLayer('study-boundary'))
        map.addLayer({
          id: 'study-boundary',
          type: 'line',
          source: 'study-boundary',
          paint: {
            'line-color': '#ffffff',
            'line-width': 1.5,
            'line-dasharray': [4, 3],
            'line-opacity': 0.8,
          },
        });
      if (!map.getLayer('study-center'))
        map.addLayer({
          id: 'study-center',
          type: 'circle',
          source: 'study-center',
          paint: {
            'circle-color': '#176c97',
            'circle-radius': 5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      for (const id of ['study-boundary', 'study-center'])
        map.setLayoutProperty(id, 'visibility', props.studyArea === false ? 'none' : 'visible');
    }
  }, [ready, props.region, props.studyArea]);
  return (
    <div className="observation-map" ref={root}>
      <div ref={baseEl} className="observation-map-canvas" />
      {progress && (
        <div className="obs-map-progress" role="status">
          {progress}
        </div>
      )}
      <div
        className="observation-map-overlay"
        style={{
          visibility: props.compare ? 'visible' : 'hidden',
          clipPath: props.mode === 'opacity' ? 'none' : `inset(0 0 0 ${props.split}%)`,
          opacity: props.mode === 'opacity' ? props.split / 100 : 1,
        }}
      >
        <div ref={overlayEl} className="observation-map-canvas" />
      </div>
      {props.compare && props.mode !== 'opacity' && (
        <div className="observation-swipe" style={{ left: `${props.split}%` }}>
          <span>↔</span>
        </div>
      )}
      {props.referenceData && (
        <div className="external-reference-map-label">
          <strong>Copernicus optical reference</strong>
          <span>{props.referenceData.referenceObservationDate} · mass movement</span>
          <small>External interpretation, not SARFlow detection</small>
        </div>
      )}
      <div className="obs-map-controls">
        <button aria-label="Zoom in map" onClick={() => maps.current[0]?.zoomIn({ duration: 0 })}>
          <Plus size={17} />
        </button>
        <button aria-label="Zoom out map" onClick={() => maps.current[0]?.zoomOut({ duration: 0 })}>
          <Minus size={17} />
        </button>
        <button
          aria-label="Fit observation"
          onClick={() =>
            maps.current[0]?.fitBounds(
              [
                [props.region.bounds[0], props.region.bounds[1]],
                [props.region.bounds[2], props.region.bounds[3]],
              ],
              { padding: 25, duration: 0 },
            )
          }
        >
          <LocateFixed size={17} />
        </button>
        <button
          aria-label="Fullscreen map"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void root.current?.requestFullscreen();
          }}
        >
          <Maximize2 size={17} />
        </button>
      </div>
      {error && (
        <div className="obs-map-error" role="alert">
          <p>{error}</p>
          {props.onPrevious && (
            <button onClick={props.onPrevious}>Show previous observation</button>
          )}
          <button onClick={() => setRetry((v) => v + 1)}>Retry map</button>
        </div>
      )}
    </div>
  );
}
