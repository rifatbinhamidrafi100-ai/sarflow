import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, ExternalLink } from 'lucide-react';
import { useWorkspace } from '../data/Workspace';
import { Badge, Download, External, date } from '../components/ui';
import type { CatalogRecord } from '../../shared/schema';
type Archive = { records: CatalogRecord[]; source: string; retrieved: string };
export default function Data() {
  const w = useWorkspace(),
    [archive, setArchive] = useState<Archive | null>(null),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setError('');
    fetch('/data/catalog.json', { signal: c.signal })
      .then((r) => {
        if (!r.ok) throw Error(`Archive returned HTTP ${r.status}`);
        return r.json();
      })
      .then(setArchive)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => c.abort();
  }, [attempt]);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="tiny">Data / provenance</span>
          <h1>Know what you’re looking at.</h1>
        </div>
        <Database size={30} />
      </div>
      <p className="lead">
        Metadata, context imagery, and calibrated analytical inputs
        are never interchangeable.
      </p>
      <section className="panel" id="real-nisar" aria-labelledby="real-nisar-title">
        <span className="badge observed">REAL CALIBRATED MEASUREMENTS · SINGLE OBSERVATION</span>
        <h2 id="real-nisar-title">Inspect a real NISAR observation</h2>
        <p>
          Arctic location: 71.89533° N, 76.29144° W. Acquired 16 October 2026 at 02:04:20 UTC.
          This 64 × 64 pixel extract comes from a provisional Level-2 GCOV product, not a browse image.
          It contains HH and HV linear gamma-zero radar measurements on a 10 m projected grid.
        </p>
        <p>
          All 4,096 pixels in each channel passed the applied product-support checks. That does not
          establish water, flooding or safety. One observation cannot show temporal change; terrain
          effects and independent scientific evaluation remain unresolved. Grid spacing is not a
          claim of ground resolution or measured surface area.
        </p>
        <div className="actions">
          <a className="button primary" href="/data/real-nisar-arctic/calibrated-gamma0.tif" download>Download real GeoTIFF</a>
          <a className="button" href="/data/real-nisar-arctic/measurements.csv" download>Download pixel CSV</a>
          <a className="button" href="/data/real-nisar-arctic/export-receipt.json" download>Download observation receipt</a>
        </div>
        <p className="tiny">Open the GeoTIFF in QGIS or the CSV in a spreadsheet. The receipt records the exact product ID, acquisition, processing flags, source checksum and export checksums. No interpolation or spatial filtering was applied.</p>
      </section>
      <div className="data-categories">
        <article className="panel">
          <span className="badge observed">ARCHIVED METADATA</span>
          <h2>Actual NISAR acquisitions</h2>
          <p>
            Real GCOV identifiers and acquisition dates from NASA CMR. Metadata proves a catalog
            entry exists; it does not supply calibrated pixels.
          </p>
        </article>
        <article className="panel">
          <span className="badge observed">NASA CONTEXT IMAGE</span>
          <h2>A view of Seattle</h2>
          <p>
            Official NISAR mission visualization, locally cached for the landing page. No numerical
            analysis is performed on the JPEG.
          </p>
          <External href="https://science.nasa.gov/mission/nisar/">
            NASA/JPL-Caltech source
          </External>
        </article>
        <article className="panel">
          <Badge />
          <h2>Reproducible teaching arrays</h2>
          <p>
            Three deterministic 48 × 48 synthetic series. Every numerical result is derived from
            these labeled inputs until a real dataset is imported.
          </p>
        </article>
      </div>
      <section className="panel">
        <span className="badge observed">ACTUAL NISAR IMAGERY ARCHIVE</span>
        <h2 style={{ marginTop: 18 }}>Fifteen actual scenes. Every request preserved.</h2>
        <p>
          The real-observation workspace contains NASA GIBS daily mosaic images for four regions:
          Bangladesh, Puget Sound, Sacramento Valley (four dates each), and Nepal?s Rasuwa corridor
          (three dates). Matching CMR records come from the provisional GCOV collection. Original
          PNGs, requested bounds/dates, and SHA-256 hashes are retained.
        </p>
        <p>
          NASA's false-color mosaics visualize radar return; their colors are not calibrated
          numerical measurements. A matching granule is not an exhaustive inventory of every mosaic
          pixel's source.
        </p>
        <div className="actions">
          <Link className="button primary" to="/observatory">
            Explore actual imagery
          </Link>
          <a className="button" href="/data/observatory.json" download>
            Download complete imagery manifest
          </a>
          <External href="https://hyp3-docs.asf.alaska.edu/nisar-docs/worldview/">
            Official visualization documentation
          </External>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Earlier beta catalog snapshot</h2>
            <p>Mission: NISAR · Instrument: L-SAR · Product: Level 2 GCOV · Collection: beta V1</p>
          </div>
          {archive && (
            <Download
              label="Download catalog JSON"
              name="sarflow-cmr-catalog.json"
              value={archive}
            />
          )}
        </div>
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <button onClick={() => setAttempt((a) => a + 1)}>Retry archive</button>
          </div>
        ) : !archive ? (
          <p role="status">Loading archived metadata…</p>
        ) : (
          <>
            <p className="tiny">
              Retrieved {date(archive.retrieved)}. Global snapshot, not a coverage guarantee for
              teaching locations. Latest catalog status may differ.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Acquisition (UTC)</th>
                    <th>Granule ID</th>
                    <th>Product / source</th>
                    <th>Data status</th>
                  </tr>
                </thead>
                <tbody>
                  {archive.records.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {date(r.date)}
                        <br />
                        <small>{r.date.slice(11, 19)}</small>
                      </td>
                      <td>
                        <External href={r.source}>{r.id}</External>
                      </td>
                      <td>
                        <details>
                          <summary>GCOV identifier</summary>
                          <code className="wrap">{r.title}</code>
                        </details>
                      </td>
                      <td>
                        Archived metadata only
                        {r.browse && <External href={r.browse}>ASF browse link</External>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="notice">
              Direct ASF browse downloads required authentication. These beta catalog entries
              contain metadata only. The separate imagery workspace uses publicly accessible NASA
              GIBS visualization products.
            </p>
            <External href={archive.source}>Reproduce the public CMR query</External>
          </>
        )}
      </section>
      <section className="panel">
        <h2>Analytical datasets</h2>
        {w.loading ? (
          <p>Loading dataset contracts…</p>
        ) : w.error ? (
          <div role="alert">
            {w.error}
            <button onClick={w.retry}>Retry datasets</button>
          </div>
        ) : (
          w.datasets.map((d) => (
            <div className="dataset-row" key={d.id}>
              <div>
                <h3>{d.title}</h3>
                <Badge observed={d.status === 'observed'} />
                <p>
                  {d.provenance.product} · {d.observations.length} observations · {d.width} ×{' '}
                  {d.height} cells
                </p>
                <small>{d.provenance.license}</small>
              </div>
              <div className="actions">
                <button
                  onClick={() => {
                    w.choose(d.id);
                    w.setEvidence(true);
                  }}
                >
                  Inspect provenance
                </button>
                <Download
                  label="Download input JSON"
                  name={`sarflow-${d.id}-inputs.json`}
                  value={d}
                />
              </div>
            </div>
          ))
        )}
      </section>
      <section className="panel">
        <h2>Connect calibrated NISAR GCOV windows</h2>
        <p>
          The real-data path accepts bounded windows from compatible GCOV HDF5 products. The
          importer preserves acquisition identifiers, projection, polarization, track, file hashes,
          and processing decisions. Imported files are validated by the API before the UI can use
          them.
        </p>
        <div className="code-block">python scripts/import_gcov.py --help</div>
        <p>
          No credentials are embedded. Download your products manually through official Earthdata
          tools, review scientific compatibility, then run the local importer. See the project
          README for the exact data contract and limitations.
        </p>
        <Link className="text-link" to="/methodology">
          Read the quantitative method
          <ExternalLink size={15} />
        </Link>
      </section>
    </div>
  );
}
