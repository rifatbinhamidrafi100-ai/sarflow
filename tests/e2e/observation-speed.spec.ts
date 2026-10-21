import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Fixtures test request size and reuse, not scientific image content.
const archive = JSON.parse(readFileSync('public/data/observatory.json', 'utf8'));
const fixture = readFileSync('public/observations/nepal-rasuwa-thumbnail.png');

test('comparison downloads each preview once and reuses dates across mode changes', async ({ page }) => {
  const region = structuredClone(archive.regions[0]);
  region.observations = [region.observations[0], region.observations.at(-1)].map(frame => {
    const image = new URL(frame.request);
    image.searchParams.set('WIDTH', '1536'); image.searchParams.set('HEIGHT', '1536');
    return { ...frame, display: undefined, image: image.toString(), sha256: null, bytes: null };
  });
  const requests: string[] = [];
  await page.route(/^https:\/\/(?:services\.arcgisonline\.com|tiles\.maps\.eox\.at)\//,
    route => route.fulfill({ contentType: 'image/png', body: fixture }));
  await page.route('**/api/global-radar?*', route => route.fulfill({ json: { ...archive, regions: [region] } }));
  await page.route('**/gibs.earthdata.nasa.gov/**', async route => {
    const url = route.request().url();
    expect(new URL(url).searchParams.get('WIDTH')).not.toBe('1536');
    if (new URL(url).searchParams.get('WIDTH') === '768') requests.push(url);
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ contentType: 'image/png', body: fixture });
  });
  await page.goto('/world');
  await page.getByRole('button', { name: 'Discover observations here' }).click();
  const workspace = page.locator('#world-observation-comparison');
  const loaded = workspace.getByText('NASA imagery loaded', { exact: true });
  await expect(loaded).toBeVisible();
  expect(requests).toHaveLength(1);
  await workspace.getByRole('button', { name: 'Compare previous observation', exact: true }).click();
  await expect(loaded).toBeVisible();
  expect(requests).toHaveLength(2);
  for (const request of requests) {
    expect(new URL(request).searchParams.get('WIDTH')).toBe('768');
    expect(new URL(request).searchParams.get('HEIGHT')).toBe('768');
  }
  await workspace.getByRole('button', { name: 'Observe', exact: true }).click();
  await expect(loaded).toBeVisible();
  await workspace.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(loaded).toBeVisible();
  await workspace.getByLabel('Selected observation date', { exact: true }).selectOption('0');
  await expect(loaded).toBeVisible();
  await workspace.getByLabel('Selected observation date', { exact: true }).selectOption('1');
  await expect(loaded).toBeVisible();
  expect(requests).toHaveLength(2);
});
