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

test('retained investigation restores its comparison and evidence after reload',async({page})=>{
 const id='12345678-1234-4123-8123-123456789abc';
 await page.route('**/api/water/inputs',r=>r.fulfill({json:{inputs:[],workerAvailable:true}}));
 await page.route(`**/api/water/jobs/${id}`,r=>r.fulfill({json:{status:'complete',message:'Retained software fixture',result:result('Retained investigation')}}));
 await page.goto(`/water?job=${id}`);
 await expect(page.locator('.location-watermark')).toContainText('Retained investigation');
 await page.getByLabel('Result lens').selectOption('compare');
 await page.getByLabel('Water comparison swipe').fill('35');
 await expect(page.locator('.water-after')).toHaveCSS('clip-path','inset(0px 0px 0px 35%)');
 await expect(page.getByRole('link',{name:'classes GeoTIFF'})).toHaveAttribute('href',`/api/water/jobs/${id}/files/classes.tif`);
 await page.reload();
 await expect(page.locator('.location-watermark')).toContainText('Retained investigation');
 await expect(page.getByRole('button',{name:'Export water evidence JSON'})).toBeVisible();
});

test('interrupted retained job shows failure without partial results',async({page})=>{
 const id='12345678-1234-4123-8123-123456789abc';
 await page.route('**/api/water/inputs',r=>r.fulfill({json:{inputs:[],workerAvailable:true}}));
 await page.route(`**/api/water/jobs/${id}`,r=>r.fulfill({json:{status:'failed',message:'Server restarted during processing. Partial outputs are unavailable; submit a new job.',result:null}}));
 await page.goto(`/water?job=${id}`);
 await expect(page.getByText(/Server restarted during processing/).first()).toBeVisible();
 await expect(page.locator('.location-watermark')).toHaveCount(0);
});

test('evaluation shows pending and rejects inconsistent metrics',async({page})=>{
 const id='12345678-1234-4123-8123-123456789abc';
 await page.route('**/api/water/inputs',r=>r.fulfill({json:{inputs:[],workerAvailable:true}}));
 await page.route(`**/api/water/jobs/${id}`,r=>r.fulfill({json:{status:'complete',message:'Software fixture',result:result('Evaluation test')}}));
 await page.route(`**/api/water/jobs/${id}/evaluation`,r=>r.fulfill({json:{status:'pending',evaluation:null}}));
 await page.goto(`/water?job=${id}`);
 await expect(page.getByText('Independent evaluation pending. No reference agreement metrics are available.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Export evaluation receipt JSON'})).toHaveCount(0);
 await page.route(`**/api/water/jobs/${id}/evaluation`,r=>r.fulfill({json:{status:'available',evaluation:{metrics:{accuracy:1}}}}));
 await page.reload();
 await expect(page.getByText('Invalid evaluation receipt. Metrics withheld.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Export evaluation receipt JSON'})).toHaveCount(0);
});

test('software evaluation is labelled and exports its actual receipt',async({page})=>{
 const id='12345678-1234-4123-8123-123456789abc', hash='a'.repeat(64);
 const evaluation={schemaVersion:'1.0',method:'target-water-pixel-agreement-v1',status:'software-fixture-only',createdAt:'2026-01-01T00:00:00Z',predictionSha256:hash,processingReceiptSha256:hash,
 reference:{source:'Independent software labels',acquisitionTime:'2026-01-01T00:00:00Z',samplingMethod:'All fixture cells',preparationMethod:'Known values',limitations:'Synthetic only',independentOfPrediction:true,sha256:hash,files:[]},
 scope:{bounds:[0,0,1,1],crs:'EPSG:32646',observations:[]},sampleUnit:'raster pixel',sampleSize:4,
 support:{totalCells:6,classifiedCells:4,referenceValidCells:6,evaluatedCells:4,excludedCells:2},confusionMatrix:{truePositive:1,falsePositive:1,falseNegative:1,trueNegative:1},
 metrics:{precision:.5,recall:.5,f1:.5,intersectionOverUnion:1/3,accuracy:.5},limitations:['Not real scientific validation']};
 await page.route('**/api/water/inputs',r=>r.fulfill({json:{inputs:[],workerAvailable:true}}));
 await page.route(`**/api/water/jobs/${id}`,r=>r.fulfill({json:{status:'complete',message:'Software fixture',result:result('Evaluation test')}}));
 await page.route(`**/api/water/jobs/${id}/evaluation`,r=>r.fulfill({json:{status:'available',evaluation}}));
 await page.goto(`/water?job=${id}`);
 await expect(page.getByText('Software fixture only — not real-world accuracy.')).toBeVisible();
 const section=page.getByRole('region',{name:'Independent evaluation'});
 await expect(section.getByText('50.00%').first()).toBeVisible();
 await expect(section.getByText('Evaluated: 4 pixels. Excluded: 2 of 6 window pixels.')).toBeVisible();
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export evaluation receipt JSON'}).click();
 expect((await download).suggestedFilename()).toBe('sarflow-water-evaluation.json');
});
