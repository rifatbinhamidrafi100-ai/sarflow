import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
test('observation tracking changes pairs and exports unknown metrics without invented percentages',async({page})=>{
 await page.goto('/observatory?region=brahmaputra');const panel=page.getByRole('region',{name:'Observation change report'});
 await expect(panel).toContainText('Air and water pollution:');await expect(panel).toContainText('not measured');
 await panel.getByText('Details: source and missing evidence').click();await expect(panel.getByText(/needs separate air or water measurements/)).toBeVisible();await panel.getByText('Details: source and missing evidence').click();
 await panel.getByText('Compare other dates').click();await panel.getByRole('button',{name:'Compare interval 2',exact:true}).click();
 await expect(page.getByLabel('Reference acquisition')).toHaveValue('1');await expect(page.getByLabel('Real acquisition timeline')).toHaveValue('2');await expect(panel).toContainText('12.0 days');
 const event=page.waitForEvent('download');await panel.getByRole('button',{name:'Export change tracking report'}).click();const d=await event;const report=JSON.parse(await fs.readFile((await d.path())!,'utf8'));
 expect(report.waterPollution).toBeNull();expect(report.airPollution).toBeNull();expect(report.changedCellPercent).toBeNull();expect(report.before.date).toBe('2026-08-17');expect(report.after.date).toBe('2026-08-29');
 for(const width of [1440,390]){await page.setViewportSize({width,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).include('.change-tracker').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);}
 await panel.screenshot({path:'artifacts/change-tracker-mobile.png'});
});
