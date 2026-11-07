import { test, expect } from '../../fixtures/test.fixture.js';

test.describe('Authentication - Registration Module', () => {
  test('TC-REG-001: Đăng ký tài khoản mới với dữ liệu sinh động từ DataFactory', async ({
    registerPage,
    dataFactory,
  }) => {
    // 1. Generate clean non-colliding test user
    const newUser = dataFactory.generateUser('customer');

    // 2. Navigate to register screen
    await registerPage.navigate();

    // 3. Fill form and submit
    await registerPage.fillRegistrationForm(newUser);
    await registerPage.submit();

    // 4. Assert page state remains healthy
    await expect(registerPage.submitButton).toBeVisible();
  });
});

