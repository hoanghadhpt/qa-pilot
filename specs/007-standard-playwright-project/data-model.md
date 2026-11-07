# Data Model & Architecture Specification: Standard Playwright E2E Framework

**Feature ID**: `007-standard-playwright-project`  
**Status**: Ready  
**Date**: 2026-11-07  

---

## 1. Class & Composition Diagram

```text
               +---------------------------+
               |        BasePage           |
               +---------------------------+
               | - page: Page              |
               | - navbar: NavbarComponent |
               | - toast: ToastComponent   |
               | + navigate(path: string)  |
               | + waitForUrl(pattern)     |
               | + getTitle(): Promise<str>|
               +---------------------------+
                            ▲
                            │ extends
            +---------------+---------------+
            │                               │
+-----------------------+       +-----------------------+
|       LoginPage       |       |     DashboardPage     |
+-----------------------+       +-----------------------+
| - usernameInput       |       | - welcomeHeading      |
| - passwordInput       |       | - statsCards          |
| - submitButton        |       | - logoutButton        |
| + login(user, pass)   |       | + getMetrics()        |
+-----------------------+       +-----------------------+
```

---

## 2. Component Specifications

### 2.1 `BasePage` (`tests/pages/base.page.ts`)
The foundational class inherited by every page object.

```typescript
export abstract class BasePage {
  readonly page: Page;
  readonly navbar: NavbarComponent;
  readonly toast: ToastComponent;

  constructor(page: Page) {
    this.page = page;
    this.navbar = new NavbarComponent(page);
    this.toast = new ToastComponent(page);
  }

  abstract navigate(): Promise<void>;

  async waitForUrl(urlOrPattern: string | RegExp): Promise<void>;
  async getTitle(): Promise<string>;
  async takeScreenshot(name: string): Promise<string>;
}
```

### 2.2 Reusable Components (`tests/pages/components/`)
Modular UI widgets shared across screens:
- **`NavbarComponent` (`navbar.component.ts`)**:
  - Locators: `brandLogo`, `navLinks`, `userMenuDropdown`, `logoutOption`.
  - Methods: `goTo(sectionName)`, `logout()`, `getCurrentUserText()`.
- **`ToastComponent` (`toast.component.ts`)**:
  - Locators: `toastContainer`, `successToast`, `errorToast`.
  - Methods: `expectSuccess(msg?)`, `expectError(msg?)`, `dismiss()`.
- **`ConfirmModalComponent` (`modal.component.ts`)**:
  - Locators: `modalContainer`, `title`, `confirmBtn`, `cancelBtn`.
  - Methods: `confirm()`, `cancel()`, `getModalText()`.

### 2.3 Fixture Dependency Map (`tests/fixtures/test.fixture.ts`)
The custom test fixture injecting page objects directly into test arguments:

```typescript
export interface AppFixtures {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  dataFactory: typeof DataFactory;
}
```

### 2.4 Test Data Entity (`tests/data/data-factory.ts`)

```typescript
export interface TestUser {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'customer' | 'guest';
}
```

---

## 3. Best-Practice Rules & Conventions

1. **File Naming Convention**:
   - Page Objects: `<feature>.page.ts` (e.g. `login.page.ts`).
   - Components: `<widget>.component.ts` (e.g. `navbar.component.ts`).
   - Test Specs: `<feature>.spec.ts` (e.g. `login.spec.ts`, `cart.spec.ts`).
   - Fixtures: `test.fixture.ts`.
2. **Assertion Placement Rule**:
   - Assertions belong inside the test specs (`.spec.ts`), NOT inside page objects.
   - Page objects provide state getters (e.g. `isLoggedIn(): Promise<boolean>`) or exposed locators (`readonly submitButton: Locator`), allowing test specs to perform standard `await expect(pageObject.submitButton).toBeVisible()`.
3. **Action Execution Rule**:
   - Page object action methods should group related interactions (e.g. `async login(email, pass)` encapsulates typing and clicking submit).
4. **Environment Portability**:
   - Base URLs must be read from `process.env.BASE_URL` with a sensible fallback (`http://localhost:3000`).

