import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/live',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'https://sarflow-earth-rbhr.vercel.app',
    channel: 'chrome',
    headless: true,
  },
  reporter: 'list',
});
