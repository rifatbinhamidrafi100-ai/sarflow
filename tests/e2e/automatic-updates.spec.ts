import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const archive=JSON.parse(readFileSync('public/data/observatory.json','utf8'));

test('new dates update automatically, retain history and notes, and fail without fabricated replacement',async({page})=>{
 let requests=0;
 const region=archive.regions.find((r:{id:string})=>r.id==='brahmaputra');
 await page.route('**/api/monitoring',r=>r.fulfill({json:{configured:false,status:'not-configured',message:'Scheduled processor is not connected.'}}));
 await page.route('**/api/global-radar?**',route=>{
  requests++;
  if(requests>=4)return route.fulfill({status:502,json:{error:'NASA unavailable'}});
  const observations=[...region.observations];
  for(let i=1;i<requests;i++)observations.push({...region.observations.at(-1),id:`G99900${i}-ASF`,date:`2026-10-0${i}`,acquired:`2026-10-0${i}T12:00:00Z`,sha256:null,bytes:null});
  return route.fulfill({json:{...archive,retrieved:'2026-10-02T12:00:00Z',regions:[{...region,observations}]}});
 });
 // Existing archived PNG stands in for NASA network rendering in this UI-only test.
 await page.route('https://gibs.earthdata.nasa.gov/**',r=>r.fulfill({contentType:'image/png',body:readFileSync('public'+region.observations[0].image)}));
 await page.goto('/observatory?region=brahmaputra');
 await expect(page.getByText(/NASA dates checked/)).toBeVisible();
 expect(requests).toBe(1);
 await page.getByRole('button',{name:'Use archived image viewer'}).click();
 await page.locator('.acquisition-list button').first().click();
 await page.getByRole('textbox',{name:'Your visual interpretation'}).fill('Preserve my historical comparison.');
 await page.getByRole('button',{name:'Check new dates now'}).click();
 await expect(page.locator('.acquisition-list button')).toHaveCount(5);
 await expect(page.getByRole('slider',{name:'Real acquisition timeline'})).toHaveValue('0');
 await expect(page.getByRole('textbox',{name:'Your visual interpretation'})).toHaveValue('Preserve my historical comparison.');
 await page.locator('.acquisition-list button').last().click();
 await page.getByRole('button',{name:'Check new dates now'}).click();
 await expect(page.locator('.acquisition-list button')).toHaveCount(6);
 await expect(page.getByRole('slider',{name:'Real acquisition timeline'})).toHaveValue('5');
 await page.getByRole('button',{name:'Check new dates now'}).click();
 await expect(page.getByText(/Previous observations are retained/)).toBeVisible();
 await expect(page.locator('.acquisition-list button')).toHaveCount(6);
 await expect(page.locator('.monitoring-status')).toContainText('Scheduled ingestion and processing are inactive here.');
 await page.screenshot({path:'artifacts/automatic-updates-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'artifacts/automatic-updates-mobile.png',fullPage:true});
});

test('global radar discovers a selected location without a manual search',async({page})=>{
 let calls=0;
 await page.route('**/api/global-radar?**',r=>{calls++;return r.fulfill({json:{empty:true,message:'No repeat observations in this test window.'}});});
 await page.goto('/global-radar?lat=28&lon=85.3');
 await expect(page.getByText('No repeat observations in this test window.')).toBeVisible();
 expect(calls).toBe(1);
});
