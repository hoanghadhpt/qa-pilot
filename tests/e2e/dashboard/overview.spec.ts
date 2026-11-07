import { test, expect } from '../../fixtures/test.fixture.js';

test.describe('Dashboard - Overview Module', () => {
  test('TC-DASH-001: Kiểm tra cấu trúc dashboard và navbar dùng chung', async ({
    dashboardPage,
  }) => {
    await dashboardPage.navigate();

    // Verify composed navbar widget
    await expect(dashboardPage.navbar.brandLogo).toBeDefined();

    // Verify composed toast widget
    await expect(dashboardPage.toast.toastContainer).toBeDefined();
  });
});

