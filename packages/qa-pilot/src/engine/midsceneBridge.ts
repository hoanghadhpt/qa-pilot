import { Page } from 'playwright';
import { PlaywrightPageAgent } from '@midscene/web';
import { reportManager } from './reportManager.js';
import { oracleWatcher } from './oracleWatcher.js';
import { modelConfigManager } from '../security/modelConfig.js';
import { globalRedactor } from '../security/redactor.js';

export interface ActionOptions {
  optional?: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
  screenshot?: string;
  oracleIssues?: string[];
}

export interface AssertResult {
  passed: boolean;
  message: string;
  screenshot?: string;
}

export class MidsceneBridge {
  private agent: PlaywrightPageAgent | null = null;
  private page: Page | null = null;

  public attach(page: Page): void {
    this.page = page;
    try {
      this.agent = new PlaywrightPageAgent(page);
    } catch (e: any) {
      console.error('[MidsceneBridge] Error initializing PlaywrightPageAgent:', e.message);
      this.agent = null;
    }
  }

  public getAgent(): PlaywrightPageAgent | null {
    return this.agent;
  }

  public async aiAction(action: string, options: ActionOptions = {}): Promise<ActionResult> {
    if (!this.page) {
      return { success: false, message: 'Chưa có phiên trình duyệt nào được mở' };
    }

    oracleWatcher.startStep();
    const startTime = Date.now();
    let screenshotAfter: string | undefined;

    try {
      if (this.agent && (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.MIDSCENE_MODEL_API_KEY)) {
        await this.agent.aiAction(action);
        // Track token metrics if available from midscene agent
        try {
          const m = (this.agent as any).metrics?.();
          if (m?.totalTokens) {
            modelConfigManager.recordUsage(m.promptTokens || 0, m.completionTokens || 0);
          }
        } catch {
          // ignore
        }
      } else {
        // Fallback: heuristic Playwright interaction
        await this.fallbackAction(action);
      }

      // Capture screenshot after step
      screenshotAfter = await this.captureScreenshot(`step-${Date.now()}.png`);

      const durationMs = Date.now() - startTime;
      const issues = oracleWatcher.getStepIssues();
      const issueSummary = issues.map(i => `[${i.type}] ${i.message}`);

      reportManager.addStep({
        stepIndex: (reportManager.getCurrentSession()?.steps.length || 0) + 1,
        type: 'act',
        instruction: action,
        status: issues.some(i => i.type === 'js_exception' || i.type === 'http_server_error') ? 'warning' : 'passed',
        durationMs,
        screenshotAfter,
        errorMessage: issueSummary.length > 0 ? `Cảnh báo nền: ${issueSummary.join(' | ')}` : undefined
      });

      let msg = `Thực thi thành công: "${action}" (${durationMs}ms)`;
      if (issueSummary.length > 0) {
        msg += ` ⚠️ Phát hiện ${issueSummary.length} vấn đề ngầm:\n` + issueSummary.map(s => `  - ${s}`).join('\n');
      }

      modelConfigManager.recordTurnEstimation(action, msg);

      return {
        success: true,
        message: msg,
        screenshot: screenshotAfter,
        oracleIssues: issueSummary
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      screenshotAfter = await this.captureScreenshot(`error-${Date.now()}.png`).catch(() => undefined);

      const status = options.optional ? 'warning' : 'failed';
      reportManager.addStep({
        stepIndex: (reportManager.getCurrentSession()?.steps.length || 0) + 1,
        type: 'act',
        instruction: action,
        status,
        durationMs,
        errorMessage: err.message,
        screenshotAfter
      });

      if (options.optional) {
        return {
          success: true,
          message: `Bước tùy chọn gặp cảnh báo: ${err.message}`,
          screenshot: screenshotAfter
        };
      }

      return {
        success: false,
        message: `Thất bại khi thực hiện: "${action}". Lỗi: ${err.message}`,
        screenshot: screenshotAfter
      };
    }
  }

  public async aiAssert(assertion: string): Promise<AssertResult> {
    if (!this.page) {
      return { passed: false, message: 'Chưa có phiên trình duyệt nào được mở' };
    }

    const startTime = Date.now();
    let screenshotAfter: string | undefined;

    try {
      if (this.agent && (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.MIDSCENE_MODEL_API_KEY)) {
        await this.agent.aiAssert(assertion);
      } else {
        await this.fallbackAssert(assertion);
      }

      screenshotAfter = await this.captureScreenshot(`assert-${Date.now()}.png`);
      const durationMs = Date.now() - startTime;

      reportManager.addStep({
        stepIndex: (reportManager.getCurrentSession()?.steps.length || 0) + 1,
        type: 'assert',
        instruction: assertion,
        status: 'passed',
        durationMs,
        screenshotAfter
      });

      modelConfigManager.recordTurnEstimation(assertion, `Xác thực ĐẠT: "${assertion}"`);
      return {
        passed: true,
        message: `Xác thực ĐẠT: "${assertion}" (${durationMs}ms)`,
        screenshot: screenshotAfter
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      screenshotAfter = await this.captureScreenshot(`assert-fail-${Date.now()}.png`).catch(() => undefined);

      reportManager.addStep({
        stepIndex: (reportManager.getCurrentSession()?.steps.length || 0) + 1,
        type: 'assert',
        instruction: assertion,
        status: 'failed',
        durationMs,
        errorMessage: err.message,
        screenshotAfter
      });

      return {
        passed: false,
        message: `Xác thực KHÔNG ĐẠT: "${assertion}". Lý do: ${err.message}`,
        screenshot: screenshotAfter
      };
    }
  }

  public async inspect(): Promise<{ summary: string; screenshot?: string }> {
    if (!this.page) {
      return { summary: 'Chưa có phiên trình duyệt nào được mở' };
    }

    const title = await this.page.title();
    const url = this.page.url();
    const screenshot = await this.captureScreenshot(`inspect-${Date.now()}.png`);

    // Extract interactive elements summary
    const interactiveElements = await this.page.evaluate(() => {
      const items: string[] = [];
      const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn');
      buttons.forEach((b: Element) => {
        const text = (b.textContent || (b as HTMLInputElement).value || '').trim();
        if (text) items.push(`Nút: "${text}"`);
      });
      const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
      inputs.forEach((i: Element) => {
        const placeholder = i.getAttribute('placeholder') || '';
        const name = i.getAttribute('name') || '';
        const type = (i as HTMLInputElement).type || 'text';
        items.push(`Trường nhập: [${type}] name="${name}" placeholder="${placeholder}"`);
      });
      return items.slice(0, 20);
    });

    const summary = [
      `Trang hiện tại: "${title}"`,
      `URL: ${url}`,
      `Phần tử tương tác tìm thấy (${interactiveElements.length}):`,
      ...interactiveElements.map(e => `  - ${e}`)
    ].join('\n');

    return { summary: globalRedactor.redact(summary), screenshot };
  }

  private async captureScreenshot(filename: string): Promise<string | undefined> {
    if (!this.page) return undefined;
    const session = reportManager.getCurrentSession();
    if (!session) return undefined;

    const filePath = `${session.reportDir}/${filename}`;
    await this.page.screenshot({ path: filePath, fullPage: false }).catch(() => {});
    return filePath;
  }

  /**
   * Fallback heuristic action executor when direct AI model is not configured
   */
  private async fallbackAction(action: string): Promise<void> {
    if (!this.page) return;
    const lower = action.toLowerCase();

    // Heuristic: First article / headline click on news portals
    if (lower.includes('bài báo đầu tiên') || lower.includes('tin tức đầu tiên') || lower.includes('bài viết đầu tiên') || lower.includes('first article')) {
      const articleLink = this.page.locator('article h2 a, article h3 a, .title-news a, .item-news h3 a, h2.title-news a, h3.title-news a').first();
      if (await articleLink.isVisible({ timeout: 4000 }).catch(() => false)) {
        await articleLink.click({ timeout: 5000 });
        return;
      }
    }

    // Heuristic: Submit / Confirm / Primary action button
    if (lower.includes('submit') || lower.includes('nút xác nhận') || lower.includes('nút thực thi chính') || lower.includes('nút gửi') || lower.includes('nút đăng ký') || lower.includes('nút hoàn thành')) {
      const submitBtn = this.page.locator('button[type="submit"], input[type="submit"], #submitbtn, button:has-text("Submit"), button:has-text("Xác nhận"), button:has-text("Đăng ký"), button:has-text("Lưu"), form button').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click({ timeout: 5000 });
        return;
      }
    }

    // Click patterns
    if (lower.startsWith('click ') || lower.startsWith('bấm ') || lower.startsWith('nhấp ') || lower.startsWith('chọn ')) {
      let target = action.replace(/^(click|bấm|nhấp|chọn)\s+(vào\s+)?(nút\s+|ô\s+|mục\s+|tab\s+|chuyên mục\s+)?/i, '').trim();
      if ((target.startsWith('"') && target.endsWith('"')) || (target.startsWith("'") && target.endsWith("'"))) {
        target = target.slice(1, -1);
      }
      
      const btn = this.page.getByRole('link', { name: new RegExp(`^${target}$`, 'i') })
        .or(this.page.getByRole('button', { name: new RegExp(target, 'i') }))
        .or(this.page.getByRole('link', { name: new RegExp(target, 'i') }))
        .or(this.page.locator(`[data-test="${target}"], .${target}, #${target}`))
        .or(this.page.locator(`nav a:has-text("${target}"), header a:has-text("${target}"), a:has-text("${target}")`))
        .or(this.page.locator(`button:has-text("${target}")`))
        .or(this.page.locator(`label:has-text("${target}")`))
        .or(this.page.locator(`input[value="${target}" i]`))
        .or(this.page.getByText(new RegExp(target, 'i')));
      
      await btn.first().click({ timeout: 5000 });
      await this.page.waitForTimeout(300);
      return;
    }

    // Fill / Input patterns
    if (lower.includes('điền ') || lower.includes('nhập ') || lower.startsWith('fill ')) {
      const match = action.match(/(?:điền|nhập|fill)\s+(.+?)\s+vào\s+(?:ô\s+|trường\s+)?(.+)/i);
      if (match) {
        let value = match[1].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        let fieldName = match[2].trim();
        if ((fieldName.startsWith('"') && fieldName.endsWith('"')) || (fieldName.startsWith("'") && fieldName.endsWith("'"))) {
          fieldName = fieldName.slice(1, -1);
        }
        
        // 1. Try placeholder
        const byPlaceholder = this.page.getByPlaceholder(new RegExp(fieldName, 'i'));
        if (await byPlaceholder.count() > 0) {
          await byPlaceholder.first().fill(value, { timeout: 3000 });
          return;
        }

        // 2. Try label or label adjacent/nested input
        const labelLocator = this.page.locator(`label:has-text("${fieldName}")`);
        if (await labelLocator.count() > 0) {
          // Check if label wraps input/textarea or is in same form group
          const inputInGroup = labelLocator.first().locator('..').locator('input, textarea');
          if (await inputInGroup.count() > 0) {
            await inputInGroup.first().fill(value, { timeout: 3000 });
            return;
          }
        }

        // 3. Try input by name or type or id or data-test
        const byNameOrId = this.page.locator(
          `input[data-test*="${fieldName}" i], ` +
          `input[name*="${fieldName}" i], textarea[name*="${fieldName}" i], ` +
          `input[id*="${fieldName}" i], input[type*="${fieldName}" i], ` +
          `textarea, input[ng-model*="${fieldName}" i]`
        );
        if (await byNameOrId.count() > 0) {
          await byNameOrId.first().fill(value, { timeout: 3000 });
          return;
        }

        // 4. Default fallback: getByLabel
        const input = this.page.getByLabel(new RegExp(fieldName, 'i'));
        await input.first().fill(value, { timeout: 3000 });
        return;
      }
    }

    // Default: try finding any clickable element matching terms in action
    const words = action.split(' ').filter(w => w.length > 2);
    if (words.length > 0) {
      const loc = this.page.locator(`text=${words[words.length - 1]}`);
      await loc.first().click({ timeout: 5000 });
    }
  }

  /**
   * Fallback heuristic assertion with polling for page transitions & async rendering
   */
  private async fallbackAssert(assertion: string): Promise<void> {
    if (!this.page) return;
    const clean = assertion.replace(/['"]/g, '').trim();
    const terms = clean.split(' ').filter(w => w.length > 3);

    const startTime = Date.now();
    while (Date.now() - startTime < 4000) {
      const pageContent = await this.page.textContent('body').catch(() => '');
      const hasMatch = terms.some(t => pageContent?.toLowerCase().includes(t.toLowerCase())) ||
        (pageContent ? pageContent.includes(clean) : false);

      if (hasMatch) {
        return;
      }
      await this.page.waitForTimeout(150);
    }

    const pageContent = await this.page.textContent('body').catch(() => '');
    throw new Error(`Nội dung khẳng định '${clean}' không xuất hiện trên giao diện trang`);
  }
}

export const midsceneBridge = new MidsceneBridge();
