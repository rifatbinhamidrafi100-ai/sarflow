import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('ASF discovery renders metadata, exports evidence and remains usable on mobile', async ({
  page,
}) => {
  await page.route('**/api/asf-discovery?*', (route) =>
    route.fulfill({
      json: {
        query: { lat: 25.15, lon: 89.8, start: '2026-09-01', end: '2026-10-01' },
        sourceQuery: 'https://api.daac.asf.alaska.edu/services/search/param',
        checkedAt: '2026-10-30T00:00:00Z',
        records: [
          {
            id: 'SECOND-SOFTWARE-FIXTURE',
            acquiredAt: '2026-09-24T00:00:00Z',
            collection: null,
            sensor: 'L-SAR',
            polarization: null,
            direction: null,
            accessUrl: null,
            footprint: null,
          },
          {
            id: 'SOFTWARE-TEST-FIXTURE',
            acquiredAt: '2026-09-12T00:00:00Z',
            collection: 'TEST COLLECTION',
            sensor: 'L-SAR',
            polarization: 'HH + HV',
            direction: 'ASCENDING',
            accessUrl: null,
            footprint: {
              type: 'Polygon',
              coordinates: [
                [
                  [89, 24],
                  [90, 24],
                  [90, 26],
                  [89, 24],
                ],
              ],
            },
          },
        ],
        omitted: 0,
        limitReached: false,
      },
    }),
  );
  await page.goto('/nisar-explorer');
  await page.getByLabel('Start date (UTC)').fill('2026-09-01');
  await page.getByLabel('End date (UTC)').fill('2026-10-01');
  await page.getByRole('button', { name: 'Search observations' }).click();
  await expect(
    page.getByText('Selected footprint unavailable: missing or unsupported source geometry.'),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Acquisition timeline' })
    .getByRole('button', { name: '2026-09-12' })
    .click();
  await expect(page.getByText('SOFTWARE-TEST-FIXTURE', { exact: true })).toBeVisible();
  await expect(page.getByText('Not performed by this catalogue search')).toBeVisible();
  await expect(page.getByText('Selected source footprint shown in blue.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fit selected footprint' })).toBeEnabled();
  await expect(
    page
      .getByRole('navigation', { name: 'Acquisition timeline' })
      .getByRole('button', { name: '2026-09-12' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByText('Explain radar terms to me').click();
  await expect(page.getByText('Backscatter', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export discovery evidence' }).click();
  expect((await download).suggestedFilename()).toBe('sarflow-asf-discovery.json');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.screenshot({ path: 'artifacts/nisar-explorer-mobile.png', fullPage: true });
});
test('empty and error responses never appear as completed analysis', async ({ page }) => {
  let fail = false;
  await page.route('**/api/asf-discovery?*', (route) =>
    route.fulfill(
      fail
        ? { status: 502, json: { error: 'ASF unavailable. Retry.' } }
        : {
            json: {
              query: { lat: 25.15, lon: 89.8, start: '2026-09-01', end: '2026-10-01' },
              sourceQuery: 'https://api.daac.asf.alaska.edu/services/search/param',
              checkedAt: '2026-10-30T00:00:00Z',
              records: [],
              omitted: 0,
              limitReached: false,
            },
          },
    ),
  );
  await page.goto('/nisar-explorer');
  await page.getByLabel('Start date (UTC)').fill('2026-09-01');
  await page.getByLabel('End date (UTC)').fill('2026-10-01');
  await page.getByRole('button', { name: 'Search observations' }).click();
  await expect(page.getByText(/No matching usable GCOV records/)).toBeVisible();
  fail = true;
  await page.getByRole('button', { name: 'Search observations' }).click();
  await expect(page.getByRole('alert')).toHaveText('ASF unavailable. Retry.');
  await expect(page.getByRole('button', { name: 'Export discovery evidence' })).toHaveCount(0);
});
