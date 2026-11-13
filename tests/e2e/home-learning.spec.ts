import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('learning guides appear before the existing place cards and open the real pages', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const learning = page.getByRole('region', { name: 'Learn with SARFlow' });
  await expect(learning.getByRole('link')).toHaveCount(2);
  await expect(page.locator('.real-region-card')).toHaveCount(4);
  expect(
    await learning.evaluate((element) =>
      Boolean(
        element.compareDocumentPosition(document.querySelector('.real-region-section')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  await learning.getByRole('link', { name: /Beginner guide/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Your first look at Earth with SARFlow.',
  );
  await page.goBack();
  await learning.getByRole('link', { name: /NISAR learning resources/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('NISAR learning resources');
  await expect(page.locator('.learning-card')).toHaveCount(8);
  expect(errors).toEqual([]);
});

test('learning cards remain readable and reachable on phones, tablet and desktop', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const learning = page.getByRole('region', { name: 'Learn with SARFlow' });
  for (const width of [320, 390, 801, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await learning.scrollIntoViewIfNeeded();
    const boxes = await learning.locator('a').evaluateAll((links) =>
      links.map((link) => {
        const rect = link.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }),
    );
    expect(boxes).toHaveLength(2);
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width + 1);
    }
    if (width <= 390) expect(boxes[1].top).toBeGreaterThanOrEqual(boxes[0].bottom);
    else expect(Math.abs(boxes[1].top - boxes[0].top)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  expect(
    (
      await new AxeBuilder({ page })
        .include('.real-learning-section')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await learning.screenshot({ path: 'artifacts/home-learning-desktop-light.png' });
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await learning.scrollIntoViewIfNeeded();
  const darkAudit = await new AxeBuilder({ page }).include('.real-learning-section')
    .withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(darkAudit.violations).toEqual([]);
  await learning.screenshot({ path: 'artifacts/home-learning-desktop-dark.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await learning.screenshot({ path: 'artifacts/home-learning-phone-dark.png' });
});
