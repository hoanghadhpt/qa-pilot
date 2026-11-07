import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page.js';

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByRole('textbox', { name: /username|email|e mail|tài khoản/i })
      .or(page.getByPlaceholder(/e mail|email|username/i))
      .or(page.locator('input[ng-model="Email"], input[type="email"], input[name="username"], input[name="email"]')).first();

    this.passwordInput = page.getByPlaceholder(/password|mật khẩu/i)
      .or(page.locator('input[type="password"]')).first();

    this.submitButton = page.getByRole('button', { name: /login|đăng nhập|sign in/i })
      .or(page.locator('#enterbtn, button[type="submit"], input[type="submit"]')).first();

    this.errorMessage = page.locator('.error, .alert-danger, [role="alert"], .error-message').first();
  }

  public async navigate(): Promise<void> {
    await this.page.goto('/SignIn.html');
    await this.waitForLoaded();
  }

  public async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  public async expectErrorMessage(pattern: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(pattern);
  }
}
