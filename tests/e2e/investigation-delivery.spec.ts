import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 390]) {
  test(`investigation delivery is consistent and survives reload at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/analysis');
    await expect(page.getByRole('heading', { name: 'Data quality inspector' })).toBeVisible();
    await page.getByRole('button', { name: 'Run analysis', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Export native-grid hotspots' })).toBeVisible();
    await page.getByLabel('Explanation language').selectOption('bn');
    await page.getByRole('button', { name: 'কী পরিবর্তন হয়েছে?' }).click();
    await expect(page.locator('.answer')).toContainText('কৃত্রিম');
    await expect(page.locator('.answer')).toContainText('Number check: passed');
    await page.getByLabel('Question about the data').fill('Predict damage and casualties');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.locator('.answer')).toContainText('প্রমাণ নেই');

    const pdfPending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download evidence PDF' }).click();
    const pdf = await pdfPending; await pdf.saveAs(`output/pdf/sarflow-evidence-${width}.pdf`);
    expect((await readFile(`output/pdf/sarflow-evidence-${width}.pdf`)).subarray(0, 5).toString()).toBe('%PDF-');
    const htmlPending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download offline brief' }).click();
    const html = await htmlPending, briefPath = path.resolve(`artifacts/sarflow-offline-${width}.html`);
    await html.saveAs(briefPath); const brief = await readFile(briefPath, 'utf8');
    expect(Buffer.byteLength(brief)).toBeLessThan(256_000);

    await page.getByLabel('Investigation title').fill('Review case');
    await page.getByLabel('Hypothesis (user interpretation)').fill('Needs independent reference evidence');
    await page.getByLabel('Investigation notes').fill('<script>unsafe()</script> is a text-only note');
    await page.getByRole('button', { name: 'Save investigation locally' }).click();
    await expect(page.getByText('Investigation saved on this browser.', { exact: false })).toBeVisible();
    await page.getByRole('link', { name: 'Open saved investigations', exact: true }).click();
    await page.reload(); await page.getByRole('button', { name: /Review case/ }).click();
    await expect(page.locator('.saved-user-notes').last()).toContainText('<script>unsafe()</script>');
    await expect(page.getByRole('heading', { name: 'Change hotspots' })).toBeVisible();
    const exportPending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export investigation with notes' }).click();
    const saved = await exportPending; const savedPath = (await saved.path())!;
    await page.getByLabel('Import evidence JSON locally').setInputFiles(savedPath);
    await expect(page.getByRole('heading', { name: 'Imported investigation / review before saving' })).toBeVisible();
    await expect(page.getByLabel('Investigation notes')).toHaveValue('<script>unsafe()</script> is a text-only note');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.filter(v => ['critical', 'serious'].includes(v.impact ?? '')).map(v => v.id)).toEqual([]);
    await page.screenshot({ path: `artifacts/investigation-delivery-${width}.png`, fullPage: true });

    const isolated = await context.newPage();
    await isolated.setViewportSize({ width, height: 950 });
    await context.setOffline(true);
    await isolated.goto('file:///' + briefPath.replaceAll('\\', '/'));
    await expect(isolated.getByRole('heading', { name: 'SARFlow / Offline evidence brief' })).toBeVisible();
    await expect(isolated.locator('body')).toContainText('SYNTHETIC');
    expect(await isolated.locator('script,link,img,iframe').count()).toBe(0);
    const printPreview = await isolated.pdf({ format: 'A4', preferCSSPageSize: true });
    expect((printPreview.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length).toBe(1);
    await isolated.screenshot({ path: `artifacts/offline-brief-${width}.png`, fullPage: true });
    await isolated.close(); await context.setOffline(false);
    expect(errors).toEqual([]);
  });
}
