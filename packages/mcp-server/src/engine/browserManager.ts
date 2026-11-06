import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { oracleWatcher } from './oracleWatcher.js';

export interface LaunchOptions {
  headless?: boolean;
  cdpPort?: number;
  useSystemChrome?: boolean;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isHeadless = false;

  public async launch(options: LaunchOptions = {}): Promise<Page> {
    this.isHeadless = options.headless ?? false;

    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--window-size=1280,900'
    ];

    try {
      // First try standard chromium
      this.browser = await chromium.launch({
        headless: this.isHeadless,
        args: launchArgs
      });
    } catch {
      // Fallback: try system installed Google Chrome
      this.browser = await chromium.launch({
        headless: this.isHeadless,
        channel: 'chrome',
        args: launchArgs
      });
    }

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 }
    });

    this.page = await this.context.newPage();
    oracleWatcher.attach(this.page);

    return this.page;
  }

  public getPage(): Page | null {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }
    return null;
  }

  public async close(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.page.close().catch(() => {});
    }
    if (this.context) {
      await this.context.close().catch(() => {});
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    this.page = null;
    this.context = null;
    this.browser = null;
  }
}

export const browserManager = new BrowserManager();
