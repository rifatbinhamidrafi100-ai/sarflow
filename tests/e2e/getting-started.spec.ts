import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('both lab help links scroll to the walkthrough after client-side navigation', async ({page}) => {
  for (const route of ['/explore', '/analysis']) {
    await page.goto(route);
    await page.locator('a[href="/getting-started#analysis-lab-guide"]').first().click();
    await expect(page).toHaveURL(/\/getting-started#analysis-lab-guide$/);
    await expect(page.getByRole('heading', {name:'Understand the Analysis lab', exact:true})).toBeInViewport();
    await expect(page.locator('video')).toBeInViewport();
  }
});

test('beginner guide opens from resources, explains terms and fits desktop and mobile', async ({page}) => {
  await page.goto('/resources');
  await page.getByRole('link', {name:'Read the beginner guide'}).click();
  await expect(page).toHaveURL(/\/getting-started$/);
  await expect(page.getByRole('heading', {level:1})).toHaveText('Your first look at Earth with SARFlow.');
  await expect(page.locator('.beginner-steps > li')).toHaveCount(6);
  await page.getByRole('link', {name:'Simple definitions', exact:true}).click();
  await page.getByText('Backscatter', {exact:true}).click();
  await expect(page.getByText(/The strength of the radar signal/)).toBeVisible();
  await page.getByRole('link', {name:'Common questions', exact:true}).click();
  await page.getByText('Does “not calculated” mean there was no flooding?', {exact:true}).click();
  await expect(page.getByText(/It means that measurement has not been produced/)).toBeVisible();
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
    await page.screenshot({path:`artifacts/beginner-guide-${width}.png`,fullPage:true});
  }
  await page.getByRole('link', {name:'Explore a place',exact:true}).click();
  await expect(page).toHaveURL(/\/world$/);
});

test('lab walkthrough video plays and explanations distinguish examples from measurements', async ({page}) => {
  await page.goto('/getting-started#analysis-lab-guide');
  const video = page.locator('video');
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => Number.isFinite(element.duration) && element.duration > 40)).toBe(true);
  await video.evaluate((element: HTMLVideoElement) => {element.muted = true; return element.play();});
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(.2);
  await video.evaluate((element: HTMLVideoElement) => {element.pause();element.currentTime=25;});
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(2);
  await page.screenshot({path:'artifacts/lab-guide-video-frame.png'});
  await page.getByText('Change threshold and dB',{exact:true}).click();
  await expect(page.getByText(/a change from −12 dB to −16 dB/)).toBeVisible();
  await page.getByText('Read the video transcript',{exact:true}).click();
  await expect(page.getByText('First, check the data label.',{exact:true})).toBeVisible();
});
