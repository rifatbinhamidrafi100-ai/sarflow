import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
const tile=readFileSync('public/observations/nepal-rasuwa-thumbnail.png');

test('collapsible Earth panels preserve state, resize the map and expand on mobile',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route(/^https:\/\/(?:tiles\.maps\.eox\.at|services\.arcgisonline\.com)\//,r=>r.fulfill({contentType:'image/png',body:tile}));
 await page.route('**/api/coverage/dates?*',r=>r.fulfill({json:{dates:['2026-08-31','2026-08-19']}}));
 await page.route('**/api/places/reverse?*',r=>r.fulfill({json:{name:'Rasuwa, Nepal'}}));
 await page.route('**/api/places?*',r=>r.fulfill({json:{results:[{id:1,name:'Kathmandu',country:'Nepal',latitude:27.7,longitude:85.3}]}}));
 await page.setViewportSize({width:1440,height:1000});await page.goto('/world');
 await expect(page.getByText('World imagery loaded',{exact:true})).toBeVisible();
 const left=page.getByRole('complementary',{name:'Location and data'}),right=page.getByRole('complementary',{name:'Results'});
 await expect(left).toBeVisible();await expect(right).toBeVisible();await expect(right).toContainText('Not calculated');
 await expect(page.getByRole('button',{name:'Save 4K Earth PNG',exact:true})).not.toBeVisible();
 await page.getByLabel('Coverage date').selectOption('2026-08-19');await expect(right).toContainText('2026-08-19');
 const width=await page.locator('.world-canvas').evaluate(e=>e.clientWidth);
 await page.getByRole('button',{name:'Hide location panel',exact:true}).click();await expect(left).toBeHidden();
 await page.getByRole('button',{name:'Hide results panel',exact:true}).click();await expect(right).toBeHidden();
 await expect.poll(()=>page.locator('.world-canvas canvas').evaluate(e=>e.clientWidth)).toBeGreaterThan(width+400);
 await page.getByRole('button',{name:'Show location panel',exact:true}).click();await page.getByRole('button',{name:'Show results panel',exact:true}).click();
 await expect(page.getByLabel('Coverage date')).toHaveValue('2026-08-19');
 await page.getByLabel('City or place name').fill('Kathmandu');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('button',{name:'Kathmandu Nepal',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Recent locations'})).toBeVisible();await expect(right).toContainText('Kathmandu, Nepal');
 await expect(page.getByText('World imagery loaded',{exact:true})).toBeVisible();
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:`artifacts/world-panels-${viewport.width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Hide location panel',exact:true}).click();await expect(left).toBeHidden();await expect(right).toBeVisible();
 await page.getByRole('button',{name:'Show location panel',exact:true}).click();await expect(left).toBeVisible();
 expect(errors).toEqual([]);
});
