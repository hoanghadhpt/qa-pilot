import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page.js';

export class RegisterPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.getByPlaceholder(/first name/i)
      .or(page.locator('input[ng-model*="FirstName"], input[name="firstName"]')).first();

    this.lastNameInput = page.getByPlaceholder(/last name/i)
      .or(page.locator('input[ng-model*="LastName"], input[name="lastName"]')).first();

    this.emailInput = page.getByPlaceholder(/email/i)
      .or(page.locator('input[type="email"], input[name="email"]')).first();

    this.phoneInput = page.getByPlaceholder(/phone/i)
      .or(page.locator('input[type="tel"], input[name="phone"]')).first();

    this.passwordInput = page.locator('input[id="firstpassword"], input[name="password"]').first();
    this.confirmPasswordInput = page.locator('input[id="secondpassword"], input[name="confirmPassword"]').first();

    this.submitButton = page.locator('button[id="submitbtn"], button[type="submit"], input[type="submit"]').first();
  }

  public async navigate(): Promise<void> {
    await this.page.goto('/Register.html');
    await this.waitForLoaded();
  }

  public async fillRegistrationForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password?: string;
  }): Promise<void> {
    if (await this.firstNameInput.isVisible().catch(() => false)) {
      await this.firstNameInput.fill(data.firstName);
    }
    if (await this.lastNameInput.isVisible().catch(() => false)) {
      await this.lastNameInput.fill(data.lastName);
    }
    if (await this.emailInput.isVisible().catch(() => false)) {
      await this.emailInput.fill(data.email);
    }
    if (await this.phoneInput.isVisible().catch(() => false)) {
      await this.phoneInput.fill(data.phone);
    }
    if (data.password) {
      if (await this.passwordInput.isVisible().catch(() => false)) {
        await this.passwordInput.fill(data.password);
      }
      if (await this.confirmPasswordInput.isVisible().catch(() => false)) {
        await this.confirmPasswordInput.fill(data.password);
      }
    }
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }
}

