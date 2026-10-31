import { defineConfig, devices } from '@playwright/test';
import { LOCALE, VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from './src/config/browser_common';
import { site } from './src/config/site_common';
import { loadDotEnv } from './src/utils/env_common';

loadDotEnv();

const headed = process.env.HEADLESS !== '1';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global_setup_common.ts',
  globalTeardown: './global_teardown_common.ts',
  timeout: 5 * 60 * 1000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['allure-playwright', { resultsDir: 'reports/allure-results' }],
  ],
  use: {
    baseURL: site.HOME,
    locale: LOCALE,
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    headless: !headed,
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
