import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { oracleWatcher } from './oracleWatcher.js';
import { PlaywrightStorageState } from '../types.js';

export interface LaunchOptions {
  headless?: boolean;
  cdpPort?: number;
  useSystemChrome?: boolean;
  storageState?: string | PlaywrightStorageState;
  role?: string;
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

    if (!this.browser) {
      try {
        // First try standard chromium
        this.browser = await chromium.launch({
          headless: this.isHeadless,
          args: launchArgs
        });
      } catch (chromiumErr: any) {
        try {
          // Fallback: try system installed Google Chrome
          this.browser = await chromium.launch({
            headless: this.isHeadless,
            channel: 'chrome',
            args: launchArgs
          });
        } catch (chromeErr: any) {
          throw new Error(
            `[QA Pilot] Không thể khởi chạy trình duyệt Chromium hoặc Google Chrome.\n` +
            `Chi tiết: ${chromiumErr?.message || chromiumErr}\n` +
            `👉 Hướng dẫn khắc phục:\n` +
            `   Vui lòng chạy lệnh sau để tải trình duyệt Chromium cho Playwright:\n` +
            `   npx playwright install chromium\n` +
            `   Hoặc cài đặt Google Chrome trên máy của bạn.`
          );
        }
      }
    }

    const contextOptions: any = {
      viewport: { width: 1280, height: 900 }
    };

    if (options.storageState) {
      contextOptions.storageState = options.storageState;
    }

    this.context = await this.browser.newContext(contextOptions);

    this.page = await this.context.newPage();
    oracleWatcher.attach(this.page);

    return this.page;
  }

  public getContext(): BrowserContext | null {
    return this.context;
  }

  public getBrowser(): Browser | null {
    return this.browser;
  }

  public getPage(): Page | null {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }
    return null;
  }

  /**
   * Tái tạo Context với Storage State mới (dành cho qa_auth_load / chuyển đổi vai trò)
   */
  public async reloadWithStorageState(storageState: PlaywrightStorageState): Promise<Page> {
    if (!this.browser) {
      await this.launch({ storageState });
      return this.page!;
    }

    if (this.page && !this.page.isClosed()) {
      await this.page.close().catch(() => {});
    }
    if (this.context) {
      await this.context.close().catch(() => {});
    }

    this.context = await this.browser.newContext({
      storageState: storageState as any,
      viewport: { width: 1280, height: 900 }
    });

    this.page = await this.context.newPage();
    oracleWatcher.attach(this.page);
    return this.page;
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
