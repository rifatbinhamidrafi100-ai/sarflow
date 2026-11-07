import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('phone navigation, install instructions and real APK download', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/install');
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Install' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Physical-device testing is still pending.', { exact: false })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Android APK' }).click();
  expect((await download).suggestedFilename()).toBe('sarflow-preview.apk');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'artifacts/mobile-install.png', fullPage: true });
  await navigation.getByRole('link', { name: 'Learn' }).click();
  await expect(page).toHaveURL(/getting-started/);
  await page.goto('/');
  await expect(page.locator('.phone-nav')).toBeVisible();
  await expect(page.locator('#radar-story')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/mobile-home.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(navigation).toBeHidden();
});

test('manifest references real icons and install stays honest without browser support', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  await page.goto('/install');
  await expect(page.getByRole('button', { name: 'Install SARFlow', exact: true })).toHaveCount(0);
  await expect(page.getByText('open in Safari', { exact: false })).toBeVisible();
});
