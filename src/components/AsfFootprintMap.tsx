import { useEffect, useRef, useState } from 'react';
import * as ml from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { AsfResult } from '../../shared/asf-discovery';

ml.setWorkerUrl(workerUrl);
export default function AsfFootprintMap({
  result,
  selected,
}: {
  result: AsfResult;
  selected: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<ml.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState(0);
  const [opacity, setOpacity] = useState(0.25);
  const record = result.records.find((r) => r.id === selected);
  useEffect(() => {
    if (!container.current) return;
    let m: ml.Map;
    try {
      m = new ml.Map({
        container: container.current,
        center: [0, 20],
        zoom: 1,
        style: {
          version: 8,
          sources: {
            land: {
              type: 'geojson',
              data: '/data/land.json',
              attribution: 'Natural Earth · public domain',
            },
            footprint: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
            point: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
          },
          layers: [
            { id: 'ocean', type: 'background', paint: { 'background-color': '#dce9ef' } },
            {
              id: 'land',
              type: 'fill',
              source: 'land',
              paint: { 'fill-color': '#edf0e9', 'fill-outline-color': '#a6bbc3' },
            },
            {
              id: 'coverage',
              type: 'fill',
              source: 'footprint',
              paint: { 'fill-color': '#167299', 'fill-opacity': 0.25 },
            },
            {
              id: 'outline',
              type: 'line',
              source: 'footprint',
              paint: { 'line-color': '#167299', 'line-width': 3 },
            },
            {
              id: 'location',
              type: 'circle',
              source: 'point',
              paint: {
                'circle-radius': 6,
                'circle-color': '#102f46',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
              },
            },
          ],
        },
      });
    } catch {
      setError('Map unavailable on this device. Source metadata remains available below.');
      return;
    }
    map.current = m;
    m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new ml.ScaleControl(), 'bottom-left');
    m.on('load', () => setReady(true));
    m.on('error', () => setError('A map layer could not load. Use the source metadata below.'));
    const resize = new ResizeObserver(() => m.resize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource('footprint') as ml.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: record?.footprint
        ? [{ type: 'Feature', properties: {}, geometry: record.footprint }]
        : [],
    });
    (m.getSource('point') as ml.GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [result.query.lon, result.query.lat] },
    });
    const bounds = new ml.LngLatBounds(
      [result.query.lon, result.query.lat],
      [result.query.lon, result.query.lat],
    );
    record?.footprint?.coordinates[0].forEach((p) => bounds.extend(p));
    m.fitBounds(bounds, { padding: 40, maxZoom: 8, duration: 0 });
  }, [record, result.query, ready, focus]);
  useEffect(() => {
    if (ready) map.current?.setPaintProperty('coverage', 'fill-opacity', opacity);
  }, [ready, opacity]);
  return (
    <section aria-label="Observation coverage">
      <div className="actions">
        <button type="button" disabled={!ready} onClick={() => setFocus((n) => n + 1)}>
          Fit selected footprint
        </button>
        <label>
          Footprint opacity
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="asf-map" ref={container} aria-label="ASF catalogue footprint map" />
      {error && <p role="alert">{error}</p>}
      <p role="status">
        {record?.footprint
          ? 'Selected source footprint shown in blue.'
          : 'Selected footprint unavailable: missing or unsupported source geometry.'}
      </p>
      <p className="tiny">
        Dark dot: searched point. Blue outline: catalogue coverage, not confirmed valid pixels or
        detected change.
      </p>
    </section>
  );
}
