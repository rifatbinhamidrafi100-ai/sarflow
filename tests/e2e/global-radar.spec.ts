import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
test('worldwide radar discovery connects to animated acquisitions and evidence',async({page})=>{
 const archive=JSON.parse(readFileSync('public/data/observatory.json','utf8'));archive.regions=[archive.regions[0]];
 await page.route('**/api/global-radar?*',r=>r.fulfill({json:archive}));
 await page.goto('/global-radar?lat=47.6&lon=-122.33');await page.getByRole('button',{name:'Discover radar dates'}).click();
 await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Play observations',exact:true}).click();await expect(page.getByRole('slider',{name:'Real acquisition timeline'})).toHaveValue('1',{timeout:7000});
 await page.getByRole('button',{name:'Pause observations'}).click();await page.getByRole('button',{name:'Compare',exact:true}).click();await expect(page.getByRole('slider',{name:'Real imagery swipe'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});
test('missing worldwide repeat coverage does not create a timeline',async({page})=>{
 await page.route('**/api/global-radar?*',r=>r.fulfill({json:{empty:true,message:'No repeat NISAR observation pair was found.'}}));await page.goto('/global-radar');await page.getByRole('button',{name:'Discover radar dates'}).click();await expect(page.getByText('No repeat NISAR observation pair was found.')).toBeVisible();await expect(page.getByRole('button',{name:'Play observations'})).toHaveCount(0);
});
