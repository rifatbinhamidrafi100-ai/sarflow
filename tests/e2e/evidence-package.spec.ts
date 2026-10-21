import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`exports the same evidence from analysis and drawer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/analysis');
    await page.getByRole('button', { name: 'Run analysis', exact: true }).click();
    const analysisExport = page.getByRole('button', { name: 'Export analysis JSON', exact: true });
    await expect(analysisExport).toBeVisible();
    const analysisDownload = page.waitForEvent('download');
    await analysisExport.click();
    const analysis = JSON.parse(await readFile((await (await analysisDownload).path())!, 'utf8'));
    expect(analysis.schemaVersion).toBe('1.0.0');
    expect(analysis.labels.result).toBe('illustrative');
    expect(analysis.result.areaKm2).toBeNull();
    expect(analysis.metrics.changedCells).toBe(analysis.result.changed);
    expect(analysis.validation.eventConfidence).toBeNull();

    await page.getByRole('button', { name: 'Inspect evidence', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Evidence format: 1.0.0');
    await page.screenshot({ path: `artifacts/evidence-package-${width}.png`, fullPage: true });
    const evidenceDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export evidence JSON', exact: true }).click();
    const evidence = JSON.parse(await readFile((await (await evidenceDownload).path())!, 'utf8'));
    expect(evidence).toEqual(analysis);
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    await page.getByRole('slider', { name: 'Change threshold' }).fill('4');
    await expect(analysisExport).toHaveCount(0);
    await page.getByRole('button', { name: 'Inspect evidence', exact: true }).click();
    const unrunDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export evidence JSON', exact: true }).click();
    const unrun = JSON.parse(await readFile((await (await unrunDownload).path())!, 'utf8'));
    expect(unrun.parameters.threshold).toBe(4);
    expect(unrun.quality.analysisStatus).toBe('not-run');
    expect(unrun.result).toBeNull();
    expect(unrun.metrics.changedCells).toBeNull();
    expect(errors).toEqual([]);
  });
}
