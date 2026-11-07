import { Page, expect } from '@playwright/test';
import { NavbarComponent } from './components/navbar.component.js';
import { ToastComponent } from './components/toast.component.js';
import { ConfirmModalComponent } from './components/modal.component.js';

export abstract class BasePage {
  readonly page: Page;
  readonly navbar: NavbarComponent;
  readonly toast: ToastComponent;
  readonly modal: ConfirmModalComponent;

  constructor(page: Page) {
    this.page = page;
    this.navbar = new NavbarComponent(page);
    this.toast = new ToastComponent(page);
    this.modal = new ConfirmModalComponent(page);
  }

  /**
   * Phương thức điều hướng bắt buộc mỗi trang cụ thể phải tự định nghĩa
   */
  abstract navigate(): Promise<void>;

  public async waitForUrl(urlOrPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlOrPattern, { timeout: 15000 });
  }

  public async getTitle(): Promise<string> {
    return await this.page.title();
  }

  public async waitForLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  public async takeScreenshot(filename: string): Promise<string> {
    const filePath = `tests/runs/screenshots/${filename}`;
    await this.page.screenshot({ path: filePath, fullPage: false }).catch(() => {});
    return filePath;
  }
}

