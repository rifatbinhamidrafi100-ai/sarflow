import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('reject whitespace searches before contacting the place service', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/places?*', (route) => {
    requests.push(route.request().url());
    return route.fulfill({ json: { results: [] } });
  });
  await page.goto('/my-area', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('City, town or region').fill('   ');
  await page.getByRole('button', { name: 'Find my area' }).click();
  await expect(page.getByRole('status')).toContainText('Enter at least two letters');
  expect(requests).toEqual([]);
});

test('search recovers after a service failure', async ({ page }) => {
  let failing = true;
  await page.route('**/api/places?*', (route) => route.fulfill({
    status: failing ? 503 : 200,
    json: failing ? { error: 'unavailable' } : { results: [] },
  }));
  await page.goto('/my-area', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('City, town or region').fill('Test');
  await page.getByRole('button', { name: 'Find my area' }).click();
  await expect(page.getByRole('status')).toContainText('Place search is unavailable');
  failing = false;
  await page.getByRole('button', { name: 'Find my area' }).click();
  await expect(page.getByRole('status')).toContainText('No matching places');
});
test('select a place without claiming risk assessment and preserve coordinates', async ({ page }) => {
  await page.route('**/api/places?*', (route) => route.fulfill({ json: { results: [{ id: 1, name: 'Test town', country: 'Test country', latitude: 25.15, longitude: 89.8 }] } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-area', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('City, town or region').fill('Test');
  await page.getByRole('button', { name: 'Find my area' }).click();
  await page.getByRole('button', { name: /Test town/ }).click();
  await expect(page.getByText('Not retrieved by SARFlow.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse source products' })).toHaveAttribute('href', '/nisar-explorer?lat=25.15&lon=89.8');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/my-area-mobile.png', fullPage: true });
  await page.getByLabel('City, town or region').fill('Elsewhere');
  await expect(page.getByRole('region', { name: 'Selected area' })).toHaveCount(0);
});
test('invalid and empty search results stay explicit', async ({ page }) => {
  let invalid = true;
  await page.route('**/api/places?*', (route) => route.fulfill({ json: invalid ? { results: [{ latitude: 'bad' }] } : { results: [] } }));
  await page.goto('/my-area', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('City, town or region').fill('Test');
  await page.getByRole('button', { name: 'Find my area' }).click();
  await expect(page.getByRole('status')).toContainText('invalid information');
  invalid = false;
  await page.getByRole('button', { name: 'Find my area' }).click();
  await expect(page.getByRole('status')).toContainText('No matching places');
});
