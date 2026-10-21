import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390]) {
  test(`external source stays separate from NISAR at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('/cases/nepal-rasuwa-2026');
    await page.getByRole('button', { name: 'Load external mapping', exact: true }).click();
    const panel = page.getByRole('region', { name: 'External mapped reference evidence' });
    await expect(panel).toContainText('External mapping loaded. Not field-validated.');
    await expect(panel.getByRole('img', { name: 'Copernicus externally mapped landslide footprint, longitude and latitude coordinates' })).toBeVisible();
    await page.getByRole('button', { name: 'Inspect mapped feature 1' }).click();
    await expect(panel).toContainText('Photo-interpretation');
    await expect(panel).toContainText('8 days after'); await expect(panel).toContainText('4 days before');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export external reference evidence' }).click();
    const download = await pending;
    const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(exported.sarflowQuantitativeResult).toBeNull();
    expect(exported.comparisonStatus).toBe('not-evaluated');
    expect(exported.event.features[0].properties.obj_desc).toBe('Landslide');
    expect(exported.temporalContext.daysBeforeAfter).toBe(4);
    await download.saveAs(`artifacts/rasuwa-reference-${width}.json`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations;
    expect(violations.filter(v => ['critical', 'serious'].includes(v.impact ?? '')).map(v => v.id)).toEqual([]);
    await panel.getByRole('heading', { name: 'Compare with Copernicus mapping' }).click();
    await panel.screenshot({ path: `artifacts/rasuwa-reference-panel-${width}.png` });
    expect(errors).toEqual([]);
  });
}

test('reference loading fails honestly, retries, and overlays the geographic observation map', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/global-radar?*', r => r.fulfill({ json: { empty: true, message: 'No new dates in this archive test.' } }));
  await page.route('**/data/references/rasuwa-emsr927.json', r => r.fulfill({ status: 503, body: '{}' }));
  await page.goto('/observatory?region=nepal-rasuwa');
  await page.getByRole('button', { name: 'Load external mapping', exact: true }).click();
  await expect(page.getByRole('region', { name: 'External mapped reference evidence' })).toContainText('HTTP 503');
  await page.unroute('**/data/references/rasuwa-emsr927.json');
  await page.getByRole('button', { name: 'Retry external mapping' }).click();
  const toggle = page.getByLabel('Show external mapping on geographic map');
  await toggle.check(); await page.getByRole('button', { name: 'Zoom to mapped reference area' }).click();
  await expect(page.getByText('Archived imagery loaded', { exact: true })).toBeVisible();
  await expect(page.locator('.obs-map-error')).toHaveCount(0);
  await expect(page.locator('.external-reference-map-label')).toContainText('not SARFlow detection');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export investigation', exact: true }).click();
  const exported = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(exported.externalMappingReference.product).toBe('EMSR927 AOI01 GRA PRODUCT v1');
  expect(exported.quantitativeResult).toBeNull();
  await page.locator('.observation-map').screenshot({ path: 'artifacts/rasuwa-reference-map.png' });
  await page.route('**/observations/nepal-rasuwa-2026-08-31.png', route => route.abort());
  await page.getByRole('button', { name: 'Previous acquisition', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry map', exact: true })).toBeVisible();
  await page.unroute('**/observations/nepal-rasuwa-2026-08-31.png');
  await page.getByRole('button', { name: 'Retry map', exact: true }).click();
  await expect(page.getByText('Archived imagery loaded', { exact: true })).toBeVisible();
  await expect(toggle).toBeChecked();
  await expect(page.locator('.obs-map-error')).toHaveCount(0);
  await expect(page.locator('.external-reference-map-label')).toContainText('not SARFlow detection');
  await page.locator('.observation-map').screenshot({ path: 'artifacts/rasuwa-reference-map-after-retry.png' });
  await page.locator('.obs-advanced > summary').click();await page.getByRole('button', { name: 'Use archived image viewer' }).click();
  await expect(toggle).toBeDisabled();
  await expect(page.getByRole('region', { name: 'External mapped reference evidence' })).toContainText('Return to the geographic map');
  expect(errors).toEqual([]);
});
