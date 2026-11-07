# Research & Architectural Decisions: Standard Playwright E2E Framework

**Feature ID**: `007-standard-playwright-project`  
**Status**: Completed  
**Date**: 2026-11-07  

---

## 1. Custom Test Fixtures vs Traditional Global Hooks

### Context
In traditional test frameworks (Selenium, Cypress, older Playwright patterns), engineers instantiate page objects in `beforeEach` hooks and store them in mutable global variables:
```typescript
// Anti-pattern
let loginPage: LoginPage;
let dashboardPage: DashboardPage;
test.beforeEach(async ({ page }) => {
  loginPage = new LoginPage(page);
  dashboardPage = new DashboardPage(page);
});
```
This leads to memory leaks, difficulties in parallel test runs, and bloated setup boilerplate across every single spec file.

### Decision
Adopt the **Playwright Custom Fixtures Dependency Injection Pattern** (`base.extend<Fixtures>()`):
```typescript
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

type AppFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<AppFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});
export { expect };
```

### Rationale
1. **Zero Instantiation Boilerplate**: In spec files, testers simply request the page objects in the test signature: `test('Verify login', async ({ loginPage, dashboardPage }) => { ... })`.
2. **Lazy Loading**: If a test only uses `loginPage`, `dashboardPage` is never instantiated.
3. **Automatic Teardown**: Fixtures naturally handle post-test teardown and cleanup without explicit `afterEach` blocks.

---

## 2. Component Composition in Page Object Model (POM)

### Context
Web applications have common widgets that appear across multiple pages (Navigation Bar, Notification Toasts, Confirmation Dialogs, Sidebar). Duplicating locator logic for these elements across `LoginPage`, `DashboardPage`, `SettingsPage` causes massive duplication.

### Decision
Implement **Component Composition** inside the Page Object hierarchy:
```text
tests/pages/
├── base.page.ts               # Base class: holds page reference & core helpers
├── components/
│   ├── navbar.component.ts    # Reusable navigation
│   ├── toast.component.ts     # Global alert/toast notifications
│   └── modal.component.ts     # Confirmation dialogs
└── *.page.ts                  # Extends BasePage, exposes page-specific locators
```

`BasePage` automatically instantiates and exposes `navbar`, `toast`, and `modal`:
```typescript
export class BasePage {
  readonly page: Page;
  readonly navbar: NavbarComponent;
  readonly toast: ToastComponent;

  constructor(page: Page) {
    this.page = page;
    this.navbar = new NavbarComponent(page);
    this.toast = new ToastComponent(page);
  }
}
```

### Rationale
- High maintainability: When navbar markup changes, QA only modifies `NavbarComponent`.
- Uniform developer experience: Any page object can immediately access `this.toast.expectSuccess()` or `this.navbar.navigateTo('settings')`.

---

## 3. Locator Selection Hierarchy (User-Facing First)

### Context
Fragile selectors (`div > div:nth-child(2) > span.btn-primary`) break with the slightest CSS refactor. We need a strict selector priority contract based on Playwright official best practices.

### Decision
Enforce the following locator priority in all Page Objects:
1. **`page.getByRole('button' | 'link' | 'heading' | 'textbox', { name: '...' })`**: Mirrors how assistive technologies and real users navigate the screen.
2. **`page.getByLabel('...')`**: Best for form inputs associated with `<label>`.
3. **`page.getByPlaceholder('...')`**: Best for input fields with descriptive placeholders.
4. **`page.getByTestId('...')`**: Dedicated fallback for dynamic elements where copy changes frequently.
5. **Strictly Forbidden**: CSS class names tied to styling (`.col-md-6`, `.btn-blue`, `.styled-input`) and absolute XPath chains (`/html/body/div[2]/...`).

---

## 4. Zero-UI Auth Setup via Playwright Project Dependencies

### Context
Logging into web applications through the UI on every test execution introduces 60-80% overhead and risks bot-detection triggers.

### Decision
Configure **Auth Setup Projects** in `playwright.config.ts`:
```typescript
projects: [
  // Setup project runs first and saves storage state
  {
    name: 'setup',
    testMatch: /.*\.setup\.ts/,
  },
  // Main E2E tests reuse the storage state
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'tests/fixtures/auth/admin.json',
    },
    dependencies: ['setup'],
  },
]
```
This directly integrates with QA Pilot's `AuthSessionManager` (Feature 005), allowing one-time headed manual login (Solo QA) or API token injection (CI/CD).

---

## 5. Test Data Factory Pattern

### Context
Hardcoded test strings like `'john_doe@example.com'` cause database collision errors when tests run repeatedly or in parallel.

### Decision
Provide a zero-dependency `DataFactory` (`tests/data/data-factory.ts`):
- `generateEmail(prefix = 'user'): string` -> `user_1794012000_123@example.com`
- `generateUser(role = 'customer'): UserPayload`
- `generateBoundaryString(length = 255): string`
- `generateSpecialChars(): string`

All generated passwords and sensitive values are passed to `globalRedactor` to prevent leaks in logs and artifacts.

