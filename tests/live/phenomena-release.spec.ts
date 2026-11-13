// The imported journeys run against the base URL in playwright.live.config.ts.
import '../e2e/phenomena.spec';
import '../e2e/topics.spec';
import { test, expect } from '@playwright/test';
test('public account page reflects the actual OAuth configuration',async({page,request})=>{
  const response=await request.get('/api/auth/status');expect(response.status()).toBe(200);
  const status=await response.json();
  await page.goto('/account');
  const button=page.getByRole('button',{name:'Continue with Google'});
  if(status.enabled)await expect(button).toBeEnabled();
  else {await expect(button).toBeDisabled();await expect(page.getByRole('status')).toContainText('being configured');}
});
