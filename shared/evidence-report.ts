import type { EvidencePackage } from './evidence-package';
import { findHotspots } from './hotspots';

export function reportSections(p: EvidencePackage) {
  const m = p.metrics,
    n = (v: number | null, digits = 2) => (v === null ? 'Unavailable' : v.toFixed(digits));
  return [
    {
      title: 'Evidence status',
      lines: [
        p.disclaimer,
        `Input: ${p.labels.input}; result: ${p.labels.result ?? 'not run'}.`,
        'Event validation: not evaluated. Event probability: not estimated.',
      ],
    },
    {
      title: 'Observation and source',
      lines: [
        p.dataset.location,
        p.dataset.title,
        `Before (UTC): ${p.observations.before.date} | ${p.observations.before.sourceId}`,
        `After (UTC): ${p.observations.after.date} | ${p.observations.after.sourceId}`,
        `Source: ${p.dataset.provenance.source}`,
        `Product: ${p.dataset.provenance.product}`,
        p.dataset.provenance.url,
        `Polarization: ${p.dataset.polarization}; track: ${p.dataset.track}; CRS: ${p.dataset.crs}.`,
      ],
    },
    {
      title: 'Computed findings',
      lines: [
        `Candidate cells: ${m.changedCells ?? 'Unavailable'}; common valid: ${p.quality.commonValidCells ?? 'Unavailable'}; excluded: ${p.quality.excludedCells ?? 'Unavailable'}.`,
        `Changed-cell percentage: ${n(m.changedCellPercent)}%; denominator: common valid cells.`,
        `Increase: ${m.increasedCells ?? 'Unavailable'}; decrease: ${m.decreasedCells ?? 'Unavailable'}.`,
        `Mean signed change: ${n(m.meanSignedChangeDb)} dB; candidate grid area: ${n(m.candidateAreaKm2, 4)} km2.`,
        'Candidate cells and grid area do not establish a hazard, damage or affected-event extent.',
      ],
    },
    {
      title: 'Processing method',
      lines: [
        p.method.id,
        p.method.formula,
        `Threshold: ${p.parameters.threshold} dB; filter: ${p.method.filter}.`,
        ...p.method.steps,
      ],
    },
    {
      title: 'Quality and limitations',
      lines: [
        `Analysis: ${p.quality.analysisStatus}; calibration: ${p.quality.calibrationStatus}.`,
        'Spatial resolution and exact ground geometry are not independently verified by this package.',
        ...p.warnings,
      ],
    },
    {
      title: 'Reproduction',
      lines: [
        `Evidence format: ${p.schemaVersion}; package prepared (UTC): ${p.exported}.`,
        'Use the accompanying evidence JSON for full input arrays, source file hashes when supplied, parameters and results.',
        'Independent project. No NASA or ISRO endorsement.',
      ],
    },
  ];
}

export const escapeHTML = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export function gridMaskSVG(p: EvidencePackage): string {
  if (!p.result) return '<p>No computed mask is available.</p>';
  const groups = findHotspots(p),
    rects: string[] = [];
  for (const group of groups)
    for (const run of group.runs) {
      rects.push(
        `<rect x="${run.start}" y="${run.row}" width="${run.end - run.start}" height="1" fill="${group.direction === 'decrease' ? '#245f98' : '#a66b21'}"/>`,
      );
      if (rects.length > 1800)
        return '<p>Mask omitted to keep this brief small. Use the full evidence JSON for per-cell output.</p>';
    }
  return `<svg role="img" aria-label="Native grid change candidates, not geographic hazard polygons" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.dataset.width} ${p.dataset.height}"><rect width="100%" height="100%" fill="#e3e9ed"/>${rects.join('')}</svg>`;
}

/** Self-contained artifact: no scripts, fonts, imagery requests or external dependencies. */
export function offlineBriefHTML(p: EvidencePackage): string {
  const sections = reportSections(p);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>SARFlow evidence brief</title><style>body{font:15px/1.5 system-ui,sans-serif;color:#193347;max-width:820px;margin:24px auto;padding:0 20px}h1{font-size:28px}h2{font-size:17px;margin:20px 0 7px}p{margin:5px 0;overflow-wrap:anywhere}.status{background:#fff3df;border-left:4px solid #9c6414;padding:12px}svg{width:180px;height:180px;border:1px solid #aab8c4}small{display:block}a{color:#075781}section{break-inside:avoid}@media print{body{font-size:10px;margin:0;padding:0}h1{font-size:20px}h2{font-size:12px;margin:10px 0 4px}svg{width:110px;height:110px}@page{size:A4;margin:13mm}}</style></head><body><h1>SARFlow / Offline evidence brief</h1><p class="status">${escapeHTML(p.disclaimer)}</p><p>${escapeHTML(p.dataset.location)} / ${escapeHTML(p.observations.before.date.slice(0, 10))} to ${escapeHTML(p.observations.after.date.slice(0, 10))} (UTC)</p><section><h2>Change-mask snapshot</h2>${gridMaskSVG(p)}<small>Native grid, not a geographic event map. Blue: decrease; amber: increase; gray: other or excluded. Synthetic coordinates remain illustrative.</small></section>${sections
    .filter((s) => ['Computed findings', 'Quality and limitations'].includes(s.title))
    .map(
      (s) =>
        `<section><h2>${s.title}</h2>${s.lines.map((line) => `<p>${escapeHTML(line)}</p>`).join('')}</section>`,
    )
    .join(
      '',
    )}<section><h2>Source and reproduction</h2><p>${escapeHTML(p.dataset.provenance.source)} / ${escapeHTML(p.dataset.provenance.product)}</p><p>Before: ${escapeHTML(p.observations.before.sourceId)}<br>After: ${escapeHTML(p.observations.after.sourceId)}</p><p>${escapeHTML(p.method.id)}; ${escapeHTML(p.method.formula)}; threshold ${p.parameters.threshold} dB; ${escapeHTML(p.method.filter)}.</p><p><a href="${escapeHTML(p.dataset.provenance.url)}">Source documentation (requires internet)</a></p><p>Evidence format ${p.schemaVersion}; prepared ${escapeHTML(p.exported)}. Full arrays and provenance remain in the separate evidence JSON. No confirmed damage or event probability.</p></section></body></html>`;
  if (new TextEncoder().encode(html).length > 256_000)
    throw Error('Brief exceeds the 256 KB limit. Export evidence JSON instead.');
  return html;
}
