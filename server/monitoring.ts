import { Router } from 'express';
import { processorStatusSchema } from '../shared/monitoring.js';

const MAX_BYTES = 1024 * 1024;
const SAFE_MESSAGES: Record<string, string> = {
  idle: 'Waiting for the next scheduled check.',
  discovered: 'New acquisitions discovered.',
  downloaded: 'Calibrated measurements downloaded.',
  processed: 'Processing completed; publication requires reference evaluation.',
  blocked: 'Processing is waiting for required inputs or configuration.',
  error: 'The latest processing attempt did not complete.',
  'metadata-only': 'Dates updated. Calibrated downloads are not enabled.',
  'authentication-required': 'Manual Earthdata sign-in is required for calibrated downloads.',
  'collection-review': 'Collection verification failed. Ingestion is paused for review.',
  'discovery-error': 'NASA discovery failed. Earlier records are retained.',
  'storage-limit': 'Storage budget reached. Operator archival is required.',
};

function statusUrl(base: string): URL {
  const url = new URL(base);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
      url.username || url.password || url.search || url.hash) throw Error('Invalid configuration');
  url.pathname = `${url.pathname.replace(/\/$/, '')}/status`;
  return url;
}

async function readBounded(response: Response) {
  if (!response.ok || !response.body) throw Error('Unavailable');
  const length = response.headers.get('content-length');
  if (length && Number(length) > MAX_BYTES) { await response.body.cancel(); throw Error('Oversized'); }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw Error('Oversized');
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

/** Read-only public status proxy. Never forward credentials or processor diagnostics. */
export function monitoringRouter(options: { baseUrl?: string; fetcher?: typeof fetch } = {}) {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const base = options.baseUrl ?? process.env.SARFLOW_PROCESSOR_URL;
    if (!base) {
      res.json({ configured: false, status: 'not-configured', message: 'Scheduled processor is not connected.' });
      return;
    }
    try {
      const response = await (options.fetcher ?? fetch)(statusUrl(base), {
        signal: AbortSignal.timeout(10_000), redirect: 'error', credentials: 'omit',
        headers: { Accept: 'application/json' },
      });
      const data = processorStatusSchema.parse(await readBounded(response));
      data.locations = data.locations.map(location => ({ ...location,
        message: SAFE_MESSAGES[location.state] ?? 'See processing counts; event publication requires reference evaluation.',
      }));
      res.json(data);
    } catch {
      res.status(503).json({ error: 'Scheduled processor status is temporarily unavailable.' });
    }
  });
  return router;
}
