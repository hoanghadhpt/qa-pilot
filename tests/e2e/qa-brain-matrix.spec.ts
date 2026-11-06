import { test, expect } from '@playwright/test';

test.describe('TC-QA-BRAIN-MATRIX-RUN', () => {
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

    // Bước #4: điền hoangha.qa@example.com vào ô Email
    await page.getByPlaceholder(/Email/i).or(page.getByLabel(/Email/i)).first().fill('hoangha.qa@example.com');

    // Bước #5: điền 0905123456 vào ô Phone
    await page.getByPlaceholder(/Phone/i).or(page.getByLabel(/Phone/i)).first().fill('0905123456');

    // Bước #6: bấm vào Male
    await page.getByRole('button', { name: /Male/i }).or(page.locator('text=Male')).first().click();

    // Bước #7: bấm vào Cricket
    await page.getByRole('button', { name: /Cricket/i }).or(page.locator('text=Cricket')).first().click();

    // Bước #8: điền <script>alert("XSS")</script> vào ô First Name
    // Hành động: điền <script>alert("XSS")</script> vào ô First Name

    // Bước #9: điền Nguyễn Văn Hoàng Hà vào ô First Name
    await page.getByPlaceholder(/First Name/i).or(page.getByLabel(/First Name/i)).first().fill('Nguyễn Văn Hoàng Hà');

    // Bước #10: điền plainaddress vào ô Email
    await page.getByPlaceholder(/Email/i).or(page.getByLabel(/Email/i)).first().fill('plainaddress');

    // Bước #11: bấm vào Refresh
    await page.getByRole('button', { name: /Refresh/i }).or(page.locator('text=Refresh')).first().click();

    // Bước #12: Register
    await expect(page.locator('body')).toContainText('Register');

  });
});