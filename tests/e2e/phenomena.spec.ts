import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('six-category discovery, search, empty recovery and dedicated guides work',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/phenomena');
  const categories=page.getByRole('navigation',{name:'Explore by topic',exact:true});
  await expect(categories.getByRole('link')).toHaveCount(6);
  await page.getByRole('searchbox',{name:'Find a phenomenon'}).fill('unmatched asteroids');
  await expect(page.getByRole('heading',{name:'No matching phenomena'})).toBeVisible();
  await page.getByRole('button',{name:'Show all six categories'}).click();
  await page.getByRole('searchbox',{name:'Find a phenomenon'}).fill('crops');
  await expect(categories.getByRole('link')).toHaveCount(1);
  await categories.getByRole('link',{name:/Agriculture & Crop Monitoring/}).click();
  await expect(page.getByRole('heading',{name:'Agriculture & Crop Monitoring',level:1})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Techniques and current support'})).toBeVisible();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({path:'artifacts/phenomena-agriculture-mobile.png',fullPage:true});
  await page.getByRole('link',{name:'Explore Sacramento observations'}).click();
  await expect(page).toHaveURL(/observatory\?region=sacramento/);
  expect(errors).toEqual([]);
});
test('radar explanations are contextual, interactive and keyboard dismissible',async({page})=>{
  await page.route('**/api/global-radar?*',route=>route.fulfill({json:{empty:true,message:'No fixture updates'}}));
  await page.goto('/observatory?region=brahmaputra');
  await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Understand this image',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'Understand this image',exact:true});
  await expect(panel).toContainText('NISAR');
  await expect(panel).toContainText('Not supplied with this display');
  await expect(panel).toContainText('RGB colours are not calibrated backscatter measurements');
  await panel.getByRole('button',{name:'Bright patch',exact:true}).click();
  await expect(panel.getByRole('status')).toContainText('rough surfaces, urban structures');
  await panel.getByRole('button',{name:'Teaching frame 2',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Teaching frame 2',exact:true})).toHaveAttribute('aria-pressed','true');
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({path:'artifacts/radar-explanation-mobile.png',fullPage:true});
  await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();
  await expect(page.getByRole('button',{name:'Understand this image',exact:true})).toBeFocused();
});
