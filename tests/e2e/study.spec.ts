import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { demoDatasets } from '../../shared/demo';

for (const width of [1440, 390]) {
  test(`focused study preserves evidence boundaries and exports at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/datasets', route => route.fulfill({ json: demoDatasets }));
    await page.goto('/study');
    await expect(page.getByRole('heading', { name: 'Brahmaputra: follow the radar evidence' })).toBeVisible();
    await expect(page.getByText('No eligible calibrated numerical input is registered', { exact: false })).toBeVisible();
    await expect(page.getByText('Independent evaluation has not been supplied', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A verified GCOV reader check' })).toBeVisible();
    await expect(page.getByText('-12.22 dB', { exact: true })).toBeVisible();
    const measurementPending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download real measurement check' }).click();
    const measured = JSON.parse(await readFile((await (await measurementPending).path())!, 'utf8'));
    expect(measured.channels.HHHH.validPixels).toBe(4096);
    expect(measured.changeCalculated).toBe(false);
    expect(measured.independentValidation).toBe(false);
    const downloadPending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download study evidence and gaps' }).click();
    const download = await downloadPending;
    const report = JSON.parse(await readFile((await download.path())!, 'utf8'));
    expect(report.numericalCandidates).toHaveLength(0);
    expect(report.eventConfirmed).toBe(false);
    expect(report.accuracy).toBeNull();
    expect(report.registryStatus).toBe('checked');
    await page.getByText('Observation receipts', { exact: true }).click();
    await expect(page.getByText('Browse SHA-256:', { exact: false }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter(v => ['critical', 'serious'].includes(v.impact ?? ''))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('an unavailable numerical registry is not reported as a checked empty registry', async ({ page }) => {
  await page.route('**/api/datasets', route => route.fulfill({ status: 503, json: { error: 'Offline fixture' } }));
  await page.goto('/study');
  await expect(page.getByText('The numerical registry is unavailable.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download study evidence and gaps' })).toHaveCount(0);
});

test('home starts with the focused investigation and keeps global exploration', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Start the evidence investigation' })).toHaveAttribute('href', '/study');
  await expect(page.getByRole('link', { name: 'Explore the whole world' })).toHaveAttribute('href', '/world');
});

test('a loaded archive without this study is unavailable rather than loading forever', async ({ page }) => {
  const archive = JSON.parse(await readFile('public/data/observatory.json', 'utf8'));
  archive.regions = archive.regions.filter((region: { id: string }) => region.id !== 'brahmaputra');
  await page.route('**/api/observatory', route => route.fulfill({ json: archive }));
  await page.goto('/study');
  await expect(page.getByText('Archived observations for this study are unavailable.', { exact: false })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download study evidence and gaps' }).click();
  const report = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(report.browseStatus).toBe('unavailable');
  expect(report.browseEvidence).toBeNull();
});
