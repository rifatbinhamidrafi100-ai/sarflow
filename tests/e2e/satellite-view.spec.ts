import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// These fixture tiles verify controls and provenance, not real imagery detail.
const fixture = readFileSync('public/observations/nepal-rasuwa-thumbnail.png');

for (const width of [1440, 390]) {
  test(`satellite background, deep zoom and truthful exports at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https:\/\/(?:services\.arcgisonline\.com|tiles\.maps\.eox\.at)\//,
      route => route.fulfill({ contentType: 'image/png', body: fixture }));
    await page.route('**/api/places/reverse?*', route => route.fulfill({ json: { name: 'Sylhet' } }));
    await page.goto('/world?lat=24.895&lon=91.887&zoom=18.95');
    await expect(page.getByText('World imagery loaded', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Earth basemap')).toHaveValue('satellite');
    await expect(page.getByLabel('World latitude')).toHaveValue('24.895');
    await expect(page.getByLabel('Place labels', { exact: true })).toBeChecked();
    await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('Esri World Imagery');
    await page.getByText('Advanced Settings', { exact: true }).click();
    async function exportMetadata() {
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export view metadata' }).click();
      return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
    }
    const satellite = await exportMetadata();
    expect(satellite.source).toBe('Esri World Imagery');
    expect(satellite.year).toBeNull();
    expect(satellite.zoom).toBeGreaterThan(18);
    expect(satellite.quantitativeResult).toBeNull();
    await page.getByLabel('Earth basemap').selectOption('sentinel');
    await expect(page.getByText('World imagery loaded', { exact: true })).toBeVisible();
    const sentinel = await exportMetadata();
    expect(sentinel.source).toBe('EOX / Copernicus Sentinel-2');
    expect(sentinel.year).toBe(2024);
    expect(sentinel.latitude).toBe(satellite.latitude);
    expect(sentinel.longitude).toBe(satellite.longitude);
    expect(sentinel.zoom).toBe(satellite.zoom);
    await page.getByLabel('Earth basemap').selectOption('satellite');
    await page.getByLabel('Place labels', { exact: true }).uncheck();
    await expect(page.getByText('World imagery loaded', { exact: true })).toBeVisible();
    expect((await exportMetadata()).labels).toBeNull();
    await page.getByLabel('World latitude').fill('24.89287');
    await page.getByLabel('World longitude').fill('91.90012');
    await page.getByRole('button', { name: 'Zoom to selected location', exact: true }).click();
    await expect(page.locator('.world-status')).toContainText('Map center 24.89287°, 91.90012° · zoom 18');
    const centered = await exportMetadata();
    expect(centered.latitude).toBe(24.89287);
    expect(centered.longitude).toBe(91.90012);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('an empty NASA browse acquisition has a clear previous-date recovery', async ({ page }) => {
  const archive = JSON.parse(readFileSync('public/data/observatory.json', 'utf8'));
  const region = structuredClone(archive.regions[0]);
  const latest = region.observations.at(-1);
  latest.image = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?empty-fixture=1';
  delete latest.display;
  latest.sha256 = null;
  latest.bytes = null;
  const transparent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==', 'base64');
  await page.route(/^https:\/\/(?:services\.arcgisonline\.com|tiles\.maps\.eox\.at)\//,
    route => route.fulfill({ contentType: 'image/png', body: fixture }));
  await page.route('**/api/global-radar?*', route => route.fulfill({ json: { ...archive, regions: [region] } }));
  await page.route('**/gibs.earthdata.nasa.gov/**', route => route.fulfill({ contentType: 'image/png', body: transparent }));
  await page.goto('/world?lat=24.89287&lon=91.90012&zoom=18');
  await page.getByRole('button', { name: 'Discover observations here' }).click();
  const workspace = page.locator('#world-observation-comparison');
  await expect(workspace.getByText('Browse coverage unavailable', { exact: true })).toBeVisible();
  await expect(workspace.getByRole('alert')).toContainText('no visible pixels');
  await expect(workspace.getByText('No browse pixels for this date', { exact: true })).toBeVisible();
  await workspace.getByRole('button', { name: 'Show previous observation' }).click();
  await expect(workspace.getByText('Archived imagery loaded', { exact: true })).toBeVisible();
  await expect(workspace.locator('.obs-map-error')).toHaveCount(0);
});
