import { Page, Locator, expect } from '@playwright/test';

export class ToastComponent {
  readonly page: Page;
  readonly toastContainer: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toastContainer = page.locator('.toast, [role="alert"], .notification, .alert, [data-testid="toast"]');
    this.successToast = page.locator('.toast-success, .alert-success, [data-status="success"]');
    this.errorToast = page.locator('.toast-error, .alert-danger, .alert-error, [data-status="error"]');
  }

  public async expectSuccess(messagePattern?: string | RegExp): Promise<void> {
    const toast = this.toastContainer.first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    if (messagePattern) {
      await expect(toast).toContainText(messagePattern);
    }
  }

  public async expectError(messagePattern?: string | RegExp): Promise<void> {
    const toast = this.toastContainer.first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    if (messagePattern) {
      await expect(toast).toContainText(messagePattern);
    }
  }

  public async dismiss(): Promise<void> {
    const closeBtn = this.toastContainer.locator('button, [aria-label="Close"], .close').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  }
}

