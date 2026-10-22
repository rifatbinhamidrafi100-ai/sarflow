import { test, expect } from '@playwright/test';

for (const width of [1440, 900, 801, 390, 320]) {
  test(`observation controls remain inside their panels and clickable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/global-radar?*', r => r.fulfill({ json: { empty: true, message: 'No new observations in this layout test.' } }));
    await page.goto('/observatory?region=brahmaputra');
    await expect(page.getByText('Archived imagery loaded', { exact: true })).toBeVisible();
    const toolbar = page.locator('.obs-stage-toolbar');
    const compare = toolbar.getByRole('button', { name: 'Compare', exact: true });
    const parent = (await toolbar.boundingBox())!;
    for (const control of [compare, toolbar.getByRole('button', { name: 'Observe', exact: true }), page.getByLabel('Radar image detail')]) {
      const bounds = (await control.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(parent.x);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(parent.x + parent.width);
    }
    await compare.click();
    await expect(compare).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('Comparison studio mode').selectOption('opacity');
    await page.getByRole('slider', { name: 'Real imagery swipe' }).fill('35');
    await page.getByLabel('Comparison studio mode').selectOption('split');
    await expect(page.locator('.observation-map-overlay')).toHaveCSS('clip-path', 'inset(0px 0px 0px 50%)');
    await expect(page.getByRole('slider', { name: 'Real imagery swipe' })).toBeDisabled();
    const map = (await page.locator('.obs-map-wrap').boundingBox())!;
    for (const name of ['Zoom in map', 'Zoom out map', 'Fit observation', 'Fullscreen map']) {
      const button = page.getByRole('button', { name, exact: true });
      const bounds = (await button.boundingBox())!;
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(map.y + map.height);
      await button.click();
      if (name === 'Fullscreen map') {
        await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
        await page.evaluate(() => document.exitFullscreen());
      }
    }
    await toolbar.getByRole('button', { name: 'Observe', exact: true }).click();
    await expect(page.getByLabel('Comparison studio mode')).toBeHidden();
    await page.getByLabel('Radar image detail').selectOption('384');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `artifacts/controls-fixed-${width}.png`, fullPage: true });
  });
}
