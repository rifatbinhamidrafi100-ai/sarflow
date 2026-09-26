import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
test('archived Brahmaputra comparison and evidence work without external services',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('/observatory?region=brahmaputra');
 await page.getByRole('button',{name:'Use archived image viewer'}).click();
 await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Radar opacity')).toBeDisabled();
 await page.getByRole('button',{name:'Play observations',exact:true}).click();
 await expect(page.getByLabel('Real acquisition timeline')).toHaveValue('1',{timeout:12000});
 await page.getByRole('button',{name:'Pause observations',exact:true}).click();
 await page.getByRole('button',{name:'Compare',exact:true}).click();
 await page.getByLabel('Real imagery swipe').fill('35');
 await expect(page.locator('.archive-after')).toHaveCSS('clip-path','inset(0px 0px 0px 35%)');
 await expect(page.locator('.archive-compare img').first()).toHaveJSProperty('naturalWidth',1024);
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export investigation',exact:true}).click();
 const download=await pending;await download.saveAs('artifacts/brahmaputra-investigation-export.json');
 const report=JSON.parse(await fs.readFile('artifacts/brahmaputra-investigation-export.json','utf8'));
 expect(report.quantitativeResult).toBeNull();expect(report.region.name).toContain('Brahmaputra');expect(report.before.sha256).toHaveLength(64);
 for(const width of [1440,390]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);await page.screenshot({path:`artifacts/brahmaputra-archive-${width}.png`,fullPage:true});}
 await page.getByRole('link',{name:'Check calibrated water analysis'}).click();
 await expect(page.getByText(/No calibrated GCOV measurements are registered/)).toBeVisible();expect(errors).toEqual([]);
});
test('archived image failure is explicit and retry recovers',async({page})=>{
 await page.route('**/observations/*.png',r=>r.abort());
 await page.goto('/observatory?region=brahmaputra');
 await page.getByRole('button',{name:'Use archived image viewer'}).click();
 await expect(page.getByRole('button',{name:'Retry archived images'})).toBeVisible();
 await page.unroute('**/observations/*.png');
 await page.getByRole('button',{name:'Retry archived images'}).click();
 await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
});
