import { test, expect } from '@playwright/test';

test('radar story animates, pauses, restarts and supports manual stages',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:'Watch radar in motion'}).click();
 const story=page.locator('#radar-story');
 await expect(story).toHaveAttribute('data-running','true');
 await expect(story).toHaveAttribute('data-step','1',{timeout:6000});
 await page.getByRole('button',{name:'Pause radar animation'}).click();
 await expect(story).toHaveAttribute('data-running','false');
 await expect(page.locator('.radar-echo').first()).toHaveCSS('animation-play-state','paused');
 await page.getByRole('button',{name:'3 Build an observation'}).click();
 await expect(story).toHaveAttribute('data-step','2');
 await page.getByRole('button',{name:'Restart radar explanation'}).click();
 await expect(story).toHaveAttribute('data-step','0');
 await expect(story).toHaveAttribute('data-running','true');
 await expect(story).toContainText('Not to scale');
});

test('reduced motion keeps the radar story static and usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#radar-story');await page.locator('#radar-story').scrollIntoViewIfNeeded();
 await expect(page.getByRole('button',{name:'Play radar animation'})).toBeDisabled();
 await expect(page.locator('#radar-story')).toHaveAttribute('data-running','false');
 await expect(page.locator('.radar-pulse').first()).toHaveCSS('animation-name','none');
 await page.getByRole('button',{name:'2 Listen to the return'}).click();
 await expect(page.locator('#radar-story')).toHaveAttribute('data-step','1');
});

test('observation playback waits for a delayed raster',async({page})=>{
 await page.goto('/observatory');await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
 let release:()=>void=()=>{};
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/observations/*.png',async route=>{await gate;await route.continue();});
 await page.getByRole('button',{name:'Play observations',exact:true}).click();
 await expect(page.getByRole('slider',{name:'Real acquisition timeline'})).toHaveValue('0');
 await page.waitForTimeout(2700);
 await expect(page.getByRole('slider',{name:'Real acquisition timeline'})).toHaveValue('0');
 release();await expect(page.getByText('Archived imagery loaded',{exact:true})).toBeVisible();
 await expect(page.getByRole('slider',{name:'Real acquisition timeline'})).toHaveValue('1',{timeout:5000});
 await page.getByRole('button',{name:'Pause observations',exact:true}).click();
});
