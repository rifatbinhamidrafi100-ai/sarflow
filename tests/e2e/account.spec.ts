import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('login entry, create-account view and guest access work without collecting passwords', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.account-link').click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome back to SARFlow.');
  await page
    .getByRole('navigation', { name: 'Account access' })
    .getByRole('link', { name: 'Create account' })
    .click();
  await expect(page.getByRole('heading', { name: 'Create your SARFlow profile' })).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  for (const width of [320, 801, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.screenshot({ path: 'artifacts/login-desktop-dark.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/login-phone-dark.png', fullPage: true });
  await page.getByRole('link', { name: 'Continue without signing in' }).click();
  await expect(page).toHaveURL(/\/my-area$/);
});
test('optional sign-in reports missing setup and leaves exploration open', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/account');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('being configured');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([]);
  }
  await page.screenshot({ path: 'artifacts/account-mobile-20261113.png', fullPage: true });
  await page.getByRole('link', { name: 'Explore Earth', exact: true }).click();
  await expect(page).toHaveURL(/\/world/);
  expect(errors).toEqual([]);
});
test('profile edits send only display fields; verified email stays read-only', async ({ page }) => {
  const session = {
    user: {
      id: 'software-fixture',
      username: 'fixture_user',
      name: 'Fixture User',
      email: 'student@example.test',
    },
    expires: '2026-11-20T00:00:00Z',
  };
  await page.route('**/api/auth/status', (route) =>
    route.fulfill({ json: { enabled: true, origin: 'http://127.0.0.1:5186' } }),
  );
  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({ json: { csrfToken: 'software-fixture-only' } }),
  );
  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() === 'POST') {
      const data = route.request().postDataJSON().data;
      expect(Object.keys(data).sort()).toEqual(['displayName', 'username']);
      await route.fulfill({
        json: {
          ...session,
          user: { ...session.user, name: data.displayName, username: data.username },
        },
      });
    } else await route.fulfill({ json: session });
  });
  await page.goto('/account');
  await expect(page.getByLabel('Verified Google email')).toHaveAttribute('readonly', '');
  await page.getByLabel('Username', { exact: true }).fill('updated_user');
  await page.getByLabel('Display name', { exact: true }).fill('Updated User');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Profile updated for this browser session');
  await expect(page.getByLabel('Verified Google email')).toHaveValue('student@example.test');
  await expect(page.getByRole('heading', { name: 'Updated User' })).toBeVisible();
});
