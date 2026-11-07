import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page.js';
import { RegisterPage } from '../pages/register.page.js';
import { DashboardPage } from '../pages/dashboard.page.js';
import { DataFactory } from '../data/data-factory.js';

export interface AppFixtures {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  dataFactory: typeof DataFactory;
}

export const test = base.extend<AppFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  dataFactory: async ({}, use) => {
    await use(DataFactory);
  },
});

export { expect };

