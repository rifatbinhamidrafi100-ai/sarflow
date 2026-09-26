import { defineConfig, devices } from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:180000,expect:{timeout:10000},reporter:[['list'],['html',{open:'never'}]],use:{baseURL:'http://127.0.0.1:5186',trace:'retain-on-failure',screenshot:'only-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome'],channel:'chrome'}}]});
