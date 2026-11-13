import { test, expect } from '@playwright/test';
test('place selection preserves precise coordinates in browser history',async({page})=>{
  await page.route('**/api/global-radar?*',route=>route.fulfill({json:{empty:true,message:'No fixture observations'}}));
  await page.route('**/api/places?*',route=>route.fulfill({json:{results:[{id:1,name:'Sylhet',country:'Bangladesh',latitude:24.892873,longitude:91.900128}]}}));
  await page.goto('/global-radar?lat=28&lon=85.3');
  await page.getByRole('textbox',{name:'Radar place search'}).fill('Sylhet');
  await page.getByRole('button',{name:'Find place',exact:true}).click();
  await page.getByRole('button',{name:'Sylhet, Bangladesh',exact:true}).click();
  await expect(page).toHaveURL(/lat=24.892873&lon=91.900128/);
  await expect(page.getByRole('spinbutton',{name:'Radar latitude'})).toHaveValue('24.892873');
  await page.goBack();
  await expect(page.getByRole('spinbutton',{name:'Radar latitude'})).toHaveValue('28');
});
test('comparison handle drags and supports keyboard without changing camera', async ({page})=>{
  await page.route('**/api/global-radar?*', route=>route.fulfill({json:{empty:true,message:'No fixture updates'}}));
  await page.goto('/observatory?region=brahmaputra');
  await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Compare',exact:true}).click();
  const handle=page.getByRole('slider',{name:'Move imagery comparison'});
  await handle.focus();await page.keyboard.press('Home');
  await expect(page.getByRole('slider',{name:'Real imagery swipe'})).toHaveValue('0');
  await page.keyboard.press('End');await expect(handle).toHaveAttribute('aria-valuenow','100');
  const bounds=await page.locator('.obs-map-wrap').boundingBox();
  if(!bounds)throw Error('Map bounds missing');
  const box=await handle.boundingBox();if(!box)throw Error('Handle missing');
  await page.mouse.move(box.x+box.width/2-4,box.y+box.height/2);
  await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.3,box.y+box.height/2,{steps:10});await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-valuenow','30');
  await expect(page.locator('.observation-map-overlay')).toHaveCSS('clip-path',/30%/);
});
test('water reference discovery displays source records and missing-data states on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/water-references?*',route=>route.fulfill({json:{
    collection:'OPERA_L3_DSWX-HLS_V1',retrievedAt:'2026-11-13T00:00:00Z',truncated:false,
    records:[],limitations:['Software UI fixture: no reference measurements.'],
  }}));
  await page.goto('/water');
  const panel=page.getByRole('region',{name:'NASA water reference discovery'});
  await panel.getByLabel('Reference latitude').fill('25.15');
  await panel.getByLabel('Reference longitude').fill('89.8');
  await panel.getByLabel('Reference start date').fill('2026-09-01');
  await panel.getByLabel('Reference end date').fill('2026-10-31');
  await panel.getByRole('button',{name:'Find NASA reference observations'}).click();
  await expect(panel.getByRole('status')).toContainText('No reference candidates');
  await expect(panel.getByRole('status')).toContainText('Evaluation: not performed');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth',390);
});
