import { test, expect } from '@playwright/test';

test.describe('vnexpress-5-categories', () => {
  test('Thực thi kịch bản kiểm thử tự động', async ({ page }) => {
    // Điều hướng ban đầu
    await page.goto('https://vnexpress.net');
    await page.waitForLoadState('networkidle');

    // Bước #1: Mở URL: https://vnexpress.net
    await page.goto('Mở URL: https://vnexpress.net');

    // Bước #2: Click vào chuyên mục Thời sự
    await page.getByRole('button', { name: /chuyên mục Thời sự/i }).or(page.locator('text=chuyên mục Thời sự')).first().click();

    // Bước #3: Trang hiển thị bài viết thuộc Thời sự
    await expect(page.locator('body')).toContainText('Trang hiển thị bài viết thuộc Thời sự');

    // Bước #4: Click vào chuyên mục Kinh doanh
    await page.getByRole('button', { name: /chuyên mục Kinh doanh/i }).or(page.locator('text=chuyên mục Kinh doanh')).first().click();

    // Bước #5: Trang hiển thị bài viết thuộc Kinh doanh
    await expect(page.locator('body')).toContainText('Trang hiển thị bài viết thuộc Kinh doanh');

    // Bước #6: Click vào chuyên mục Thể thao
    await page.getByRole('button', { name: /chuyên mục Thể thao/i }).or(page.locator('text=chuyên mục Thể thao')).first().click();

    // Bước #7: Trang hiển thị bài viết thuộc Thể thao
    await expect(page.locator('body')).toContainText('Trang hiển thị bài viết thuộc Thể thao');

    // Bước #8: Click vào chuyên mục Giải trí
    await page.getByRole('button', { name: /chuyên mục Giải trí/i }).or(page.locator('text=chuyên mục Giải trí')).first().click();

    // Bước #9: Trang hiển thị bài viết thuộc Giải trí
    await expect(page.locator('body')).toContainText('Trang hiển thị bài viết thuộc Giải trí');

    // Bước #10: Click vào chuyên mục Thế giới
    await page.getByRole('button', { name: /chuyên mục Thế giới/i }).or(page.locator('text=chuyên mục Thế giới')).first().click();

    // Bước #11: Trang hiển thị bài viết thuộc Thế giới
    await expect(page.locator('body')).toContainText('Trang hiển thị bài viết thuộc Thế giới');

    // Bước #12: Click vào bài báo đầu tiên
    await page.getByRole('button', { name: /bài báo đầu tiên/i }).or(page.locator('text=bài báo đầu tiên')).first().click();

  });
});