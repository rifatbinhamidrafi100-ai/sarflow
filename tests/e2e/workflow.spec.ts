import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('judge critical flow, evidence, timeline, comparison and export',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'See Earth Move.'})).toBeVisible();
 await page.getByRole('link',{name:'Open analysis lab',exact:true}).click();await expect(page.locator('.maplibregl-canvas')).toBeVisible();
 await page.getByRole('button',{name:'Brahmaputra floodplain'}).click();
 await page.getByRole('button',{name:'Step back',exact:true}).click();await expect(page.getByRole('slider',{name:'Observation timeline'})).toHaveValue('4');
 await page.getByRole('button',{name:'Play',exact:true}).click();await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();await page.getByRole('button',{name:'Pause',exact:true}).click();
 await page.getByRole('button',{name:'Run analysis',exact:true}).click();await expect(page.getByRole('button',{name:'Change mask',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Inspect evidence',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).toContainText('SYNTHETIC-POWER');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export evidence JSON'}).click();expect((await download).suggestedFilename()).toContain('evidence.json');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('link',{name:'Before / after',exact:true}).click();await page.getByRole('slider',{name:'Swipe position'}).fill('70');await page.getByRole('button',{name:'opacity',exact:true}).click();await expect(page.getByRole('slider',{name:'After opacity'})).toHaveValue('70');
 await page.getByRole('link',{name:'Interpret change'}).click();await expect(page.getByText('Cells above threshold', {exact:true})).toBeVisible();await expect(page.getByText('Event confidence:',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'What are the limitations?'}).click();await expect(page.locator('.answer')).toContainText('synthetic');
 await page.getByRole('slider',{name:'Change threshold'}).fill('4');await expect(page.getByRole('heading',{name:'No analysis for these settings'})).toBeVisible();expect(errors).toEqual([]);
});
test('major pages, desktop/mobile overflow, accessibility and local network',async({page})=>{
 const failures:string[]=[];page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:5186')&&r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});for(const route of ['/','/observatory','/explore','/time-machine','/compare','/analysis','/cases','/cases/nepal-rasuwa-2026','/cases/delta','/cases/fields','/cases/forest','/science','/data','/methodology','/about']){
  await page.goto(route);await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('main')).not.toContainText('Something interrupted');if(route==='/observatory')await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();else await page.waitForTimeout(150);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} at ${width}`).toBe(true);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();expect(results.violations.filter(v=>v.impact==='critical'||v.impact==='serious').map(v=>`${v.id}: ${v.nodes.map(n=>n.target).join()}`),`${route} at ${width}`).toEqual([]);
 }}expect(failures).toEqual([]);
});
test('service failure, retry, empty results and catalog failure are honest',async({page})=>{
 await page.route('**/api/datasets',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Test source unavailable'})}));await page.goto('/explore');await expect(page.getByText('Test source unavailable')).toBeVisible();await page.unroute('**/api/datasets');await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByRole('button',{name:'Run analysis'})).toBeVisible();
 await page.route('**/api/catalog?*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:[],retrieved:'2026-09-23',cached:false})}));await page.getByRole('button',{name:'Search NASA catalog'}).click();await expect(page.getByText('No NISAR beta GCOV observations returned for this region.')).toBeVisible();
 await page.unroute('**/api/catalog?*');await page.route('**/api/catalog?*',r=>r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'NASA catalog returned HTTP 503'})}));await page.getByRole('button',{name:'Search NASA catalog'}).click();await expect(page.getByText('NASA catalog returned HTTP 503')).toBeVisible();await expect(page.getByRole('button',{name:'Retry catalog'})).toBeVisible();
});
