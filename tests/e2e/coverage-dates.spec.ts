import {test,expect} from '@playwright/test';
test('coverage uses available-date options rather than a calendar and retries failures',async({page})=>{
 await page.route('**/api/places/reverse?*',r=>r.fulfill({json:{name:'Kathmandu, Nepal'}}));let failed=true;await page.route('**/api/coverage/dates?*',r=>r.fulfill({status:failed?502:200,json:failed?{error:'NASA temporarily unavailable'}:{dates:['2026-09-12','2026-08-01']}}));
 await page.goto('/world');await page.getByRole('button',{name:'Retry available dates'}).waitFor();failed=false;await page.getByRole('button',{name:'Retry available dates'}).click();
 const dates=page.getByLabel('Coverage date');await expect(dates).toBeEnabled();await expect(dates.locator('option')).toHaveText(['Kathmandu, Nepal ? 12 Sept 2026','Kathmandu, Nepal ? 1 Aug 2026']);await dates.selectOption('2026-08-01');await expect(dates).toHaveValue('2026-08-01');await expect(page.locator('input[type=date]')).toHaveCount(0);
 await page.getByRole('button',{name:'Brahmaputra floodplain',exact:true}).click();await expect(dates.locator('option').first()).toContainText('Brahmaputra floodplain, Bangladesh');await page.getByLabel('World latitude').fill('26');await expect(page.locator('.coverage-location')).toContainText('Kathmandu, Nepal');await expect(page.locator('.world-location-watermark')).toContainText('Kathmandu, Nepal');await expect(page.locator('.world-place-pin')).toContainText('Kathmandu, Nepal');
 await page.screenshot({path:'artifacts/available-dates.png',fullPage:true});
});
