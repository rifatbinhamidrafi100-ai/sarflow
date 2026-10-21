import type { EvidencePackage } from './evidence-package';

export type Hotspot = {
  id: string;
  direction: 'increase' | 'decrease';
  cells: number;
  minChangeDb: number;
  maxChangeDb: number;
  extent: { left: number; top: number; right: number; bottom: number };
  runs: { row: number; start: number; end: number }[];
};

/** Exact 4-connected, same-sign components. Coordinates are grid cells, never longitude/latitude. */
export function findHotspots(p: EvidencePackage): Hotspot[] {
  if (!p.result) return [];
  const { width, height } = p.dataset,
    { mask, delta } = p.result;
  const seen = new Uint8Array(mask.length),
    groups: Hotspot[] = [];
  for (let seed = 0; seed < mask.length; seed++) {
    const sign = mask[seed];
    if (seen[seed] || (sign !== 1 && sign !== -1)) continue;
    const queue = [seed],
      cells: number[] = [];
    seen[seed] = 1;
    let left = width,
      top = height,
      right = 0,
      bottom = 0,
      min = Infinity,
      max = -Infinity;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const i = queue[cursor],
        x = i % width,
        y = Math.floor(i / width),
        v = delta[i]!;
      cells.push(i);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
      min = Math.min(min, v);
      max = Math.max(max, v);
      const neighbors = [
        x > 0 ? i - 1 : -1,
        x + 1 < width ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y + 1 < height ? i + width : -1,
      ];
      for (const n of neighbors)
        if (n >= 0 && !seen[n] && mask[n] === sign) {
          seen[n] = 1;
          queue.push(n);
        }
    }
    cells.sort((a, b) => a - b);
    const runs: Hotspot['runs'] = [];
    for (const i of cells) {
      const row = Math.floor(i / width),
        col = i % width,
        last = runs.at(-1);
      if (last && last.row === row && last.end === col) last.end++;
      else runs.push({ row, start: col, end: col + 1 });
    }
    groups.push({
      id: `grid-${seed}`,
      direction: sign === 1 ? 'increase' : 'decrease',
      cells: cells.length,
      minChangeDb: min,
      maxChangeDb: max,
      extent: { left, top, right, bottom },
      runs,
    });
  }
  return groups.sort((a, b) => b.cells - a.cells || a.id.localeCompare(b.id));
}

export function nativeHotspotExport(p: EvidencePackage, groups = findHotspots(p)) {
  return {
    schemaVersion: '1.0.0',
    coordinateSpace: 'native-grid-cells',
    geometryMeaning:
      'Each run is an exact cell rectangle; extents are enclosing boxes, not geographic event outlines.',
    dataStatus: p.dataset.status,
    evidenceLabels: p.labels,
    observations: p.observations,
    method: p.method,
    width: p.dataset.width,
    height: p.dataset.height,
    hotspots: groups,
    limitations: [
      'No geographic polygons, physical hotspot area, hazard classification or accuracy is established.',
      ...p.warnings,
    ],
  };
}
