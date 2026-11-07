import { Page, Locator, expect } from '@playwright/test';

export class NavbarComponent {
  readonly page: Page;
  readonly brandLogo: Locator;
  readonly navLinks: Locator;
  readonly userMenuButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brandLogo = page.locator('header a, nav a, .navbar-brand, [data-testid="brand-logo"]').first();
    this.navLinks = page.locator('nav a, header nav a, [role="navigation"] a');
    this.userMenuButton = page.locator('[data-testid="user-menu"], #user-menu, button:has-text("Account"), button:has-text("Tài khoản")').first();
    this.logoutButton = page.getByRole('button', { name: /logout|đăng xuất/i }).or(page.getByRole('link', { name: /logout|đăng xuất/i })).first();
  }

  public async navigateTo(name: string): Promise<void> {
    const link = this.page.getByRole('link', { name: new RegExp(name, 'i') }).first();
    await link.click();
  }

  public async logout(): Promise<void> {
    if (await this.userMenuButton.isVisible().catch(() => false)) {
      await this.userMenuButton.click();
    }
    await this.logoutButton.click();
  }

  public async getCurrentUserText(): Promise<string> {
    const userElement = this.page.locator('[data-testid="current-user"], .user-name, #user-info').first();
    return (await userElement.textContent().catch(() => '')) || '';
  }
}

