import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/recordings',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      pathTemplate: '{testDir}/reg-snapshots/{testFilePath}/{arg}{ext}',
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 3 : 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    // JSON results consumed by .github/scripts/notify_slack.py to build
    // the Slack donut/stats. Without this, the Slack post shows all zeros.
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://www.alexpavsky.com',
    actionTimeout: 10_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Default desktop project — runs ALL specs.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Device matrix — runs the cross-device smoke spec only, so we
    // verify hero / nav / Live Feed / auth render correctly on every
    // device profile users actually have. Tagged via testMatch so the
    // full 500-test suite isn't multiplied by 4.
    {
      name: 'iphone-13',
      use: { ...devices['iPhone 13'] },
      testMatch: /tests\/crossDevice\.spec\.ts/,
    },
    {
      name: 'pixel-7',
      use: { ...devices['Pixel 7'] },
      testMatch: /tests\/crossDevice\.spec\.ts/,
    },
    {
      name: 'ipad-pro-11',
      use: { ...devices['iPad Pro 11'] },
      testMatch: /tests\/crossDevice\.spec\.ts/,
    },
    {
      name: 'galaxy-tab-s4',
      use: { ...devices['Galaxy Tab S4'] },
      testMatch: /tests\/crossDevice\.spec\.ts/,
    },
  ],
});
