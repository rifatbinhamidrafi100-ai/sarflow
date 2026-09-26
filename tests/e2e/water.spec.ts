import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const result=(name:string)=>({location:name,dataType:'synthetic-software-fixture',commonValidCells:1,counts:{'1':1},legend:{'1':'Persistent candidate'},observations:[{id:'test',date:'2026-01-01'}],perDateValidCells:[1],temporalMeansDb:[-25],thresholdBaseline:{candidateCells:0},limitations:['Software fixture only; no real accuracy evaluation.'],previews:[],outputs:['classes'],window:{width:16,height:16}});
test('rerun with delayed submission retains only the new result and download job',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let submissions=0,aPolls=0,releaseB:()=>void=()=>{};
 const held=new Promise<void>(r=>releaseB=r);
 await page.route('**/api/water/inputs',r=>r.fulfill({json:{inputs:[{id:'test',location:'Software fixture',dataType:'synthetic-software-fixture',dates:4}],workerAvailable:true}}));
 await page.route('**/api/water/jobs',async r=>{submissions++;if(submissions===2){expect(r.request().postDataJSON().parameters.co_db).toBe(-20);await held;}await r.fulfill({status:202,json:{id:submissions===1?'A':'B'}});});
 await page.route('**/api/water/jobs/A',async r=>{aPolls++;await r.fulfill({json:{status:'complete',message:'A completed',result:result('Result A')}});});
 await page.route('**/api/water/jobs/B',r=>r.fulfill({json:{status:'complete',message:'B completed',result:result('Result B')}}));
 await page.goto('/water');const run=page.getByRole('button',{name:'Run water-candidate analysis'});await run.click();await expect(page.locator('.location-watermark')).toContainText('Result A');
 await page.getByLabel('Co-pol threshold (dB)').fill('-20');await run.click();await expect.poll(()=>submissions).toBe(2);await expect(run).toBeDisabled();await expect(page.getByRole('button',{name:'Cancel processing'})).toBeDisabled();await expect(page.locator('.location-watermark')).toHaveCount(0);
 // An old endpoint still returns A; B's delayed submission must never restart its poll.
 await page.waitForTimeout(1000);expect(aPolls).toBe(1);releaseB();await expect(page.locator('.location-watermark')).toContainText('Result B');await expect(page.getByRole('link',{name:'classes GeoTIFF'})).toHaveAttribute('href','/api/water/jobs/B/files/classes.tif');
 await page.getByLabel('Result lens').selectOption('compare');await page.getByLabel('Water comparison swipe').fill('30');await expect(page.locator('.water-after')).toHaveCSS('clip-path','inset(0px 0px 0px 30%)');
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);}
 await page.screenshot({path:'artifacts/water-mobile-fixture.png',fullPage:true});expect(errors).toEqual([]);
});
test('water page has an honest empty state and loads without MapLibre',async({page})=>{
 const scripts:string[]=[];page.on('request',r=>{if(r.resourceType()==='script')scripts.push(r.url());});
 await page.route('**/api/water/inputs',r=>r.fulfill({json:{inputs:[],workerAvailable:true}}));await page.goto('/water');await expect(page.getByText(/No calibrated GCOV measurements are registered/)).toBeVisible();await expect(page.getByRole('button',{name:'Run water-candidate analysis'})).toBeDisabled();expect(scripts.some(s=>s.includes('maplibre'))).toBe(false);
});
