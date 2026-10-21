import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
const archive=JSON.parse(readFileSync('public/data/observatory.json','utf8'));

test('observation panels preserve dates and comparisons while resizing both canvases',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/global-radar?*',r=>r.fulfill({json:{empty:true,message:'No additional eligible observations in this check.'}}));
 await page.setViewportSize({width:1440,height:1000});await page.goto('/observatory?region=brahmaputra');
 await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
 const left=page.getByRole('complementary',{name:'Observation location and data'}),right=page.getByRole('complementary',{name:'Observation results'});
 await expect(left).toBeVisible();await expect(right).toContainText('Not calculated');await expect(page.getByLabel('Radar opacity')).not.toBeVisible();
 const region=archive.regions.find((r:{id:string})=>r.id==='brahmaputra');
 await page.getByLabel('Selected observation date').selectOption('2');await expect(right.locator('time').first()).toHaveAttribute('datetime',region.observations[2].acquired);
 await page.getByRole('button',{name:'Compare previous observation'}).click();await expect(page.getByLabel('Reference acquisition')).toHaveValue('1');await expect(right.locator('time').nth(1)).toHaveAttribute('datetime',region.observations[1].acquired);
 const canvas=page.locator('.observation-map-canvas').first().locator('canvas');const width=await canvas.evaluate(e=>e.clientWidth);
 await page.getByRole('button',{name:'Hide location & data',exact:true}).click();await page.getByRole('button',{name:'Hide results',exact:true}).click();
 await expect(left).toBeHidden();await expect(right).toBeHidden();await expect.poll(()=>canvas.evaluate(e=>e.clientWidth)).toBeGreaterThan(width+400);
 await expect.poll(()=>page.locator('.observation-map-overlay canvas').evaluate(e=>e.clientWidth)).toBeGreaterThan(width+400);
 await page.getByRole('button',{name:'Show location & data',exact:true}).click();await page.getByRole('button',{name:'Show results',exact:true}).click();
 await expect(page.getByLabel('Selected observation date')).toHaveValue('2');await expect(page.getByLabel('Reference acquisition')).toHaveValue('1');
 await page.getByRole('button',{name:'Puget Sound Washington, United States'}).click();await expect(page.getByRole('heading',{name:'Recent locations'})).toBeVisible();
 await page.locator('.obs-recent').getByRole('button',{name:'Brahmaputra floodplain',exact:true}).click();
 await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
 for(const viewport of [{width:1440,height:1000},{width:900,height:1000},{width:801,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:`artifacts/observatory-panels-${viewport.width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Hide location & data',exact:true}).click();await expect(left).toBeHidden();await page.getByRole('button',{name:'Show location & data',exact:true}).click();
 await page.locator('.obs-advanced > summary').click();await expect(page.getByLabel('Radar opacity')).toBeVisible();
 await page.getByLabel('Study boundary & center').uncheck();await page.getByLabel('Matching granule footprint').check();
 await page.getByRole('button',{name:'Use archived image viewer'}).click();await page.getByRole('button',{name:'Compare',exact:true}).click();await page.setViewportSize({width:900,height:1000});
 const bounds=await page.locator('.obs-map-wrap').boundingBox(),image=await page.locator('.archive-compare').boundingBox();expect(image!.height).toBeLessThanOrEqual(bounds!.height+1);
 expect(errors).toEqual([]);
});
