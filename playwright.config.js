import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120000,
  retries: 0,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173/', actionTimeout: 15000 },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'iphone', use: { ...devices['iPhone 14 Pro'], browserName: 'chromium' } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 14 Pro'], browserName: 'webkit' } },
  ],
});
