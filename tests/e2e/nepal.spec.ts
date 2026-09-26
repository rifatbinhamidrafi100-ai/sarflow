import { test, expect } from '@playwright/test';

test('Nepal case connects reports, before/after evidence, and real map dates',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('link',{name:'Explore Nepal flood',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Nepal: the Rasuwa flood',exact:true})).toBeVisible();
 await expect(page.getByText('Reported flood; no validated satellite detection.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'16 Sept 2026 Fourth UNICEF situation report'}).click();
 await expect(page.locator('.nepal-timeline-detail')).toContainText('later response update');
 await expect(page.locator('.nepal-image-pair img')).toHaveCount(2);
 expect(await page.locator('.nepal-image-pair img').evaluateAll(images=>images.every(i=>(i as HTMLImageElement).src.includes('nepal-rasuwa')))).toBe(true);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export Nepal case evidence'}).click();
 const stream=await (await downloadPromise).createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);
 const report=JSON.parse(Buffer.concat(chunks).toString());expect(report.quantitativeResult).toBeNull();expect(report.observationRegion.id).toBe('nepal-rasuwa');expect(report.sources).toHaveLength(3);
 await page.getByRole('link',{name:'Explore Nepal radar dates',exact:true}).click();
 await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
 await expect(page.locator('.obs-frame-number')).toHaveText('3/ 3');
 await page.getByRole('button',{name:'Compare',exact:true}).click();await page.getByRole('slider',{name:'Real imagery swipe'}).fill('65');
 await page.getByRole('link',{name:'Read event reports and limitations'}).click();await expect(page.getByRole('heading',{name:'Nepal: the Rasuwa flood',exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test('Nepal event reports remain accessible when imagery API fails',async({page})=>{
 await page.route('**/api/observatory',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await page.goto('/cases/nepal-rasuwa-2026');await expect(page.getByRole('heading',{name:'What happened?'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Retry Nepal imagery'})).toBeVisible();await expect(page.locator('.nepal-image-pair')).toHaveCount(0);
});
