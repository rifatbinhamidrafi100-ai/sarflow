import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EvidencePackage } from '../../shared/evidence-package';
import { findHotspots, nativeHotspotExport } from '../../shared/hotspots';
import { offlineBriefHTML } from '../../shared/evidence-report';
import { saveInvestigation } from '../../shared/saved-investigations';
import { Download } from './ui';
import { downloadText, exportEvidencePDF } from './exportReport';
import './investigation-tools.css';

export default function InvestigationTools({
  evidence: p,
  canSave = true,
  initialNotes,
}: {
  evidence: EvidencePackage;
  canSave?: boolean;
  initialNotes?: { title: string; note: string; hypothesis: string };
}) {
  const hotspots = useMemo(() => findHotspots(p), [p]);
  const [title, setTitle] = useState(initialNotes?.title ?? ''),
    [note, setNote] = useState(initialNotes?.note ?? ''),
    [hypothesis, setHypothesis] = useState(initialNotes?.hypothesis ?? '');
  const [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [exporting, setExporting] = useState(false);
  const gap =
    (Date.parse(p.observations.after.date) - Date.parse(p.observations.before.date)) / 86400000;
  async function pdf() {
    setError('');
    setExporting(true);
    try {
      await exportEvidencePDF(p);
      setMessage('PDF generated from the current evidence package.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF generation failed.');
    } finally {
      setExporting(false);
    }
  }
  function brief() {
    setError('');
    try {
      const text = offlineBriefHTML(p);
      downloadText(text, `sarflow-${p.dataset.id}-offline.html`, 'text/html;charset=utf-8');
      setMessage(
        `Offline brief generated: ${new TextEncoder().encode(text).length.toLocaleString()} bytes. Opens without the app or internet.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Brief generation failed.');
    }
  }
  function save() {
    setError('');
    try {
      saveInvestigation(window.localStorage, {
        id: crypto.randomUUID(),
        title: title.trim() || `${p.dataset.location} investigation`,
        note,
        hypothesis,
        savedAt: new Date().toISOString(),
        evidence: p,
      });
      setMessage(
        'Investigation saved on this browser. Notes and hypotheses remain user interpretations.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Local save failed.');
    }
  }
  return (
    <section className="investigation-tools" aria-label="Investigation tools">
      <section className="panel">
        <h2>Data quality inspector</h2>
        <p className="notice">{p.disclaimer}</p>
        <dl className="quality-grid">
          <div>
            <dt>Observation dates (UTC)</dt>
            <dd>
              {p.observations.before.date.slice(0, 10)} to {p.observations.after.date.slice(0, 10)}
            </dd>
          </div>
          <div>
            <dt>Selected interval</dt>
            <dd>{gap.toFixed(2)} days; not a guaranteed revisit schedule</dd>
          </div>
          <div>
            <dt>Grid and unit</dt>
            <dd>
              {p.dataset.width} × {p.dataset.height}; {p.dataset.unit}; {p.dataset.crs}
            </dd>
          </div>
          <div>
            <dt>Available acquisitions</dt>
            <dd>{p.dataset.observations.length}; gaps may exist</dd>
          </div>
          <div>
            <dt>Paired support</dt>
            <dd>
              {p.quality.commonValidCells ?? 'Not computed'} valid;{' '}
              {p.quality.excludedCells ?? 'not computed'} excluded
            </dd>
          </div>
          <div>
            <dt>Calibration / ground resolution</dt>
            <dd>{p.quality.calibrationStatus}; ground resolution not independently verified</dd>
          </div>
          <div>
            <dt>Polarization and track</dt>
            <dd>
              {p.dataset.polarization}; {p.dataset.track}
            </dd>
          </div>
          <div>
            <dt>Supplied pixel area</dt>
            <dd>
              {p.dataset.status === 'synthetic'
                ? 'Not applicable to physical interpretation of teaching grids'
                : p.dataset.pixelAreaM2 === null
                  ? 'Unavailable; physical area cannot be computed'
                  : `${p.dataset.pixelAreaM2} m² per grid cell (not independently verified)`}
            </dd>
          </div>
        </dl>
        <details>
          <summary>Source-specific warnings</summary>
          <ul>
            {p.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      </section>
      <section className="panel">
        <h2>Change hotspots</h2>
        <p>
          Four-neighbor groups of same-sign threshold candidates. Extents and outlines use native
          grid cells; they are not geographic hazard polygons.
        </p>
        {!p.result ? (
          <p>Run analysis to compute hotspots.</p>
        ) : (
          <>
            <p>
              {hotspots.length} groups; {p.metrics.changedCells} changed cells. Showing the largest{' '}
              {Math.min(10, hotspots.length)} groups.
            </p>
            <div
              className="hotspot-preview"
              role="img"
              aria-label="Native grid hotspot rectangles, not geographic event outlines"
            >
              <svg viewBox={`0 0 ${p.dataset.width} ${p.dataset.height}`}>
                <rect width="100%" height="100%" fill="#e3e9ed" />
                {hotspots
                  .slice(0, 10)
                  .flatMap((h) =>
                    h.runs.map((r, i) => (
                      <rect
                        key={`${h.id}-${i}`}
                        x={r.start}
                        y={r.row}
                        width={r.end - r.start}
                        height={1}
                        fill={h.direction === 'decrease' ? '#245f98' : '#a66b21'}
                      />
                    )),
                  )}
              </svg>
            </div>
            <p className="tiny">
              Blue: decrease; amber: increase. Only the listed largest groups are drawn. Other cells
              remain gray.
            </p>
            <div
              className="tools-table"
              tabIndex={0}
              role="region"
              aria-label="Scrollable hotspot measurements"
            >
              <table>
                <caption>Native-grid candidates; no event attribution</caption>
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Direction</th>
                    <th>Cells</th>
                    <th>Change range (dB)</th>
                    <th>Grid extent</th>
                  </tr>
                </thead>
                <tbody>
                  {hotspots.slice(0, 10).map((h) => (
                    <tr key={h.id}>
                      <td>{h.id}</td>
                      <td>{h.direction}</td>
                      <td>{h.cells}</td>
                      <td>
                        {h.minChangeDb.toFixed(2)} to {h.maxChangeDb.toFixed(2)}
                      </td>
                      <td>
                        columns {h.extent.left}–{h.extent.right}; rows {h.extent.top}–
                        {h.extent.bottom} (exclusive upper edges)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Download
              label="Export native-grid hotspots"
              value={nativeHotspotExport(p, hotspots)}
              name={`sarflow-${p.dataset.id}-grid-hotspots.json`}
            />
          </>
        )}
      </section>
      <section className="panel">
        <h2>Reports and low-bandwidth brief</h2>
        <p>
          Generate from the same dates, numbers, source information and limitations. PDF includes a
          native-grid change-mask snapshot. The self-contained HTML brief opens offline; full input
          arrays stay in the evidence JSON.
        </p>
        <div className="actions">
          <button onClick={() => void pdf()} disabled={exporting}>
            {exporting ? 'Preparing PDF…' : 'Download evidence PDF'}
          </button>
          <button onClick={brief}>Download offline brief</button>
          <Download
            label="Download full evidence package"
            value={p}
            name={`sarflow-${p.dataset.id}-evidence.json`}
          />
        </div>
        <p className="tiny">
          PDF text is English with Latin characters. The HTML brief preserves Unicode source names.
          These exports do not make the entire application available offline.
        </p>
      </section>
      {canSave && (
        <section className="panel">
          <h2>Save an investigation</h2>
          <p>
            Save this evidence, notes and hypothesis in this browser. Five investigations / 4 MB
            maximum. Browser data clearing removes local saves; export a JSON copy for backup. Saved
            evidence is not automatically uploaded.
          </p>
          <form
            className="investigation-form"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label>
              Investigation title
              <input
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${p.dataset.location} investigation`}
              />
            </label>
            <label>
              Hypothesis (user interpretation)
              <textarea
                maxLength={1000}
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
              />
            </label>
            <label>
              Investigation notes
              <textarea maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="actions">
              <button type="submit">Save investigation locally</button>
              <Link className="button" to="/investigations">
                Open saved investigations
              </Link>
            </div>
          </form>
        </section>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
    </section>
  );
}
