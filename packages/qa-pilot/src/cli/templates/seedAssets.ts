/**
 * Seed templates for scaffolding Playwright E2E framework in target project
 */

export const PLAYWRIGHT_CONFIG_TEMPLATE = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
});
`;

export const BASE_PAGE_TEMPLATE = `import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  get heading(): Locator {
    return this.page.getByRole('heading').first();
  }
}
`;

export const TEST_FIXTURE_TEMPLATE = `import { test as base, expect } from '@playwright/test';

type AppFixtures = {
  // Add customized page objects here
};

export const test = base.extend<AppFixtures>({});
export { expect };
`;

export const GITKEEP_CONTENT = `# Preserve directory structure in Git\n*;\n!.gitkeep\n`;

