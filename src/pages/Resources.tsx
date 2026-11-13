import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Satellite, Layers, Database, Wrench } from 'lucide-react';
import resources from '../data/learning-resources.json';
import './resources.css';
import './getting-started.css';

const types = ['Training', 'StoryMap', 'Webinar', 'Article'];
const findData = [
  {
    title: 'By platform',
    path: '/data/platforms',
    text: 'Browse the missions and instruments that collect Earth observations.',
    Icon: Satellite,
  },
  {
    title: 'By topic',
    path: '/topics',
    text: 'Explore water, land, ice, oceans and other Earth science topics.',
    Icon: Layers,
  },
  {
    title: 'Data catalog',
    path: '/data/catalog',
    text: 'Find NASA datasets and review their coverage and documentation.',
    Icon: Database,
  },
  {
    title: 'Data tools',
    path: '/data/tools',
    text: 'Discover tools for finding, viewing and working with Earth data.',
    Icon: Wrench,
  },
];
export default function Resources() {
  const [params, setParams] = useSearchParams();
  const latestParams = useRef(params);
  useEffect(() => {
    latestParams.current = params;
  }, [params]);
  const query = params.get('q') ?? '',
    type = params.get('type') ?? '';
  const [copyStatus, setCopyStatus] = useState('');
  const filtered = resources.filter(
    (item) =>
      (!types.includes(type) || item.type === type) &&
      `${item.title} ${item.type} ${item.language}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  function update(key: string, value: string) {
    const next = new URLSearchParams(latestParams.current);
    if (value) next.set(key, value);
    else next.delete(key);
    latestParams.current = next;
    setParams(next, { replace: true });
    setCopyStatus('');
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Link copied.');
    } catch {
      setCopyStatus('Copy unavailable. Copy the address from your browser instead.');
    }
  }
  return (
    <div className="page resources-page">
      <header className="resources-heading">
        <div>
          <span className="tiny">Learn / official sources</span>
          <h1>NISAR learning resources</h1>
          <p>
            Build your understanding of radar, find satellite data and learn from NASA Earthdata.
          </p>
        </div>
        <Link className="button" to="/world">
          Back to Earth
        </Link>
      </header>
      <aside className="beginner-entry">
        <Link className="button" to="/nisar-explorer">
          Discover source products with ASF
        </Link>
        <h2>New to SARFlow?</h2>
        <p>
          Learn where to start, what the satellite views mean and how to check the evidence. No
          remote-sensing experience needed.
        </p>
        <Link className="button" to="/getting-started">
          Read the beginner guide
        </Link>
      </aside>
      <p className="resources-source">
        Curated from{' '}
        <a
          href="https://www.earthdata.nasa.gov/data/instruments/l-sar/resources"
          target="_blank"
          rel="noopener noreferrer"
        >
          NASA’s L-SAR resources <ArrowUpRight size={14} />
        </a>{' '}
        · checked 24 October 2026. External learning materials, not SARFlow analysis results.
        SARFlow is not affiliated with or endorsed by NASA.
      </p>
      <section aria-labelledby="learning-heading">
        <div className="resources-section-heading">
          <h2 id="learning-heading">Learn with NASA</h2>
          <a
            href="https://www.earthdata.nasa.gov/data/instruments/l-sar/resources"
            target="_blank"
            rel="noopener noreferrer"
          >
            View all official resources ↗
          </a>
        </div>
        <div className="resource-filters">
          <label>
            Resource type
            <select
              value={types.includes(type) ? type : ''}
              onChange={(event) => update('type', event.target.value)}
            >
              <option value="">All types</option>
              {types.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="resource-search">
            Search resources
            <input
              type="search"
              value={query}
              onChange={(event) => update('q', event.target.value)}
              placeholder="Water, NISAR, Spanish…"
            />
          </label>
          <button
            className="button"
            onClick={() => {
              latestParams.current = new URLSearchParams();
              setParams({}, { replace: true });
              setCopyStatus('');
            }}
          >
            Clear filters
          </button>
          <button className="button" onClick={() => void copyLink()}>
            Copy link
          </button>
        </div>
        <p role="status" className="tiny">
          {filtered.length} of {resources.length} resources{copyStatus ? ` · ${copyStatus}` : ''}
        </p>
        <div className="learning-grid">
          {filtered.map((item) => (
            <article className="learning-card" key={item.url}>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <div className="learning-image">
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                  <span>NASA Earthdata</span>
                </div>
                <div className="learning-card-text">
                  <p className="tiny">
                    {item.type} · {item.language}
                  </p>
                  <h3>{item.title}</h3>
                  <span className="learning-open">
                    Open resource <ArrowUpRight size={16} />
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="notice">
            No resources match these filters. Try another search or clear the filters.
          </p>
        )}
      </section>
      <section aria-labelledby="find-data-heading" className="find-data-section">
        <h2 id="find-data-heading">Find data</h2>
        <p>Continue to NASA Earthdata to explore its wider catalog and tools.</p>
        <div className="find-data-grid">
          {findData.map(({ title, path, text, Icon }) => (
            <a
              key={path}
              href={`https://www.earthdata.nasa.gov${path}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon size={32} aria-hidden="true" />
              <h3>
                {title} <ArrowUpRight size={18} />
              </h3>
              <p>{text}</p>
            </a>
          ))}
        </div>
      </section>
      <aside className="resource-help">
        <div>
          <h2>Have a data question?</h2>
          <p>Ask NASA’s Earthdata community about datasets, access and tools.</p>
        </div>
        <a
          className="button"
          href="https://forum.earthdata.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit Earthdata Forum ↗
        </a>
      </aside>
      <p className="tiny">
        Resource titles and thumbnails: NASA Earthdata. Source pages provide current course dates,
        availability and usage information. Thumbnails load from NASA; cards remain usable if images
        are unavailable.
      </p>
    </div>
  );
}
