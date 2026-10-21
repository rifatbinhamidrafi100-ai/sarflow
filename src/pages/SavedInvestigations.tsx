import { useRef, useState } from 'react';
import {
  loadInvestigations,
  parseEvidencePackage,
  parseSavedInvestigation,
  type SavedInvestigation,
} from '../../shared/saved-investigations';
import type { EvidencePackage } from '../../shared/evidence-package';
import InvestigationTools from '../components/InvestigationTools';
import { Download } from '../components/ui';
import '../components/investigation-tools.css';

export default function SavedInvestigations() {
  const [initial] = useState(() => {
    try {
      return { entries: loadInvestigations(window.localStorage), error: '' };
    } catch (e) {
      return {
        entries: [] as SavedInvestigation[],
        error: e instanceof Error ? e.message : 'Saved investigations could not be read.',
      };
    }
  });
  const [entries, setEntries] = useState(initial.entries),
    [selected, setSelected] = useState('');
  const [error, setError] = useState(initial.error),
    [imported, setImported] = useState<EvidencePackage | null>(null);
  const [importedNotes, setImportedNotes] = useState<SavedInvestigation | undefined>();
  const importGeneration = useRef(0);
  const current = entries.find((e) => e.id === selected);
  function refresh() {
    try {
      setEntries(loadInvestigations(window.localStorage));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Local refresh failed.');
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    const generation = ++importGeneration.current;
    setError('');
    setImported(null);
    setImportedNotes(undefined);
    try {
      if (file.size > 4_000_000) throw Error('Evidence import exceeds the 4 MB limit.');
      const raw = JSON.parse(await file.text());
      const entry =
        raw && typeof raw === 'object' && 'evidence' in raw
          ? parseSavedInvestigation(raw)
          : undefined;
      const p = entry?.evidence ?? parseEvidencePackage(raw);
      if (generation !== importGeneration.current) return;
      setImported(p);
      setImportedNotes(entry);
      setSelected('');
    } catch (e) {
      if (generation === importGeneration.current)
        setError(e instanceof Error ? e.message : 'Evidence import failed validation.');
    }
  }
  return (
    <div className="page">
      <h1>Saved investigations</h1>
      <p className="lead">
        Local evidence snapshots, hypotheses and notes. Saved or imported status does not verify a
        satellite observation or event.
      </p>
      <div className="actions">
        <button onClick={refresh}>Refresh saved investigations</button>
      </div>
      <section className="panel saved-import">
        <h2>Open an evidence package</h2>
        <label>
          Import evidence JSON locally
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </label>
        <p className="tiny">
          Inputs, dates, settings and computed results are revalidated. Imported derived labels are
          rebuilt from the input contract. This does not establish the authenticity of a supplied
          dataset.
        </p>
      </section>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {!entries.length && <p>No saved investigations in this browser yet.</p>}
      <div className="saved-cards">
        {entries.map((e) => (
          <button
            className="saved-card"
            key={e.id}
            aria-pressed={selected === e.id}
            onClick={() => {
              setSelected(e.id);
              setImported(null);
            }}
          >
            <strong>{e.title}</strong>
            <small>{e.evidence.dataset.location}</small>
            <small>
              {e.evidence.observations.before.date.slice(0, 10)} to{' '}
              {e.evidence.observations.after.date.slice(0, 10)}
            </small>
            <small>
              {e.evidence.labels.input} / {e.evidence.labels.result ?? 'not run'}
            </small>
          </button>
        ))}
      </div>
      {current && (
        <>
          <section className="panel">
            <h2>{current.title}</h2>
            <h3>User hypothesis</h3>
            <p className="saved-user-notes">{current.hypothesis || 'No hypothesis recorded.'}</p>
            <h3>User notes</h3>
            <p className="saved-user-notes">{current.note || 'No notes recorded.'}</p>
            <p className="tiny">
              Saved (UTC): {current.savedAt}. These are user interpretations, not verified field
              reports.
            </p>
            <Download
              label="Export investigation with notes"
              value={current}
              name="sarflow-saved-investigation.json"
            />
          </section>
          <InvestigationTools key={current.id} evidence={current.evidence} canSave={false} />
        </>
      )}
      {imported && (
        <>
          <h2>Imported investigation / review before saving</h2>
          <InvestigationTools
            key={imported.exported}
            evidence={imported}
            initialNotes={importedNotes}
          />
        </>
      )}
    </div>
  );
}
