import { test, expect } from '@playwright/test';

test.describe('TC-01-register-demo', () => {
  test('Thực thi kịch bản kiểm thử tự động', async ({ page }) => {
    // Điều hướng ban đầu
    await page.goto('https://demo.automationtesting.in/Register.html');
    await page.waitForLoadState('networkidle');

    // Bước #1: https://demo.automationtesting.in/Register.html
    await page.goto('https://demo.automationtesting.in/Register.html');

    // Bước #2: điền Nguyen vào ô First Name
    await page.getByPlaceholder(/First Name/i).or(page.getByLabel(/First Name/i)).first().fill('Nguyen');

    // Bước #3: Register
    await expect(page.locator('body')).toContainText('Register');

  });
});