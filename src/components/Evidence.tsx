import { useEffect, useRef } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../data/Workspace';
import { Badge, Download, External, date } from './ui';
export default function Evidence() {
  const w = useWorkspace(),
    dialog = useRef<HTMLDialogElement>(null),
    d = w.dataset;
  useEffect(() => {
    if (w.evidence) dialog.current?.showModal();
    else dialog.current?.close();
  }, [w.evidence]);
  if (!d) return null;
  return (
    <dialog
      ref={dialog}
      className="evidence"
      onCancel={() => w.setEvidence(false)}
      onClick={(e) => {
        if (e.target === dialog.current) w.setEvidence(false);
      }}
      aria-labelledby="evidence-title"
    >
      <div className="drawer-head">
        <ShieldCheck />
        <h2 id="evidence-title">Evidence, end to end</h2>
        <button aria-label="Close evidence" onClick={() => w.setEvidence(false)}>
          <X size={20} />
        </button>
      </div>
      <Badge observed={d.status === 'observed'} />
      <p>Every result belongs to a source, a pair, and a method.</p>
      <dl className="metadata">
        <dt>Source</dt>
        <dd>{d.provenance.source}</dd>
        <dt>Product</dt>
        <dd>{d.provenance.product}</dd>
        <dt>Location</dt>
        <dd>{d.location}</dd>
        <dt>Pair</dt>
        <dd>
          {date(d.observations[w.before].date)} → {date(d.observations[w.after].date)}
        </dd>
        <dt>Source identifiers</dt>
        <dd>
          {d.observations[w.before].sourceId}
          <br />
          {d.observations[w.after].sourceId}
        </dd>
        <dt>Grid / CRS</dt>
        <dd>
          {d.width} × {d.height} / {d.crs}
        </dd>
        <dt>Polarization</dt>
        <dd>{d.polarization}</dd>
        <dt>Track</dt>
        <dd>{d.track}</dd>
        <dt>Input unit</dt>
        <dd>{d.unit}</dd>
        <dt>Last prepared</dt>
        <dd>{date(d.provenance.created)}</dd>
      </dl>
      <h3>Processing chain</h3>
      <ol className="chain">
        {d.provenance.processing.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <p>
        Current settings: {w.filter ? '3×3 mean' : 'No filter'}; |Δ| ≥ {w.threshold.toFixed(1)} dB.{' '}
        {w.result
          ? `${w.result.valid} valid cells in common support.`
          : 'Analysis not run for these settings.'}
      </p>
      <h3>Evidence status</h3>
      <p>
        Input: {w.evidencePackage?.labels.input ?? 'unavailable'} · Result:{' '}
        {w.evidencePackage?.labels.result ?? 'not run'}. Event validation and confidence have not
        been established.
      </p>
      <p className="tiny">
        Evidence format: 1.0.0 · Method: common-support-log-ratio-v1. Observed input status does not
        independently verify calibration.
      </p>
      <h3>Limits on interpretation</h3>
      <ul>
        {d.provenance.limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <External href={d.provenance.url}>Source documentation</External>
      {w.evidencePackage ? (
        <div className="actions">
          <Download
            label="Export evidence JSON"
            name={`sarflow-${d.id}-evidence.json`}
            value={w.evidencePackage}
          />
        </div>
      ) : (
        <p role="status">Evidence export unavailable: {w.evidenceError}</p>
      )}
    </dialog>
  );
}
