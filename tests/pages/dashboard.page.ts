import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page.js';

export class DashboardPage extends BasePage {
  readonly welcomeHeading: Locator;
  readonly statsCards: Locator;
  readonly userProfilePill: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeHeading = page.locator('h1, h2, .welcome-title, [data-testid="welcome-heading"]').first();
    this.statsCards = page.locator('.kpi-card, .stat-card, [data-testid="stat-card"]');
    this.userProfilePill = page.locator('[data-testid="user-pill"], .user-badge, .profile-name').first();
  }

  public async navigate(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.waitForLoaded();
  }

  public async getWelcomeText(): Promise<string> {
    return (await this.welcomeHeading.textContent().catch(() => '')) || '';
  }

  public async getStatCardCount(): Promise<number> {
    return await this.statsCards.count();
  }
}

