import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local from the project root (cwd when running npm run test:e2e)
config({ path: path.resolve(process.cwd(), '.env.local') });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  globalTimeout: 30 * 60 * 1000,
  globalSetup: './tests/global-setup.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 3 : 6,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  // NB: only chromium will run in Docker (arm64).
  projects: [
    {
      name: 'chromium',
      testIgnore: /mobile\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iphone-14',
      testMatch: [/smoke\.spec\.ts/, /mobile\.spec\.ts/],
      use: {
        ...devices['iPhone 14'],
        // Emulate iPhone in Chromium so CI/Docker only needs `npx playwright install chromium`.
        // For native WebKit: remove defaultBrowserType and run `npx playwright install webkit`.
        defaultBrowserType: 'chromium',
      },
    },
  ],

  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? 'npm run dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }),
});
