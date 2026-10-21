import * as ml from 'maplibre-gl';
import { basemaps, placeLabels, type Basemap } from '../../shared/basemaps';

export function exportCameraZoom(viewZoom: number, viewWidth: number): number {
  if (viewWidth <= 0) throw Error('Open the map before exporting its view.');
  return viewZoom + Math.log2(3840 / viewWidth);
}

/** Re-render the current center/projection at output resolution; never upscale a screenshot. */
export async function exportEarth(
  source: ml.Map,
  basemap: Basemap = basemaps.sentinel,
  labels = false,
): Promise<void> {
  const host = document.createElement('div');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '3840px',
    height: '2160px',
    pointerEvents: 'none',
  });
  document.body.append(host);
  let output: ml.Map | undefined;
  try {
    const style = source.getStyle();
    // Preserve horizontal extent. Native raster limits belong to the sources,
    // not the camera: clamping here silently zooms out a close-up export.
    const zoom = exportCameraZoom(source.getZoom(), source.getContainer().clientWidth);
    output = new ml.Map({
      container: host,
      style,
      center: source.getCenter(),
      zoom,
      maxZoom: Math.max(24, zoom),
      bearing: source.getBearing(),
      pitch: source.getPitch(),
      pixelRatio: 1,
      interactive: false,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    const renderer = output;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => finish(Error('4K imagery timed out. Retry after checking your connection.')),
        60000,
      );
      const failed = () =>
        finish(Error('A 4K imagery tile failed to load. No incomplete image was exported.'));
      const loaded = () => finish();
      function finish(error?: Error) {
        clearTimeout(timer);
        renderer.off('idle', loaded);
        renderer.off('error', failed);
        if (error) reject(error);
        else resolve();
      }
      renderer.on('idle', loaded);
      renderer.on('error', failed);
    });
    const canvas = document.createElement('canvas');
    canvas.width = 3840;
    canvas.height = 2320;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Image export is unavailable.');
    ctx.drawImage(renderer.getCanvas(), 0, 0);
    ctx.fillStyle = '#112a3b';
    ctx.fillRect(0, 2160, 3840, 160);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    const lines = [
      `SARFlow | 3840 × 2160 map render | ${basemap.name}, not NISAR or live imagery`,
      `Center ${source.getCenter().lat.toFixed(5)}, ${source.getCenter().wrap().lng.toFixed(5)} | Detail is limited by source imagery`,
      ...basemap.exportAttribution,
      ...(labels ? [placeLabels.attribution] : []),
    ];
    lines.forEach((line, i) => ctx.fillText(line, 28, 2187 + i * 29, 3784));
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(Error('PNG encoding failed.'))), 'image/png'),
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'sarflow-earth-4k.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    output?.remove();
    host.remove();
  }
}
