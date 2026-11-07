import { Page, Locator, expect } from '@playwright/test';

export class ConfirmModalComponent {
  readonly page: Page;
  readonly modalContainer: Locator;
  readonly title: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modalContainer = page.locator('.modal, [role="dialog"], [aria-modal="true"], .confirm-dialog');
    this.title = this.modalContainer.locator('h1, h2, h3, .modal-title, [data-testid="modal-title"]');
    this.confirmButton = this.modalContainer.getByRole('button', { name: /confirm|ok|đồng ý|xác nhận|save|lưu/i }).first();
    this.cancelButton = this.modalContainer.getByRole('button', { name: /cancel|hủy|bỏ qua|close|đóng/i }).first();
  }

  public async confirm(): Promise<void> {
    await expect(this.modalContainer.first()).toBeVisible();
    await this.confirmButton.click();
  }

  public async cancel(): Promise<void> {
    await expect(this.modalContainer.first()).toBeVisible();
    await this.cancelButton.click();
  }

  public async getModalText(): Promise<string> {
    return (await this.modalContainer.textContent().catch(() => '')) || '';
  }
}

