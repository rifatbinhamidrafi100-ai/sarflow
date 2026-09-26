import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('actual imagery workflow, geographic comparison, evidence and export',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await page.getByRole('link',{name:'Explore real observations',exact:true}).click();
 await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();await expect(page.locator('.obs-map-error')).toHaveCount(0);
 await page.getByRole('button',{name:'Previous acquisition'}).click();await expect(page.getByRole('slider',{name:'Real acquisition timeline'})).toHaveValue('2');
 await page.getByRole('button',{name:'Compare',exact:true}).click();await page.getByRole('slider',{name:'Real imagery swipe'}).fill('30');await expect(page.locator('.observation-map-overlay')).toHaveCSS('clip-path','inset(0px 0px 0px 30%)');
 await page.getByRole('button',{name:'Zoom in map'}).click();await page.getByRole('button',{name:'Fit observation'}).click();
 await page.getByRole('textbox',{name:'Your visual interpretation'}).fill('Visual contrast only; independent verification needed.');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export investigation',exact:true}).click();expect((await download).suggestedFilename()).toContain('brahmaputra');
 await page.getByRole('button',{name:'Evidence',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('NISAR_L2_GCOV_PROVISIONAL_V1');await expect(page.getByRole('dialog')).toContainText('SHA-256');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Puget Sound Washington, United States'}).click();await expect(page.getByRole('textbox',{name:'Your visual interpretation'})).toHaveValue('');await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Observe',exact:true}).click();await page.getByRole('button',{name:'Play observations',exact:true}).click();await expect(page.getByRole('button',{name:'Pause observations'})).toBeVisible();await page.getByRole('button',{name:'Pause observations'}).click();
 await page.getByRole('button',{name:'Switch to dark theme'}).click();const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();expect(a11y.violations).toEqual([]);
 expect(errors).toEqual([]);
});
test('real archive errors are not replaced with synthetic observations',async({page})=>{
 await page.route('**/api/observatory',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));await page.goto('/observatory');await expect(page.getByRole('heading',{name:'Real observation archive unavailable'})).toBeVisible();await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();await expect(page.locator('.observation-map')).toHaveCount(0);
 await page.unroute('**/api/observatory');await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
});

test('region history resets interpretation and shorter archives select a valid frame',async({page})=>{
 await page.route('**/api/observatory',async route=>{
  const response=await route.fetch();const archive=await response.json();
  archive.regions.forEach((region:{observations:unknown[]})=>region.observations.pop());
  await route.fulfill({response,json:archive});
 });
 await page.goto('/observatory?region=brahmaputra');
 await expect(page.getByRole('slider',{name:'Real acquisition timeline'})).toHaveValue('2');
 await expect(page.locator('.obs-frame-number')).toHaveText('3/ 3');
 await page.getByRole('button',{name:'Puget Sound Washington, United States'}).click();
 await page.getByRole('textbox',{name:'Your visual interpretation'}).fill('Puget Sound only');
 await page.goBack();
 await expect(page.getByRole('textbox',{name:'Your visual interpretation'})).toHaveValue('');
});
