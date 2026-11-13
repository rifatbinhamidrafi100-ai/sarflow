import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { MapPin, Search } from 'lucide-react';
import PlaceObservatory from '../components/PlaceObservatory';
import './my-area.css';

const placesSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number().finite(),
        name: z.string().min(1).max(300),
        country: z.string().max(150).optional(),
        admin1: z.string().max(150).optional(),
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180),
      }),
    )
    .max(100),
});
type Place = z.infer<typeof placesSchema>['results'][number];

export default function MyArea() {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function search() {
    active.current?.abort();
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      setBusy(false);
      setPlaces([]);
      setSelected(null);
      setMessage('Enter at least two letters or characters to find a place.');
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setPlaces([]);
    setSelected(null);
    setMessage('');
    try {
      const response = await fetch(`/api/places?q=${encodeURIComponent(searchTerm)}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (!response.ok) throw Error('Place search is unavailable. Please retry shortly.');
      const parsed = placesSchema.safeParse(await response.json());
      if (!parsed.success)
        throw Error('The place service returned invalid information. Please retry.');
      if (controller.signal.aborted) return;
      setPlaces(parsed.data.results);
      setMessage(
        parsed.data.results.length
          ? 'Choose the correct place below.'
          : 'No matching places. Try a nearby city or choose on the map.',
      );
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(error instanceof Error ? error.message : 'Search unavailable.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const coordinates = selected
    ? new URLSearchParams({
        lat: String(selected.latitude),
        lon: String(selected.longitude),
      }).toString()
    : '';
  const supported =
    selected && Math.abs(selected.latitude) <= 84.8 && Math.abs(selected.longitude) <= 179.8;
  return (
    <section className="page my-area">
      <header>
        <span className="tiny">Explore your community</span>
        <h1>What can we see near you?</h1>
        <p>
          Find a place. Check what satellites have observed. Follow the evidence before drawing a
          conclusion.
        </p>
      </header>
      <form
        className="area-search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label htmlFor="area-place">City, town or region</label>
        <div>
          <input
            id="area-place"
            placeholder="For example, Sylhet"
            required
            minLength={2}
            maxLength={100}
            value={query}
            onChange={(e) => {
              active.current?.abort();
              setBusy(false);
              setQuery(e.target.value);
              setPlaces([]);
              setSelected(null);
              setMessage('');
            }}
          />
          <button className="primary" disabled={busy}>
            <Search size={18} aria-hidden="true" />
            {busy ? 'Searching…' : 'Find my area'}
          </button>
        </div>
      </form>
      <p role="status">{message}</p>
      <div className="area-places">
        {places.map((p) => (
          <button key={p.id} aria-pressed={selected?.id === p.id} onClick={() => setSelected(p)}>
            <MapPin size={18} aria-hidden="true" />
            <span>
              <strong>{p.name}</strong>
              <small>
                {[p.admin1, p.country].filter(Boolean).join(', ')} · {p.latitude.toFixed(4)}°,{' '}
                {p.longitude.toFixed(4)}°
              </small>
            </span>
          </button>
        ))}
      </div>
      {!selected && (
        <p>
          Prefer a map? <Link to="/world">Explore Earth and choose a location</Link>.
        </p>
      )}
      {selected && (
        <section className="area-selected" aria-label="Selected area">
          <h2>{selected.name}</h2>
          <p>
            {selected.latitude}°, {selected.longitude}° · Confirm these coordinates match the place
            you mean.
          </p>
          <div className="area-status-grid">
            <article>
              <h3>Satellite evidence</h3>
              <p>
                Check actual acquisition dates below. A catalogue match does not guarantee usable
                measurements.
              </p>
            </article>
            <article>
              <h3>Change assessment</h3>
              <p>
                Not calculated for this selection. Preview images alone cannot establish flooding or
                damage.
              </p>
            </article>
            <article>
              <h3>Official warnings</h3>
              <p>Not retrieved by SARFlow. This page has not assessed whether your area is safe.</p>
            </article>
          </div>
          <div className="actions">
            <Link className="button" to={`/world?${coordinates}&zoom=10`}>
              Open area on map
            </Link>
            {supported && (
              <Link className="button" to={`/nisar-explorer?${coordinates}`}>
                Browse source products
              </Link>
            )}
          </div>
          {supported ? (
            <PlaceObservatory
              key={coordinates}
              latitude={String(selected.latitude)}
              longitude={String(selected.longitude)}
            />
          ) : (
            <p role="status">
              This location is outside the current catalogue search bounds. Use the Earth map to
              explore it.
            </p>
          )}
        </section>
      )}
      <aside className="area-explainer">
        <h2>Three things to check</h2>
        <ol>
          <li>
            <strong>When?</strong> Acquisition time tells you when the satellite observed the area,
            not what is happening right now.
          </li>
          <li>
            <strong>What?</strong> A radar image is a measurement visualization. A change needs
            compatible inputs and a documented method.
          </li>
          <li>
            <strong>How reliable?</strong> Check excluded areas, independent evidence and
            limitations. No data does not mean no danger.
          </li>
        </ol>
        <Link to="/getting-started">Learn how to read the evidence</Link>
      </aside>
    </section>
  );
}
