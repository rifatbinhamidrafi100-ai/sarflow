import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('all four topics are discoverable on the homepage and responsive',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  const topics=page.getByRole('navigation',{name:'Explore by topic',exact:true});
  await expect(topics.getByRole('link')).toHaveCount(4);
  for(const title of ['Ecosystems & Forests','Agriculture','Natural Hazards','Ice & Glaciers'])
    await expect(topics.getByRole('link',{name:new RegExp(title)})).toBeVisible();
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await topics.screenshot({path:'artifacts/home-topics-mobile-20261113.png'});
  await topics.getByRole('link',{name:/Ecosystems & Forests/}).click();
  await expect(page.getByRole('heading',{name:'Ecosystems & Forests',level:1})).toBeVisible();
  await page.getByRole('link',{name:'Open forest teaching example'}).click();
  await expect(page.getByRole('heading',{name:'Reading a disturbed landscape',level:1})).toBeVisible();
  await expect(page.getByText(/Teaching scenario · synthetic dates and measurements/)).toBeVisible();
  expect(errors).toEqual([]);
});
test('topic hub routes to real tools and shows incomplete analysis honestly',async({page})=>{
  await page.goto('/topics');
  await page.getByRole('navigation',{name:'Explore by topic',exact:true}).getByRole('link',{name:/Agriculture/}).click();
  await page.getByRole('link',{name:'Explore Sacramento observations'}).click();
  await expect(page).toHaveURL(/observatory\?region=sacramento/);
  await page.goto('/topics/hazards');
  await page.getByRole('link',{name:'Open experimental water analysis'}).click();
  await expect(page.getByRole('heading',{name:'Water change investigation',level:1})).toBeVisible();
  await page.goto('/topics/ice');
  await expect(page.getByText(/Glacier motion analysis is not implemented/)).toBeVisible();
  await expect(page.locator('.topic-other').getByRole('link')).toHaveCount(3);
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({path:'artifacts/topics-ice-mobile-20261113.png',fullPage:true});
  await page.getByRole('link',{name:'Inspect the real Arctic measurements'}).click();
  await expect(page).toHaveURL(/data#real-nisar/);
});
