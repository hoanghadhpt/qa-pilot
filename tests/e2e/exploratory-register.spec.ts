import { test, expect } from '@playwright/test';

test.describe('TC-EXPLORATORY-REGISTER', () => {
  test('Thực thi kịch bản kiểm thử tự động', async ({ page }) => {
    // Điều hướng ban đầu
    await page.goto('https://demo.automationtesting.in/Register.html');
    await page.waitForLoadState('networkidle');

    // Bước #1: https://demo.automationtesting.in/Register.html
    await page.goto('https://demo.automationtesting.in/Register.html');

    // Bước #2: điền Hoang vào ô First Name
    await page.getByPlaceholder(/First Name/i).or(page.getByLabel(/First Name/i)).first().fill('Hoang');

    // Bước #3: điền Ha vào ô Last Name
    await page.getByPlaceholder(/Last Name/i).or(page.getByLabel(/Last Name/i)).first().fill('Ha');

    // Bước #4: điền 123 AI Boulevard, Tech City vào ô Address
    await page.getByPlaceholder(/Address/i).or(page.getByLabel(/Address/i)).first().fill('123 AI Boulevard, Tech City');

    // Bước #5: điền hoangha.test@example.com vào ô Email
    await page.getByPlaceholder(/Email/i).or(page.getByLabel(/Email/i)).first().fill('hoangha.test@example.com');

    // Bước #6: điền 0987654321 vào ô Phone
    await page.getByPlaceholder(/Phone/i).or(page.getByLabel(/Phone/i)).first().fill('0987654321');

    // Bước #7: bấm vào Male
    await page.getByRole('button', { name: /Male/i }).or(page.locator('text=Male')).first().click();

    // Bước #8: bấm vào Cricket
    await page.getByRole('button', { name: /Cricket/i }).or(page.locator('text=Cricket')).first().click();

    // Bước #9: điền SecretPassword123! vào ô Password
    await page.getByPlaceholder(/Password/i).or(page.getByLabel(/Password/i)).first().fill('SecretPassword123!');

    // Bước #10: Register
    await expect(page.locator('body')).toContainText('Register');

    // Bước #11: bấm vào Refresh
    await page.getByRole('button', { name: /Refresh/i }).or(page.locator('text=Refresh')).first().click();

  });
});

