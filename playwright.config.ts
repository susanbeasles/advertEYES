import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',testMatch:'*.e2e.ts',workers:1,use:{baseURL:'http://127.0.0.1:4173',headless:true,launchOptions:{executablePath:'/usr/bin/chromium',chromiumSandbox:true}},reporter:'list'});
