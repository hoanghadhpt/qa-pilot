import { test, expect } from '../../fixtures/test.fixture.js';

test.describe('Authentication - Login Module', () => {
  test('TC-LOGIN-001: Đăng nhập với thông tin người dùng mẫu', async ({ loginPage }) => {
    // Navigate using Page Object
    await loginPage.navigate();
    
    // Check user-facing inputs
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });
});

