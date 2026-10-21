import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import type { PlaceObservatory } from '../../shared/place-observatory';

// Deliberate UI test records; not observations or scientific validation.
function catalog(lat = 24, lon = 89, count = 2): PlaceObservatory {
  return { version: '1.0.0', checkedAt: '2026-10-20T00:00:00Z', place: { latitude: lat, longitude: lon },
    source: { mission: 'NISAR', sensor: 'L-SAR', collection: 'NISAR_L2_GCOV_PROVISIONAL_V1', product: 'GCOV', variable: 'Geocoded polarimetric covariance / radar backscatter', processingLevel: 'L2', maturity: 'PROVISIONAL', resolutionMetres: null, query: 'https://cmr.earthdata.nasa.gov/search/granules.json?test=software-fixture' },
    page: 1, pageSize: 100, sourceTotalRecords: count, returnedRecords: count, omittedRecords: 0, nextPage: null, historyComplete: true,
    records: Array.from({ length: count }, (_, index) => ({ id: `G${index + 100}-ASF`, title: `SOFTWARE-UI-FIXTURE-${lat}-${index}`,
      acquiredAt: `2026-07-${index === 0 ? '01' : '13'}T00:00:00Z`, catalogUpdatedAt: '2026-08-01T00:00:00Z', source: `https://cmr.earthdata.nasa.gov/search/concepts/G${index + 100}-ASF.html`, footprint: null,
      sourceAvailableAt: null, downloadedAt: null, processedAt: null, validatedAt: null })),
    limitations: ['Software fixture only. Catalog metadata does not establish calibrated pixel support.'] };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/global-radar?*', route => route.fulfill({ json: { empty: true, message: 'No browse pair in this UI test.' } }));
  await page.route('**/api/datasets', route => route.fulfill({ json: [] }));
});

test('place timeline, evidence stages and export remain usable on desktop and mobile', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/place-observatory?*', route => route.fulfill({ json: catalog() }));
  await page.goto('/global-radar?lat=24&lon=89');
  const ledger = page.getByRole('region', { name: 'Place Observatory', exact: true });
  await ledger.getByRole('button', { name: 'Load place evidence' }).click();
  await expect(ledger.getByText('2 usable catalog records', { exact: false })).toBeVisible();
  await expect(ledger.getByText('No matching registered subset with overlapping display bounds')).toBeVisible();
  await ledger.getByRole('button', { name: /G100-ASF/ }).click();
  await expect(ledger.locator('.place-record')).toContainText('111 full days');
  await expect(ledger.locator('.place-record')).toContainText('Not established in this ledger');
  const pending = page.waitForEvent('download');
  await ledger.getByRole('button', { name: 'Export place evidence ledger' }).click();
  const download = await pending, file = await download.path();
  const report = JSON.parse(await fs.readFile(file!, 'utf8'));
  expect(report.quantitativeResult).toBeNull(); expect(report.localInputsChecked).toBe(true);
  expect(report.catalog.records[0].sourceAvailableAt).toBeNull(); expect(report.catalog.records[0].validatedAt).toBeNull();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `artifacts/place-observatory-fixture-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('single observations survive missing repeat imagery and input-check failures', async ({ page }) => {
  await page.route('**/api/place-observatory?*', route => route.fulfill({ json: catalog(24, 89, 1) }));
  await page.route('**/api/datasets', route => route.fulfill({ status: 503, json: { error: 'Software test' } }));
  await page.goto('/global-radar?lat=24&lon=89');
  const ledger = page.getByRole('region', { name: 'Place Observatory', exact: true });
  await ledger.getByRole('button', { name: 'Load place evidence' }).click();
  await expect(ledger.getByText(/1 usable catalog records/)).toBeVisible();
  await expect(ledger.getByText('Unknown; input check failed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play observations' })).toHaveCount(0);
});

test('failed catalog refresh retains earlier evidence and changed coordinates clear it', async ({ page }) => {
  let failed = false;
  await page.route('**/api/place-observatory?*', async route => {
    if (failed) { await route.fulfill({ status: 502, json: { error: 'Catalog temporarily unavailable' } }); return; }
    const url = new URL(route.request().url());
    await route.fulfill({ json: catalog(Number(url.searchParams.get('lat')), Number(url.searchParams.get('lon'))) });
  });
  await page.goto('/global-radar?lat=24&lon=89');
  const ledger = page.getByRole('region', { name: 'Place Observatory', exact: true });
  await ledger.getByRole('button', { name: 'Load place evidence' }).click();
  await expect(ledger.locator('.place-check')).toContainText('24.0000');
  failed = true; await ledger.getByRole('button', { name: 'Refresh place evidence' }).click();
  await expect(ledger.getByRole('alert')).toContainText('Earlier checked evidence remains below');
  failed = false; await page.getByLabel('Radar latitude', { exact: true }).fill('26');
  await expect(ledger.locator('.place-check')).toContainText('26.0000');
  await expect(ledger.locator('.place-check')).not.toContainText('24.0000');
});

test('coordinate typing submits only the final valid place after editing settles', async ({ page }) => {
  const requested: string[] = [];
  let admittedAt = 0;
  await page.route('**/api/place-observatory?*', async route => {
    const url = new URL(route.request().url()); requested.push(url.searchParams.get('lat')!);
    if (Date.now() - admittedAt < 1500) { await route.fulfill({ status: 429, json: { error: 'Rate limited' } }); return; }
    admittedAt = Date.now();
    await route.fulfill({ json: catalog(Number(url.searchParams.get('lat')), Number(url.searchParams.get('lon'))) });
  });
  await page.goto('/global-radar?lat=24&lon=89');
  const ledger = page.getByRole('region', { name: 'Place Observatory', exact: true });
  await ledger.getByRole('button', { name: 'Load place evidence' }).click();
  await expect(ledger.locator('.place-check')).toContainText('24.0000');
  const latitude = page.getByLabel('Radar latitude', { exact: true });
  await latitude.fill('');
  await latitude.pressSequentially('26.1', { delay: 100 });
  await expect(ledger.locator('.place-check')).toContainText('26.1000');
  expect(requested).toEqual(['24', '26.1']);
  await expect(ledger.getByRole('alert')).toHaveCount(0);
});
