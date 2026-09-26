import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
const archive=JSON.parse(readFileSync('public/data/observatory.json','utf8'));
const fixture=readFileSync('public/observations/nepal-rasuwa-thumbnail.png');
test('globe → location → acquisitions → previous comparison → receipts',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://tiles.maps.eox.at/**',r=>r.fulfill({contentType:'image/png',body:fixture}));
 await page.route('**/api/global-radar?*',r=>r.fulfill({json:{...archive,regions:[archive.regions[0]]}}));
 const frame=archive.regions[0].observations[0];
 await page.route('**/api/coverage?*',r=>r.fulfill({json:{date:frame.date,retrieved:archive.retrieved,query:archive.regions[0].query,collection:archive.collection,total:200,truncated:true,records:[{id:frame.id,title:frame.title,acquired:frame.acquired,source:frame.source,polygon:frame.polygon}]}}));
 await page.goto('/world');await expect(page.getByText('World imagery loaded',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Drop me anywhere'}).click();await expect(page.getByText('World imagery loaded',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Load dated footprints'}).click();await expect(page.getByText(/1 footprints shown of 200/)).toBeVisible();
 await page.getByRole('button',{name:'Discover observations here'}).click();await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Compare previous observation'}).click();await expect(page.getByLabel('Reference acquisition')).toHaveValue('2');
 await page.getByLabel('Comparison studio mode').selectOption('opacity');await page.getByLabel('Real imagery swipe').fill('30');await expect(page.locator('.observation-map-overlay')).toHaveCSS('opacity','0.3');
 await page.getByLabel('Comparison studio mode').selectOption('split');await expect(page.locator('.observation-map-overlay')).toHaveCSS('clip-path','inset(0px 0px 0px 50%)');
 await expect(page.getByRole('button',{name:'Difference — calibrated data required'})).toBeDisabled();
 await page.getByRole('button',{name:'Show me the receipts',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Show me the receipts'});await expect(dialog).toContainText('NISAR_L2_GCOV_PROVISIONAL_V1');await expect(dialog).toContainText('No calibrated difference');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export Change DNA & receipts'}).click();expect((await download).suggestedFilename()).toBe('sarflow-change-dna.json');await page.keyboard.press('Escape');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);}
 await page.screenshot({path:'artifacts/earth-investigation-mobile.png',fullPage:true});
 await page.getByLabel('World latitude').fill('0');await expect(page.getByRole('button',{name:'Play observations'})).toHaveCount(0);expect(errors).toEqual([]);
});
test('empty and failed location discovery retain honest recovery states',async({page})=>{
 await page.route('https://tiles.maps.eox.at/**',r=>r.fulfill({contentType:'image/png',body:fixture}));
 await page.route('**/api/global-radar?*',r=>r.fulfill({json:{empty:true,noObservations:true,message:'No matching records in this collection.'}}));
 await page.goto('/world');await page.getByRole('button',{name:'Discover observations here'}).click();await expect(page.getByText(/NO OBSERVATION AVAILABLE FOR THIS LOCATION/)).toBeVisible();await expect(page.getByRole('button',{name:'Play observations'})).toHaveCount(0);
 await page.unroute('**/api/global-radar?*');await page.route('**/api/global-radar?*',r=>r.fulfill({status:502,json:{error:'NASA catalog temporarily unavailable'}}));await page.getByRole('button',{name:'Discover observations here'}).click();await expect(page.getByRole('button',{name:'Retry observation discovery'})).toBeVisible();
});
test('computed teaching result exposes DNA, exact profile and receipts',async({page})=>{
 await page.goto('/analysis');await page.getByRole('button',{name:'Run analysis',exact:true}).click();await expect(page.getByRole('heading',{name:'Change DNA',exact:true})).toBeVisible();await expect(page.locator('.investigation>header').getByText('SYNTHETIC DEMO · not an Earth event',{exact:true})).toBeVisible();await page.getByLabel('Spatial profile row').fill('12');await page.getByText('Profile values, source & method',{exact:true}).click();await expect(page.locator('.profile-table tbody tr')).toHaveCount(48);await page.getByRole('button',{name:'Show me the receipts'}).click();await expect(page.getByRole('dialog',{name:'Show me the receipts'})).toContainText(/threshold/i);
});
