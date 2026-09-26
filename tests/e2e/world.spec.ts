import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
// Deterministic tile fixture tests controls, not real-world image content.
const image=readFileSync('public/observations/nepal-rasuwa-thumbnail.png');
test('global map navigation, place search, projection and attributed export',async({page})=>{
 await page.route('https://tiles.maps.eox.at/**',r=>r.fulfill({contentType:'image/png',body:image}));
 await page.route('**/api/places?*',r=>r.fulfill({json:{results:[{id:1,name:'Kathmandu',latitude:27.7,longitude:85.3,country:'Nepal'}]}}));
 await page.goto('/world');await expect(page.getByText('World imagery loaded',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Earth image quality')).toHaveValue('hd');
 expect(await page.locator('.world-canvas canvas').evaluate(c=>(c as HTMLCanvasElement).width/c.clientWidth)).toBeGreaterThanOrEqual(2);
 const highDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Save 4K Earth PNG',exact:true}).click();
 const high=await highDownload;const stream=await high.createReadStream();const chunks=[];for await(const chunk of stream!)chunks.push(chunk);const png=Buffer.concat(chunks);expect(png.readUInt32BE(16)).toBe(3840);expect(png.readUInt32BE(20)).toBe(2320);
 await page.getByLabel('Earth image quality').selectOption('standard');await expect(page.getByText('World imagery loaded',{exact:true})).toBeVisible();
 expect(await page.locator('.world-canvas canvas').evaluate(c=>(c as HTMLCanvasElement).width/c.clientWidth)).toBeCloseTo(1,1);
 await page.getByLabel('City or place name').fill('Kathmandu');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('button',{name:'Kathmandu Nepal',exact:true}).click();
 await expect(page.getByLabel('World latitude')).toHaveValue('27.7');await expect(page.getByText('World imagery loaded',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Switch to flat map'}).click();await expect(page.getByRole('button',{name:'Switch to globe'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Save map PNG'})).toBeEnabled();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save map PNG'}).click();expect((await download).suggestedFilename()).toBe('sarflow-world-view.png');
 await page.getByRole('button',{name:'Whole world',exact:true}).click();
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);}
});
test('world imagery and place search failures have explicit recovery',async({page})=>{
 await page.route('https://tiles.maps.eox.at/**',r=>r.abort());await page.route('**/api/places?*',r=>r.fulfill({status:502,json:{error:'Place search unavailable'}}));
 await page.goto('/world');await expect(page.getByRole('button',{name:'Retry world imagery'})).toBeVisible();await expect(page.getByRole('button',{name:'Save map PNG'})).toBeDisabled();
 await page.getByLabel('City or place name').fill('Paris');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.getByText('Place search unavailable',{exact:true})).toBeVisible();
 await page.unroute('https://tiles.maps.eox.at/**');await page.route('https://tiles.maps.eox.at/**',r=>r.fulfill({contentType:'image/png',body:image}));await page.getByRole('button',{name:'Retry world imagery'}).click();await expect(page.getByText('World imagery loaded',{exact:true})).toBeVisible();
});
