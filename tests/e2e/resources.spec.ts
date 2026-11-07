import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('official resources filter, share, reset and remain accessible on mobile', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/resources');
  await expect(page.locator('.learning-card')).toHaveCount(8);
  await expect(page.locator('.find-data-grid a')).toHaveCount(4);
  await page.getByLabel('Resource type').selectOption('StoryMap');
  await expect(page.locator('.learning-card')).toHaveCount(1);
  await expect(page.getByRole('heading', {name:'Spatial Subsetting for NISAR Data'})).toBeVisible();
  await page.getByRole('button', {name:'Copy link'}).click();
  await expect(page.getByRole('status')).toContainText('Link copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('type=StoryMap');
  await page.reload();
  await expect(page.locator('.learning-card')).toHaveCount(1);
  await page.getByRole('button', {name:'Clear filters'}).click();
  await page.getByLabel('Search resources').fill('Spanish');
  await expect(page.locator('.learning-card')).toHaveCount(1);
  await expect(page.locator('.learning-card a')).toHaveAttribute('href', /earthdata.nasa.gov\/es\//);
  await page.getByLabel('Search resources').fill('no-such-resource');
  await expect(page.getByText(/No resources match/)).toBeVisible();
  await page.getByRole('button', {name:'Clear filters'}).click();
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({path:'artifacts/resources-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'artifacts/resources-desktop.png',fullPage:true});
});
