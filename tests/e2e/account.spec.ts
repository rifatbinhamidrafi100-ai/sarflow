import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('optional sign-in reports missing setup and leaves exploration open',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/account');
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('being configured');
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  }
  await page.screenshot({path:'artifacts/account-mobile-20261113.png',fullPage:true});
  await page.getByRole('link',{name:'Explore Earth',exact:true}).click();
  await expect(page).toHaveURL(/\/world/);
  expect(errors).toEqual([]);
});
test('profile edits send only display fields; verified email stays read-only',async({page})=>{
  const session={user:{id:'software-fixture',username:'fixture_user',name:'Fixture User',email:'student@example.test'},expires:'2026-11-20T00:00:00Z'};
  await page.route('**/api/auth/status',route=>route.fulfill({json:{enabled:true,origin:'http://127.0.0.1:5186'}}));
  await page.route('**/api/auth/csrf',route=>route.fulfill({json:{csrfToken:'software-fixture-only'}}));
  await page.route('**/api/auth/session',async route=>{
    if(route.request().method()==='POST'){
      const data=route.request().postDataJSON().data;
      expect(Object.keys(data).sort()).toEqual(['displayName','username']);
      await route.fulfill({json:{...session,user:{...session.user,name:data.displayName,username:data.username}}});
    }else await route.fulfill({json:session});
  });
  await page.goto('/account');
  await expect(page.getByLabel('Verified Google email')).toHaveAttribute('readonly','');
  await page.getByLabel('Username',{exact:true}).fill('updated_user');
  await page.getByLabel('Display name',{exact:true}).fill('Updated User');
  await page.getByRole('button',{name:'Save profile',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Profile updated for this browser session');
  await expect(page.getByLabel('Verified Google email')).toHaveValue('student@example.test');
  await expect(page.getByRole('heading',{name:'Updated User'})).toBeVisible();
});
