import { test, expect } from '@playwright/test';

test('legacy account URLs return to the public homepage without a login form', async ({ page }) => {
  for (const route of ['/login', '/login?mode=signup', '/account', '/signup']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'See Earth Move.' })).toBeVisible();
    await expect(page.locator('.account-link')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
    await expect(page.locator('input[type=password]')).toHaveCount(0);
  }
});

test('public exploration and install remain reachable on phones and desktop', async ({ page }) => {
  for (const width of [320, 801, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Explore my area', exact: true }).click();
    await expect(page).toHaveURL(/\/my-area$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  await page.goto('/install', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('No account is needed.', { exact: false })).toBeVisible();
});
