import { useEffect, useState } from 'react';
import { monitoringSchema, type MonitoringStatusData } from '../../shared/monitoring';

const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not yet recorded';

export function MonitoringStatus() {
  const [data, setData] = useState<MonitoringStatusData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false, pending = false, lastAttempt = 0;
    let controller: AbortController | undefined;
    async function load() {
      if (document.hidden || pending || Date.now() - lastAttempt < 60_000) return;
      pending = true; lastAttempt = Date.now(); controller = new AbortController();
      try {
        const response = await fetch('/api/monitoring', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw Error('Unavailable');
        const status = monitoringSchema.parse(await response.json());
        if (!disposed) { setData(status); setError(false); }
      } catch { if (!disposed) setError(true); }
      finally { pending = false; }
    }
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  return <section className="panel monitoring-status" aria-label="Scheduled observation processing">
    <h2>Scheduled observation processing</h2>
    <p>Calibrated measurements need compatible inputs and independent reference evaluation. Candidates are not confirmed floods.</p>
    {error && <p role="status">Processor status unavailable. Previously loaded information may be outdated.</p>}
    {!data && !error && <p role="status">Checking processor connection…</p>}
    {data && !data.configured && <p role="status">{data.message} Scheduled ingestion and processing are inactive here.</p>}
    {data?.configured && <>
      <p><strong>{data.status === 'stale' ? 'Stale processor heartbeat' : 'Processor connected'}</strong> · Last check: {date(data.checkedAt)} · Next check: {date(data.nextCheckAt)}</p>
      <p>Collection: {data.collections.active}</p>
      {data.collections.unreviewed.length > 0 && <p>Collection updates await compatibility review: {data.collections.unreviewed.join(', ')}.</p>}
      <ul>{data.locations.map(location => <li key={location.id}>
        <strong>{location.name}</strong> · Latest acquisition: {date(location.latestAcquisition)} · Last checked: {date(location.lastChecked)}
        <br />{location.discovered} discovered · {location.downloaded} downloaded · {location.processed} processed. {location.message}
      </li>)}</ul>
      <p>{data.publication.released} reference-evaluated candidates released; {data.publication.withheld} results withheld from publication.</p>
      {data.alerts.length > 0 && <ul>{data.alerts.map(alert => <li key={alert.id}>
        {alert.location}, {alert.date}: {alert.classification} · {alert.areaKm2.toLocaleString(undefined, { maximumFractionDigits: 3 })} km².
        <details><summary>Evaluation record</summary><code style={{ overflowWrap: 'anywhere' }}>{alert.evaluationDigest}</code></details>
      </li>)}</ul>}
    </>}
  </section>;
}
