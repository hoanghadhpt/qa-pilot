# Quickstart Validation Guide: Standard Playwright E2E Framework

**Feature ID**: `007-standard-playwright-project`  
**Status**: Ready for Verification  
**Date**: 2026-11-07  

---

## 1. Prerequisites

1. Node.js >= 18 installed.
2. Dependencies installed: `@playwright/test`.
3. Browsers installed: `npx playwright install chromium`.

---

## 2. Validation Scenarios

### Scenario 1: Writing an E2E Test in Under 10 Lines with Fixtures
**Goal**: Verify that a tester can write an expressive test case without `beforeEach` or `new PageObject()` boilerplate.

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '../../fixtures/test.fixture';

test('Đăng nhập thành công vào trang quản trị', async ({ loginPage, dashboardPage }) => {
  await loginPage.navigate();
  await loginPage.login('admin@example.com', 'AdminPass@123');
  await expect(dashboardPage.welcomeHeader).toBeVisible();
  await expect(dashboardPage.navbar.brandLogo).toBeVisible();
});
```

*Expected*: Test runs cleanly; `loginPage` and `dashboardPage` are automatically injected and torn down.

---

### Scenario 2: Component Reusability (Navbar & Toast Notifications)
**Goal**: Verify that navigation and toast checks work across different page objects through composition.

```typescript
// tests/e2e/settings/profile.spec.ts
import { test, expect } from '../../fixtures/test.fixture';

test('Cập nhật hồ sơ hiển thị thông báo toast thành công', async ({ profilePage }) => {
  await profilePage.navigate();
  await profilePage.updateDisplayName('QA Automation Specialist');
  
  // Verify via composed toast component
  await profilePage.toast.expectSuccess('Hồ sơ đã được lưu thành công');
});
```

*Expected*: No duplicated toast locator logic; `profilePage.toast` handles notification verification.

---

### Scenario 3: Dynamic Data Generation via DataFactory
**Goal**: Verify that tests run repeatedly without unique constraint or duplicate email errors.

```typescript
import { test, expect } from '../../fixtures/test.fixture';

test('Đăng ký tài khoản mới với email ngẫu nhiên', async ({ registerPage, dataFactory }) => {
  const user = dataFactory.generateUser('customer');
  
  await registerPage.navigate();
  await registerPage.fillRegistrationForm(user);
  await registerPage.submit();

  await expect(registerPage.page).toHaveURL(/.*dashboard/);
});
```

*Expected*: Each test execution receives a clean, non-conflicting email (`customer_1794012000_123@example.com`).

---

### Scenario 4: Command Line Execution & Multi-Browser Support
**Goal**: Run tests using standard Playwright CLI commands:

```bash
# Chạy toàn bộ test E2E ở chế độ ngầm (headless)
npx playwright test

# Chạy riêng các ca kiểm thử khói
npx playwright test --grep "@smoke"

# Xem báo cáo HTML chính thức
npx playwright show-report
```

---

### Scenario 5: CI/CD Pipeline Sharding
**Goal**: Verify the `.github/workflows/e2e-playwright.yml` workflow:
- Matrices 4 shards in parallel: `shard: [1/4, 2/4, 3/4, 4/4]`.
- Merges all test reports into a unified HTML report artifact.
- Fails only when actual functional assertions fail, with trace files attached on first retry.

