import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { spawn, execFileSync, ChildProcess } from 'child_process';
import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright-core';
import { config } from '../config/env';
import { TestAssertion, TestSpec, TestStep } from './specAdapter';
import { environmentManager } from './environmentManager';
import {
  artifactManager,
  AiDiagnosis,
  BoundingBox,
  StepRunResult,
  TestRunSummary,
} from './artifactManager';
import { imageAnnotator } from './imageAnnotator';

export interface CdpStatusInfo {
  connected: boolean;
  browser?: string;
  cdpUrl: string;
  headless: boolean;
}

export interface DiscoveredElement {
  selector: string;
  tag: string;
  type?: string;
  role?: string;
  label: string;
  suggestedAction: 'input' | 'click' | 'assert';
}

export interface PageExplorationResult {
  url: string;
  title: string;
  elements: DiscoveredElement[];
  a11ySummary: string;
}

export interface ExplorationScreenTrace {
  screenIndex: number;
  url: string;
  title: string;
  actionExecuted: string;
  elementCount: number;
  elements: DiscoveredElement[];
  matchedTexts: Array<{ selector: string; text: string }>;
  a11ySummary: string;
}

export interface ParsedPromptClause {
  type: 'open' | 'scroll' | 'click' | 'assert' | 'input_form' | 'assert_page_loaded';
  rawText: string;
  target?: string;
  expected?: string;
  containerHint?: string;
  checkNoErrors?: boolean;
}

export interface MultiStageExplorationResult {
  primaryUrl: string;
  needsScroll: boolean;
  extractedKeywords: string[];
  traces: ExplorationScreenTrace[];
  combinedSummary: string;
  synthesizedSteps?: TestStep[];
  synthesizedAssertions?: TestAssertion[];
}

export interface AiAgentInfo {
  id: string;
  name: string;
  command: string;
  installed: boolean;
  binaryPath: string | null;
  version: string | null;
  model: string;
  active: boolean;
}

export type RunnerEventCallback = (event: string, payload: unknown) => void;

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

export class CliRunner {
  private chromeProcess: ChildProcess | null = null;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private headlessMode = false;
  private abortRequested = false;
  private lastInteractedBox: BoundingBox | null = null;
  private activeAgentId: string | null = null;
  private cachedAgentVersions = new Map<string, string | null>();

  public async getCdpStatus(): Promise<CdpStatusInfo> {
    const versionInfo = await this.probeCdpVersion();
    return {
      connected: Boolean(versionInfo),
      browser: versionInfo?.Browser || undefined,
      cdpUrl: config.cdpUrl,
      headless: this.headlessMode,
    };
  }

  private probeCdpVersion(): Promise<{ Browser?: string; webSocketDebuggerUrl?: string } | null> {
    return new Promise((resolve) => {
      const req = http.get(`${config.cdpUrl}/json/version`, { timeout: 1200 }, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  public async ensureCdpBrowser(headless?: boolean): Promise<CdpStatusInfo> {
    if (typeof headless === 'boolean' && headless !== this.headlessMode) {
      await this.closeBrowser();
      this.headlessMode = headless;
    }

    const existing = await this.probeCdpVersion();
    if (existing) {
      return {
        connected: true,
        browser: existing.Browser,
        cdpUrl: config.cdpUrl,
        headless: this.headlessMode,
      };
    }

    fs.mkdirSync(config.chromeProfileDir, { recursive: true });
    const chromeBinary = CHROME_CANDIDATES.find((p) => fs.existsSync(p));

    if (chromeBinary) {
      const args = [
        '--remote-debugging-address=127.0.0.1',
        `--remote-debugging-port=${config.cdpPort}`,
        `--user-data-dir=${config.chromeProfileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1280,800',
      ];
      if (this.headlessMode) {
        args.push('--headless=new');
      }
      args.push('about:blank');

      this.chromeProcess = spawn(chromeBinary, args, {
        detached: true,
        stdio: 'ignore',
      });
      this.chromeProcess.unref();

      for (let attempt = 0; attempt < 25; attempt++) {
        await new Promise((r) => setTimeout(r, 300));
        const info = await this.probeCdpVersion();
        if (info) {
          return {
            connected: true,
            browser: info.Browser,
            cdpUrl: config.cdpUrl,
            headless: this.headlessMode,
          };
        }
      }
    }

    // Fallback: launch via playwright-core with system Chrome executable if available
    this.browser = await chromium.launch({
      headless: this.headlessMode,
      ...(chromeBinary ? { executablePath: chromeBinary } : {}),
      args: [
        '--remote-debugging-address=127.0.0.1',
        `--remote-debugging-port=${config.cdpPort}`,
      ],
    });
    const info = await this.probeCdpVersion();
    return {
      connected: Boolean(info || this.browser),
      browser: info?.Browser || 'Chromium (CDP)',
      cdpUrl: config.cdpUrl,
      headless: this.headlessMode,
    };
  }

  private async getPersistentPage(): Promise<{ page: Page; cdpSession: CDPSession }> {
    await this.ensureCdpBrowser(this.headlessMode);

    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.connectOverCDP(config.cdpUrl);
    }

    const contexts = this.browser.contexts();
    this.context =
      contexts.length > 0
        ? contexts[0]
        : await this.browser.newContext({ viewport: { width: 1280, height: 800 } });

    const pages = this.context.pages().filter((p) => !p.url().startsWith('devtools://'));
    if (!this.page || this.page.isClosed()) {
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
      await this.page.setViewportSize({ width: 1280, height: 800 }).catch(() => {});
    }

    const cdpSession = await this.page.context().newCDPSession(this.page);
    await cdpSession.send('Accessibility.enable').catch(() => {});
    await cdpSession.send('DOM.enable').catch(() => {});
    await cdpSession.send('Runtime.enable').catch(() => {});
    await cdpSession.send('Network.enable').catch(() => {});

    return { page: this.page, cdpSession };
  }

  public async closeBrowser(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
        this.context = null;
        this.page = null;
      }
      if (this.chromeProcess) {
        this.chromeProcess.kill();
        this.chromeProcess = null;
      }
    } catch {
      // ignore cleanup errors
    }
  }

  public stopActiveRun(): void {
    this.abortRequested = true;
  }

  public async explorePage(rawUrl: string): Promise<PageExplorationResult> {
    const targetUrl = rawUrl.trim();
    if (!targetUrl) {
      throw new Error('URL khám phá không được để trống.');
    }

    const { page, cdpSession } = await this.getPersistentPage();

    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      await page.goto(targetUrl, { timeout: 15000 }).catch(() => {});
    }

    await page.waitForTimeout(800).catch(() => {});

    const title = (await page.title().catch(() => '')) || '';
    const currentUrl = page.url();

    const elements = await page.evaluate(() => {
      const results: Array<{
        selector: string;
        tag: string;
        type?: string;
        role?: string;
        label: string;
        suggestedAction: 'input' | 'click' | 'assert';
      }> = [];
      const seenSelectors = new Set<string>();

      // 1. Inputs, Textareas, Selects
      const inputs = document.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]), textarea, select'
      );
      inputs.forEach((el) => {
        if (results.length >= 30) return;
        const tag = el.tagName.toLowerCase();
        const type =
          el.getAttribute('type') ||
          (tag === 'textarea' ? 'textarea' : tag === 'select' ? 'select' : 'text');
        const id = el.id ? `#${el.id}` : '';
        const ngModel = el.getAttribute('ng-model');
        const name = el.getAttribute('name');
        const placeholder = el.getAttribute('placeholder');
        const ariaLabel = el.getAttribute('aria-label');

        let selector = '';
        if (id && !/^\d/.test(el.id)) {
          selector = id;
        } else if (ngModel) {
          selector = `${tag}[ng-model='${ngModel}']`;
        } else if (name) {
          selector = `${tag}[name='${name}']`;
        } else if (placeholder) {
          selector = `${tag}[placeholder='${placeholder}']`;
        } else if (ariaLabel) {
          selector = `${tag}[aria-label='${ariaLabel}']`;
        } else {
          const cls = (el.className || '')
            .trim()
            .split(/\s+/)
            .filter((c) => c && !c.includes(':'))[0];
          if (cls) selector = `${tag}.${cls}`;
        }

        if (!selector || seenSelectors.has(selector)) return;
        seenSelectors.add(selector);

        let label = placeholder || ariaLabel || '';
        if (!label && el.id) {
          const l = document.querySelector(`label[for="${el.id}"]`);
          if (l) label = l.textContent?.trim() || '';
        }
        if (!label && el.closest('label')) {
          label = el.closest('label')?.textContent?.trim() || '';
        }
        if (!label) label = name || ngModel || selector;

        const isClickable =
          type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio';
        results.push({
          selector,
          tag,
          type,
          role: isClickable ? 'button' : 'textbox',
          label: label.slice(0, 50),
          suggestedAction: isClickable ? 'click' : 'input',
        });
      });

      // 2. Buttons & Clickables
      const buttons = document.querySelectorAll<HTMLElement>(
        'button, [role="button"], input[type="submit"], input[type="button"]'
      );
      buttons.forEach((el) => {
        if (results.length >= 45) return;
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        const ariaLabel = el.getAttribute('aria-label');

        let selector = '';
        if (id && !/^\d/.test(el.id)) {
          selector = id;
        } else if (text && text.length < 30) {
          selector = `${tag}:has-text("${text}")`;
        } else if (ariaLabel) {
          selector = `${tag}[aria-label='${ariaLabel}']`;
        }

        if (!selector || seenSelectors.has(selector)) return;
        seenSelectors.add(selector);

        results.push({
          selector,
          tag,
          role: 'button',
          label: (text || ariaLabel || selector).slice(0, 50),
          suggestedAction: 'click',
        });
      });

      // 3. Significant Links
      const links = document.querySelectorAll<HTMLAnchorElement>('a[href]');
      links.forEach((a) => {
        if (results.length >= 55) return;
        const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
        const href = a.getAttribute('href') || '';
        if (text && text.length > 2 && text.length < 40) {
          let selector = '';
          if (a.id) selector = `#${a.id}`;
          else selector = `a:has-text("${text}")`;

          if (seenSelectors.has(selector)) return;
          seenSelectors.add(selector);

          results.push({
            selector,
            tag: 'a',
            role: 'link',
            label: `${text} (${href.slice(0, 30)})`.slice(0, 50),
            suggestedAction: 'click',
          });
        }
      });

      return results;
    });

    const a11yNodes = await this.extractCompactA11yTree(cdpSession);
    const summaryLines = [
      `- Tiêu đề trang: "${title}"`,
      `- URL hiện tại: ${currentUrl}`,
      `- Phần tử tương tác chính (${elements.length}):`,
      ...elements.slice(0, 25).map((e) => `  * [${e.suggestedAction}] ${e.selector} (${e.label})`),
    ];

    if (a11yNodes.length > 0) {
      summaryLines.push(
        `- Cây ngữ nghĩa a11y (${a11yNodes.length} nút):`,
        ...a11yNodes.slice(0, 20).map((n) => `  * ${n.role}: "${n.name}"`)
      );
    }

    return {
      url: currentUrl,
      title,
      elements,
      a11ySummary: summaryLines.join('\n'),
    };
  }

  private async inspectCurrentScreen(
    page: Page,
    cdpSession: CDPSession,
    screenIndex: number,
    actionExecuted: string,
    keywords: string[],
    shouldScroll: boolean
  ): Promise<ExplorationScreenTrace> {
    if (shouldScroll) {
      await page
        .evaluate(async () => {
          const h = document.body.scrollHeight || document.documentElement.scrollHeight;
          window.scrollTo({ top: Math.floor(h / 2), behavior: 'instant' as ScrollBehavior });
          await new Promise((r) => setTimeout(r, 250));
          const finalH = document.body.scrollHeight || document.documentElement.scrollHeight;
          window.scrollTo({ top: finalH, behavior: 'instant' as ScrollBehavior });
        })
        .catch(() => {});
      await page.waitForTimeout(500).catch(() => {});
    }

    const title = (await page.title().catch(() => '')) || '';
    const currentUrl = page.url();

    const { elements, matchedTexts } = await page.evaluate((searchKeywords: string[]) => {
      const results: Array<{
        selector: string;
        tag: string;
        type?: string;
        role?: string;
        label: string;
        suggestedAction: 'input' | 'click' | 'assert';
      }> = [];
      const seenSelectors = new Set<string>();

      // 1. Inputs, Textareas, Selects
      const inputs = document.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]), textarea, select'
      );
      inputs.forEach((el) => {
        if (results.length >= 30) return;
        const tag = el.tagName.toLowerCase();
        const type =
          el.getAttribute('type') ||
          (tag === 'textarea' ? 'textarea' : tag === 'select' ? 'select' : 'text');
        const id = el.id ? `#${el.id}` : '';
        const ngModel = el.getAttribute('ng-model');
        const name = el.getAttribute('name');
        const placeholder = el.getAttribute('placeholder');
        const ariaLabel = el.getAttribute('aria-label');

        let selector = '';
        if (id && !/^\d/.test(el.id)) {
          selector = id;
        } else if (ngModel) {
          selector = `${tag}[ng-model='${ngModel}']`;
        } else if (name) {
          selector = `${tag}[name='${name}']`;
        } else if (placeholder) {
          selector = `${tag}[placeholder='${placeholder}']`;
        } else if (ariaLabel) {
          selector = `${tag}[aria-label='${ariaLabel}']`;
        } else {
          const cls = (el.className || '')
            .trim()
            .split(/\s+/)
            .filter((c) => c && !c.includes(':'))[0];
          if (cls) selector = `${tag}.${cls}`;
        }

        if (!selector || seenSelectors.has(selector)) return;
        seenSelectors.add(selector);

        let label = placeholder || ariaLabel || '';
        if (!label && el.id) {
          const l = document.querySelector(`label[for="${el.id}"]`);
          if (l) label = l.textContent?.trim() || '';
        }
        if (!label && el.closest('label')) {
          label = el.closest('label')?.textContent?.trim() || '';
        }
        if (!label) label = name || ngModel || selector;

        const isClickable =
          type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio';
        results.push({
          selector,
          tag,
          type,
          role: isClickable ? 'button' : 'textbox',
          label: label.slice(0, 50),
          suggestedAction: isClickable ? 'click' : 'input',
        });
      });

      // 2. Buttons & Clickables
      const buttons = document.querySelectorAll<HTMLElement>(
        'button, [role="button"], input[type="submit"], input[type="button"]'
      );
      buttons.forEach((el) => {
        if (results.length >= 45) return;
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        const ariaLabel = el.getAttribute('aria-label');

        let selector = '';
        if (id && !/^\d/.test(el.id)) {
          selector = id;
        } else if (text && text.length < 30) {
          selector = `${tag}:has-text("${text}")`;
        } else if (ariaLabel) {
          selector = `${tag}[aria-label='${ariaLabel}']`;
        }

        if (!selector || seenSelectors.has(selector)) return;
        seenSelectors.add(selector);

        results.push({
          selector,
          tag,
          role: 'button',
          label: (text || ariaLabel || selector).slice(0, 50),
          suggestedAction: 'click',
        });
      });

      // 3. Significant Links (prioritize links matching keywords or inside footer/nav)
      const links = document.querySelectorAll<HTMLAnchorElement>('a[href]');
      const lowerSearchKeywords = searchKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
      links.forEach((a) => {
        const text = (a.textContent || '').trim().replace(/\s+/g, ' ');
        const href = a.getAttribute('href') || '';
        if (!text || text.length < 2 || text.length >= 45) return;

        const lowerText = text.toLowerCase();
        const isKeywordMatch = lowerSearchKeywords.some(
          (kw) => lowerText.includes(kw) || kw.includes(lowerText)
        );
        const isInFooter = Boolean(a.closest('footer, .footer, #footer'));

        if (results.length >= 65 && !isKeywordMatch && !isInFooter) return;
        if (results.length >= 95) return;

        let selector = '';
        if (a.id && !/^\d/.test(a.id)) selector = `#${a.id}`;
        else selector = `a:has-text("${text}")`;

        if (seenSelectors.has(selector)) return;
        seenSelectors.add(selector);

        results.push({
          selector,
          tag: 'a',
          role: 'link',
          label: `${text} (${href.slice(0, 35)})`.slice(0, 60),
          suggestedAction: 'click',
        });
      });

      // 4. Match text elements against prompt keywords & inspect footer/landmarks
      const matched: Array<{ selector: string; text: string }> = [];
      const seenMatched = new Set<string>();

      for (const kw of searchKeywords) {
        const cleanKw = kw.trim();
        if (!cleanKw || cleanKw.length < 2) continue;
        const lowerKw = cleanKw.toLowerCase();
        const normKw = lowerKw.replace(/[.\-–—\s]+/g, ' ').trim();
        const valuePart = cleanKw.includes(':')
          ? cleanKw
              .split(':')
              .slice(1)
              .join(':')
              .toLowerCase()
              .replace(/[.\-–—\s]+/g, ' ')
              .trim()
          : '';

        // Check landmark containers first (footer, header, main, h1, h2, p, a, li, div)
        const candidates = document.querySelectorAll<HTMLElement>(
          'footer, #footer, .footer, h1, h2, h3, p, a, li, span, div'
        );
        for (let i = 0; i < candidates.length; i++) {
          const el = candidates[i];
          const rawText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
          if (!rawText) continue;
          const normRaw = rawText.toLowerCase().replace(/[.\-–—\s]+/g, ' ').trim();
          const isMatch =
            rawText.toLowerCase().includes(lowerKw) ||
            (normKw.length >= 3 && normRaw.includes(normKw)) ||
            (valuePart.length >= 3 && normRaw.includes(valuePart));
          if (!isMatch) continue;

          // Prefer leaf-ish or semantic container (e.g., footer or element with <= 300 chars)
          const tag = el.tagName.toLowerCase();
          let sel = '';
          if (tag === 'footer' || el.closest('footer, .footer, #footer')) {
            sel = document.querySelector('footer')
              ? 'footer'
              : document.querySelector('#footer')
              ? '#footer'
              : '.footer';
          } else if (el.id && !/^\d/.test(el.id)) {
            sel = `#${el.id}`;
          } else if (['h1', 'h2', 'h3'].includes(tag)) {
            sel = tag;
          } else if (rawText.length <= 120) {
            sel = `${tag}:has-text("${cleanKw.slice(0, 40)}")`;
          } else {
            continue;
          }

          const key = `${sel}::${cleanKw}`;
          if (!seenMatched.has(key)) {
            seenMatched.add(key);
            matched.push({
              selector: sel,
              text: rawText.slice(0, 160),
            });
            break;
          }
        }
      }

      // Always capture a snippet of footer if present on page
      const footerEl = document.querySelector<HTMLElement>('footer, .footer, #footer');
      if (footerEl) {
        const footerText = (footerEl.innerText || footerEl.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (footerText) {
          const sel = document.querySelector('footer')
            ? 'footer'
            : footerEl.id
            ? `#${footerEl.id}`
            : '.footer';
          if (!seenMatched.has(`${sel}::footer`)) {
            matched.push({
              selector: sel,
              text: footerText.slice(0, 220),
            });
          }
        }
      }

      return { elements: results, matchedTexts: matched };
    }, keywords);

    const a11yNodes = await this.extractCompactA11yTree(cdpSession);
    const summaryLines = [
      `### Màn hình ${screenIndex}: "${title}" (${currentUrl})`,
      `- Thao tác đã thực hiện: ${actionExecuted}`,
      `- Phần tử tương tác (${elements.length}):`,
      ...elements.slice(0, 25).map((e) => `  * [${e.suggestedAction}] ${e.selector} (${e.label})`),
    ];

    if (matchedTexts.length > 0) {
      summaryLines.push(
        `- Nội dung văn bản / vùng trang khớp với yêu cầu:`,
        ...matchedTexts.map((m) => `  * Bộ chọn '${m.selector}' chứa: "${m.text}"`)
      );
    }

    if (a11yNodes.length > 0) {
      summaryLines.push(
        `- Cây ngữ nghĩa a11y (${a11yNodes.length} nút):`,
        ...a11yNodes.slice(0, 15).map((n) => `  * ${n.role}: "${n.name}"`)
      );
    }

    return {
      screenIndex,
      url: currentUrl,
      title,
      actionExecuted,
      elementCount: elements.length,
      elements,
      matchedTexts,
      a11ySummary: summaryLines.join('\n'),
    };
  }

  public parsePromptIntoClauses(prompt: string, primaryUrl: string): {
    clauses: ParsedPromptClause[];
    keywords: string[];
  } {
    const clauses: ParsedPromptClause[] = [];
    const keywords = new Set<string>();

    // Extract quoted strings & emails globally into keywords for DOM matching
    const quotedRegex = /`([^`]+)`|"([^"]+)"|'([^']+)'/g;
    let qm: RegExpExecArray | null;
    while ((qm = quotedRegex.exec(prompt)) !== null) {
      const val = (qm[1] || qm[2] || qm[3] || '').trim();
      if (val && !val.startsWith('http')) {
        keywords.add(val);
      }
    }
    const emailMatches = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    emailMatches.forEach((em) => keywords.add(em));

    const lines = prompt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let currentContainerHint = '';
    let inVerificationBlock = false;
    let hasEmittedOpen = false;

    const startsWithActionVerb = (text: string) =>
      /^(?:mở|truy cập|vào|kéo|cuộn|scroll|kiểm tra|check|verify|đảm bảo|xác nhận|sau đó|rồi|tiếp theo|bấm|click|nhấn|chọn|nhập|điền)(?=\s|$|[,;:.?!])/i.test(
        text.trim()
      );

    for (const line of lines) {
      const cleanLine = line.replace(/^[-*•+]\s*/, '').trim();
      if (!cleanLine) continue;

      // Check if this line is a standalone verification item (e.g., "Đường dây nóng: 083 888 0123", "Email: bandoc@vnexpress.net")
      const isKeyValueDataLine =
        !startsWithActionVerb(cleanLine) &&
        /^[A-Za-zÀ-ỹ0-9\s/()_-]{2,35}:\s*\S+/.test(cleanLine) &&
        !/^https?:/i.test(cleanLine);

      const isStandaloneDataInBlock =
        inVerificationBlock &&
        !startsWithActionVerb(cleanLine) &&
        cleanLine.length >= 3 &&
        cleanLine.length <= 120;

      if (isKeyValueDataLine || isStandaloneDataInBlock) {
        const expectedVal = cleanLine.replace(/^["'`]|["'`]$/g, '').trim();
        keywords.add(expectedVal);
        if (expectedVal.includes(':')) {
          const valPart = expectedVal.split(':').slice(1).join(':').trim();
          if (valPart) keywords.add(valPart);
        }
        clauses.push({
          type: 'assert',
          rawText: cleanLine,
          expected: expectedVal,
          containerHint: currentContainerHint || 'body',
        });
        continue;
      }

      // Split complex line into chronological sub-clauses
      const subClauses = cleanLine
        .split(
          /(?:[,;.]\s*|\s+(?:và|rồi|sau đó|tiếp theo|đồng thời)\s+)(?=(?:mở|truy cập|kéo|cuộn|scroll|kiểm tra|check|verify|đảm bảo|xác nhận|sau đó|bấm|click|nhấn|chọn|nhập|điền)(?:\s|$))|\s+(?=(?:đảm bảo|kiểm tra xem|kiểm tra|xác nhận)(?:\s|$))/i
        )
        .map((s) => s.trim())
        .filter(Boolean);

      for (const sub of subClauses) {
        const cleanSub = sub.replace(/^(?:sau đó|rồi|tiếp theo|và)\s+/i, '').trim();
        if (!cleanSub) continue;

        // 1. Open URL clause
        if (
          !hasEmittedOpen &&
          (/^(?:mở|truy cập|vào)(?=\s|$)/i.test(cleanSub) || /https?:\/\//i.test(cleanSub))
        ) {
          hasEmittedOpen = true;
          clauses.push({
            type: 'open',
            rawText: cleanSub,
            target: primaryUrl,
          });
          continue;
        }

        // 2. Scroll clause
        if (
          /(?:^|\s)(?:kéo xuống|cuộn xuống|scroll xuống|kéo đến|cuộn đến|scroll to|cuộn trang|kéo trang)(?=\s|$)/i.test(
            cleanSub
          )
        ) {
          const isBottom =
            /cuối màn hình|cuối trang|cuối cùng|đáy trang|bottom|footer|chân trang/i.test(
              cleanSub
            );
          if (isBottom) {
            currentContainerHint = 'footer';
          }
          clauses.push({
            type: 'scroll',
            rawText: cleanSub,
            target: isBottom ? 'bottom' : 'top',
            expected: isBottom ? 'footer' : undefined,
          });
          continue;
        }

        // 3. Click / Navigation clause
        const clickMatch = cleanSub.match(
          /^(?:bấm vào|click vào|nhấn vào|bấm chọn|click chọn|bấm|click|nhấn|chọn)\s+(?:(?:màn hình|màn|chuyên mục|mục|menu|tab|nút|button|link|liên kết|trang|phần|ô)\s+)?["'`]?([^"'`\n,;?!]+)["'`]?/i
        );
        if (clickMatch) {
          const targetCandidate = (clickMatch[1] || '')
            .replace(
              /\s+(?:đảm bảo|kiểm tra|xác nhận|để xem|để kiểm tra|xem|sau đó|rồi|và)(?=\s|$).*$/i,
              ''
            )
            .replace(/^["'`]|["'`]$/g, '')
            .trim();
          if (
            targetCandidate &&
            !targetCandidate.startsWith('http') &&
            !/^(cuối|đầu|trang|đó|này|tiếp)$/i.test(targetCandidate)
          ) {
            keywords.add(targetCandidate);
            clauses.push({
              type: 'click',
              rawText: cleanSub,
              target: targetCandidate,
            });
            currentContainerHint = '';
            inVerificationBlock = false;
            continue;
          }
        }

        // 4. Form input clause
        if (
          /(?:^|\s)(?:nhập|điền|fill)(?=\s|$)/i.test(cleanSub) &&
          /(?:form|biểu mẫu|thông tin|đăng ký|đăng nhập)/i.test(cleanSub)
        ) {
          clauses.push({
            type: 'input_form',
            rawText: cleanSub,
          });
          continue;
        }

        // 5. Verification / Assert clause
        if (/(?:^|\s)(?:kiểm tra|đảm bảo|xác nhận|verify|check|assert)(?=\s|$)/i.test(cleanSub)) {
          if (/(?:footer|chân trang|cuối màn hình|cuối trang)/i.test(cleanSub)) {
            currentContainerHint = 'footer';
          } else if (/(?:header|đầu trang)/i.test(cleanSub)) {
            currentContainerHint = 'header';
          }

          // Check if this is a page-load / no-error verification (e.g. "đảm bảo nội dung được load thành công, không lỗi")
          if (
            /(?:nội dung.*(?:load|tải|hiển thị)|(?:load|tải)\s+thành công|không\s+(?:có\s+)?lỗi)/i.test(
              cleanSub
            )
          ) {
            clauses.push({
              type: 'assert_page_loaded',
              rawText: cleanSub,
              checkNoErrors: /không\s+(?:có\s+)?lỗi|no\s+error/i.test(cleanSub),
            });
            continue;
          }

          // Extract any inline quoted items or inline Key: Value or email in this clause
          const inlineItems: string[] = [];
          let im: RegExpExecArray | null;
          const inlineQuoteRegex = /`([^`]+)`|"([^"]+)"|'([^']+)'/g;
          while ((im = inlineQuoteRegex.exec(cleanSub)) !== null) {
            const val = (im[1] || im[2] || im[3] || '').trim();
            if (val && !val.startsWith('http')) {
              inlineItems.push(val);
            }
          }

          if (inlineItems.length === 0) {
            // Look for inline email or Key: Value after "chứa" / "có"
            const inlineKv = cleanSub.match(
              /(?:chứa|có|hiển thị)\s+(?:thông tin\s+|nội dung\s+)?([A-Za-zÀ-ỹ0-9\s]{2,25}:\s*[^\s,;?!]+(?:\s+[0-9]{3,4})*|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
            );
            if (inlineKv && inlineKv[1]) {
              inlineItems.push(inlineKv[1].trim());
            }
          }

          for (const item of inlineItems) {
            keywords.add(item);
            if (item.includes(':')) {
              const vp = item.split(':').slice(1).join(':').trim();
              if (vp) keywords.add(vp);
            }
            clauses.push({
              type: 'assert',
              rawText: cleanSub,
              expected: item,
              containerHint: currentContainerHint || 'body',
            });
          }

          if (
            /(?:như sau|sau đây|không\?|gồm:|bao gồm)/i.test(cleanSub) ||
            inlineItems.length === 0
          ) {
            inVerificationBlock = true;
          }
        }
      }
    }

    if (!hasEmittedOpen && primaryUrl) {
      clauses.unshift({
        type: 'open',
        rawText: `Mở trang ${primaryUrl}`,
        target: primaryUrl,
      });
    }

    return {
      clauses,
      keywords: Array.from(keywords),
    };
  }

  public async exploreMultiStageFlow(
    prompt: string,
    defaultBaseUrl?: string
  ): Promise<MultiStageExplorationResult> {
    // 1. Extract URLs from natural language prompt
    const urlMatches = prompt.match(/https?:\/\/[^\s"'<>`,;)]+/gi) || [];
    const cleanedUrls = urlMatches.map((u) => u.replace(/[.,;:!?)]+$/, ''));

    // Also detect bare domain if user wrote e.g. "vnexpress.net" without https://
    if (cleanedUrls.length === 0) {
      const domainMatch = prompt.match(
        /\b([a-z0-9][-a-z0-9]*\.(?:net|com|vn|org|io|in|dev)(?:\/[^\s"'<>`,;)]*)?)/i
      );
      if (domainMatch) {
        cleanedUrls.push(`https://${domainMatch[1].replace(/[.,;:!?)]+$/, '')}`);
      }
    }

    const primaryUrl = cleanedUrls[0] || defaultBaseUrl || '';
    const needsScroll = /cuộn|kéo xuống|scroll|footer|cuối màn hình|cuối trang|cuối cùng|đáy trang/i.test(
      prompt
    );

    const { clauses, keywords: keywordList } = this.parsePromptIntoClauses(prompt, primaryUrl);
    const traces: ExplorationScreenTrace[] = [];
    const synthesizedSteps: TestStep[] = [];
    const synthesizedAssertions: TestAssertion[] = [];
    let stepCounter = 1;

    if (!primaryUrl) {
      return {
        primaryUrl: '',
        needsScroll,
        extractedKeywords: keywordList,
        traces: [],
        combinedSummary: '',
        synthesizedSteps: [],
        synthesizedAssertions: [],
      };
    }

    const { page, cdpSession } = await this.getPersistentPage();
    let currentScreenTrace: ExplorationScreenTrace | null = null;
    let lastNavigationKeyword = '';

    for (let cIdx = 0; cIdx < clauses.length; cIdx++) {
      const clause = clauses[cIdx];

      if (clause.type === 'open') {
        const targetUrl = clause.target || primaryUrl;
        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch {
          await page.goto(targetUrl, { timeout: 15000 }).catch(() => {});
        }
        await page.waitForTimeout(700).catch(() => {});

        // Check if the very next clause is a scroll on Screen 1 so we can inspect Screen 1 after scrolling
        const nextClause = clauses[cIdx + 1];
        const scrollImmediately = nextClause?.type === 'scroll' && nextClause.target === 'bottom';

        currentScreenTrace = await this.inspectCurrentScreen(
          page,
          cdpSession,
          traces.length + 1,
          scrollImmediately
            ? `Mở trang ${targetUrl} và cuộn xuống cuối trang`
            : `Mở trang ${targetUrl}`,
          keywordList,
          scrollImmediately
        );
        traces.push(currentScreenTrace);

        let urlHostOrPath = '';
        try {
          const parsedUrl = new URL(targetUrl);
          urlHostOrPath =
            parsedUrl.pathname && parsedUrl.pathname !== '/'
              ? parsedUrl.pathname
              : parsedUrl.hostname;
        } catch {
          urlHostOrPath = '';
        }

        synthesizedSteps.push({
          id: `step-${stepCounter++}`,
          action: 'open',
          target: targetUrl,
          ...(urlHostOrPath ? { expected: urlHostOrPath } : {}),
          description: `Mở trang ${targetUrl}`,
          optional: false,
        });

        if (scrollImmediately) {
          const hasFooter = currentScreenTrace.matchedTexts.some((mt) =>
            mt.selector.includes('footer')
          );
          synthesizedSteps.push({
            id: `step-${stepCounter++}`,
            action: 'scroll',
            target: 'bottom',
            ...(hasFooter ? { expected: 'footer' } : {}),
            description: 'Cuộn xuống cuối màn hình',
            optional: false,
          });
          cIdx++; // Skip nextClause since we just executed it
        }
        continue;
      }

      if (clause.type === 'scroll') {
        const isBottom = clause.target !== 'top';
        if (isBottom) {
          await page
            .evaluate(async () => {
              const h = document.body.scrollHeight || document.documentElement.scrollHeight;
              window.scrollTo({ top: Math.floor(h / 2), behavior: 'instant' as ScrollBehavior });
              await new Promise((r) => setTimeout(r, 250));
              const finalH = document.body.scrollHeight || document.documentElement.scrollHeight;
              window.scrollTo({ top: finalH, behavior: 'instant' as ScrollBehavior });
            })
            .catch(() => {});
          await page.waitForTimeout(500).catch(() => {});
        } else {
          await page
            .evaluate(() => {
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
            })
            .catch(() => {});
          await page.waitForTimeout(300).catch(() => {});
        }

        // Re-inspect current screen after scrolling so footer elements/links are captured
        if (currentScreenTrace) {
          const refreshed = await this.inspectCurrentScreen(
            page,
            cdpSession,
            currentScreenTrace.screenIndex,
            `${currentScreenTrace.actionExecuted} -> Cuộn xuống cuối trang`,
            keywordList,
            false
          );
          traces[traces.length - 1] = refreshed;
          currentScreenTrace = refreshed;
        }

        const hasFooter = currentScreenTrace?.matchedTexts.some((mt) =>
          mt.selector.includes('footer')
        );
        synthesizedSteps.push({
          id: `step-${stepCounter++}`,
          action: 'scroll',
          target: isBottom ? 'bottom' : 'top',
          ...(isBottom && hasFooter ? { expected: 'footer' } : {}),
          description: isBottom ? 'Cuộn xuống cuối màn hình' : 'Cuộn lên đầu trang',
          optional: false,
        });
        continue;
      }

      if (clause.type === 'assert' && clause.expected) {
        const expectedText = clause.expected.trim();
        const matched = currentScreenTrace?.matchedTexts.find((mt) =>
          mt.text.toLowerCase().includes(expectedText.toLowerCase())
        );
        const resolvedSelector =
          matched?.selector ||
          (clause.containerHint === 'footer'
            ? 'footer'
            : clause.containerHint === 'header'
            ? 'header'
            : 'body');

        synthesizedSteps.push({
          id: `step-${stepCounter++}`,
          action: 'assert',
          target: resolvedSelector,
          expected: expectedText,
          description: `Kiểm tra '${expectedText}' hiển thị tại ${resolvedSelector}`,
          optional: false,
        });
        continue;
      }

      if (clause.type === 'click' && clause.target) {
        const rawTarget = clause.target.trim();
        lastNavigationKeyword = rawTarget;
        const targetLower = rawTarget.toLowerCase();

        let matchingEl = currentScreenTrace?.elements.find(
          (el) =>
            el.suggestedAction === 'click' &&
            (el.label.toLowerCase().includes(targetLower) ||
              el.selector.toLowerCase().includes(targetLower))
        );

        if (!matchingEl) {
          const candidates = [
            `a:has-text("${rawTarget}")`,
            `button:has-text("${rawTarget}")`,
            `[role="button"]:has-text("${rawTarget}")`,
          ];
          for (const cand of candidates) {
            const count = await page.locator(cand).count().catch(() => 0);
            if (count > 0) {
              matchingEl = {
                selector: cand,
                tag: cand.startsWith('a') ? 'a' : 'button',
                role: cand.startsWith('a') ? 'link' : 'button',
                label: rawTarget,
                suggestedAction: 'click',
              };
              break;
            }
          }
        }

        const clickSelector = matchingEl?.selector || `a:has-text("${rawTarget}")`;
        let nextExpected = '';

        try {
          const loc = page.locator(clickSelector).first();
          await loc.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
          // Ensure link opens in same tab so CDP session tracks the new screen
          await loc
            .evaluate((el) => {
              if (el.tagName.toLowerCase() === 'a' && el.getAttribute('target') === '_blank') {
                el.removeAttribute('target');
              }
            })
            .catch(() => {});
          await loc.click({ timeout: 5000 });
          await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(700).catch(() => {});

          const nextScreen = await this.inspectCurrentScreen(
            page,
            cdpSession,
            traces.length + 1,
            `Bấm chọn '${rawTarget}' (${clickSelector}) để chuyển màn hình`,
            keywordList,
            false
          );
          traces.push(nextScreen);
          currentScreenTrace = nextScreen;

          try {
            const nextU = new URL(nextScreen.url);
            nextExpected = nextU.pathname !== '/' ? nextU.pathname : nextU.hostname;
          } catch {
            nextExpected = '';
          }
        } catch {
          // Even if live click timed out, still emit the step for the test spec
        }

        synthesizedSteps.push({
          id: `step-${stepCounter++}`,
          action: 'click',
          target: clickSelector,
          ...(nextExpected ? { expected: nextExpected } : {}),
          description: `Bấm vào '${rawTarget}'`,
          optional: false,
        });
        continue;
      }

      if (clause.type === 'assert_page_loaded') {
        let verifyTarget = 'body';
        let verifyExpected = lastNavigationKeyword || '';

        if (currentScreenTrace) {
          // Check if current screen has a heading or title matching the screen
          const cleanTitle = (currentScreenTrace.title || '')
            .split(/[-|–]/)[0]
            .trim();
          if (cleanTitle && cleanTitle.length >= 3) {
            verifyExpected = cleanTitle;
          } else if (!verifyExpected && currentScreenTrace.url) {
            try {
              const u = new URL(currentScreenTrace.url);
              verifyExpected = u.pathname !== '/' ? u.pathname : u.hostname;
            } catch {
              verifyExpected = '';
            }
          }
        }

        if (verifyExpected) {
          synthesizedSteps.push({
            id: `step-${stepCounter++}`,
            action: 'assert',
            target: verifyTarget,
            expected: verifyExpected,
            description: `Đảm bảo nội dung trang '${verifyExpected}' được tải thành công`,
            optional: false,
          });
        }

        if (clause.checkNoErrors) {
          const hasNoConsoleErr = synthesizedAssertions.some(
            (a) => a.type === 'no_console_errors'
          );
          if (!hasNoConsoleErr) {
            synthesizedAssertions.push({
              type: 'no_console_errors',
              severity: 'warning',
            });
          }
        }
        continue;
      }

      if (clause.type === 'input_form' && currentScreenTrace) {
        const inputEls = currentScreenTrace.elements
          .filter((e) => e.suggestedAction === 'input')
          .slice(0, 5);
        for (const el of inputEls) {
          synthesizedSteps.push({
            id: `step-${stepCounter++}`,
            action: 'input',
            target: el.selector,
            value: el.selector.toLowerCase().includes('email')
              ? '${fixture.users.standard.email}'
              : el.selector.toLowerCase().includes('pass')
              ? '${secret.STANDARD_PASSWORD}'
              : '${fixture.users.standard.firstName}',
            description: `Nhập dữ liệu cho ${el.label}`,
            optional: false,
            ...(el.selector.toLowerCase().includes('pass') ? { sensitive: true } : {}),
          });
        }
      }
    }

    // Ensure at least one post-run assertion exists
    if (synthesizedAssertions.length === 0) {
      const lastTrace = traces[traces.length - 1];
      if (lastTrace?.url) {
        try {
          const u = new URL(lastTrace.url);
          synthesizedAssertions.push({
            type: 'url_contains',
            target: u.pathname !== '/' ? u.pathname : u.hostname,
            severity: 'error',
          });
        } catch {
          // ignore
        }
      }
    }

    return {
      primaryUrl,
      needsScroll,
      extractedKeywords: keywordList,
      traces,
      combinedSummary: traces.map((t) => t.a11ySummary).join('\n\n'),
      synthesizedSteps,
      synthesizedAssertions,
    };
  }

  public async executeSpec(
    projectId: string,
    envName: string,
    spec: TestSpec,
    emit: RunnerEventCallback,
    options?: { stepId?: string; headless?: boolean }
  ): Promise<TestRunSummary> {
    this.abortRequested = false;
    const runId = artifactManager.generateRunId();
    const startedAt = new Date().toISOString();
    const runStartMs = Date.now();

    const safety = environmentManager.evaluateProdSafety(projectId, envName, spec);
    if (!safety.allowed) {
      const blockedSummary: TestRunSummary = {
        runId,
        testId: spec.id,
        projectId,
        environment: envName,
        status: 'BLOCKED',
        startedAt,
        durationMs: 0,
        failedStepIndex: null,
        steps: [],
        evidence: null,
        aiDiagnosis: {
          rootCause: safety.reason || 'Bị chặn thực thi trên môi trường Production.',
          recommendation: 'Chuyển sang môi trường Local hoặc Staging để chạy kịch bản này.',
        },
      };
      artifactManager.writeSummary(runId, blockedSummary);
      emit('blocked', { status: 'BLOCKED', reason: safety.reason, summary: blockedSummary });
      return blockedSummary;
    }

    if (typeof options?.headless === 'boolean') {
      await this.ensureCdpBrowser(options.headless);
    }

    const stepsToRun: TestStep[] = options?.stepId
      ? spec.steps.filter((s) => s.id === options.stepId)
      : spec.steps;

    const sensitiveValues: string[] = [];
    for (const s of spec.steps) {
      if (s.sensitive && s.value) {
        sensitiveValues.push(environmentManager.interpolate(s.value, projectId, envName));
      }
    }

    const stepResults: StepRunResult[] = stepsToRun.map((s) => ({
      stepId: s.id,
      action: s.action,
      description: environmentManager.redact(s.description, projectId, sensitiveValues),
      status: 'PENDING',
      durationMs: 0,
    }));

    const consoleErrors: string[] = [];
    const networkFailures: Array<{ url: string; method?: string; status: number }> = [];

    const { page, cdpSession } = await this.getPersistentPage();

    const onConsole = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          /Not signed in with the identity provider|ERR_BLOCKED_BY_CLIENT|favicon\.ico|third-party cookie|Attestation check/i.test(
            text
          )
        ) {
          return;
        }
        const redacted = environmentManager.redact(text, projectId, sensitiveValues);
        if (!consoleErrors.includes(redacted)) {
          consoleErrors.push(redacted);
        }
      }
    };

    const onPageError = (err: Error) => {
      const redacted = environmentManager.redact(err.message, projectId, sensitiveValues);
      if (!consoleErrors.includes(redacted)) {
        consoleErrors.push(redacted);
      }
    };

    const onResponse = (res: { url: () => string; status: () => number; request: () => { method: () => string } }) => {
      const status = res.status();
      if (status >= 400) {
        const url = res.url();
        // Ignore third-party ad network noise on demo sites if unrelated, but capture app/API errors
        if (networkFailures.length < 15) {
          networkFailures.push({
            url: environmentManager.redact(url, projectId, sensitiveValues),
            method: res.request().method(),
            status,
          });
        }
      }
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    let failedStepIndex: number | null = null;
    let failedStepObj: TestStep | null = null;
    let failureErrorMsg = '';

    try {
      for (let i = 0; i < stepsToRun.length; i++) {
        if (this.abortRequested) {
          throw new Error('Người dùng đã dừng thực thi kịch bản.');
        }

        const step = stepsToRun[i];
        const stepStart = Date.now();
        stepResults[i].status = 'RUNNING';
        emit('step', {
          stepId: step.id,
          index: i + 1,
          status: 'RUNNING',
          description: stepResults[i].description,
        });

        const resolvedTarget = environmentManager.interpolate(step.target, projectId, envName);
        const resolvedValue = environmentManager.interpolate(step.value, projectId, envName);
        const resolvedExpected = environmentManager.interpolate(step.expected, projectId, envName);
        const timeoutMs = step.timeout_ms ?? (step.optional ? 2000 : 8000);

        try {
          await this.runSingleCdpStep(
            page,
            step,
            resolvedTarget,
            resolvedValue,
            resolvedExpected,
            timeoutMs
          );
          const durationMs = Date.now() - stepStart;
          stepResults[i].status = 'PASSED';
          stepResults[i].durationMs = durationMs;
          emit('step', {
            stepId: step.id,
            index: i + 1,
            status: 'PASSED',
            durationMs,
            description: stepResults[i].description,
          });
        } catch (stepErr) {
          const durationMs = Date.now() - stepStart;
          const rawErrMsg = stepErr instanceof Error ? stepErr.message : String(stepErr);
          const cleanErrMsg = environmentManager.redact(
            rawErrMsg.split('\n')[0],
            projectId,
            sensitiveValues
          );

          if (step.optional) {
            stepResults[i].status = 'SKIPPED';
            stepResults[i].durationMs = durationMs;
            stepResults[i].error = `Bước tùy chọn bỏ qua: ${cleanErrMsg}`;
            emit('step', {
              stepId: step.id,
              index: i + 1,
              status: 'SKIPPED',
              durationMs,
              error: stepResults[i].error,
            });
            continue;
          }

          stepResults[i].status = 'FAILED';
          stepResults[i].durationMs = durationMs;
          stepResults[i].error = cleanErrMsg;
          failedStepIndex = i + 1;
          failedStepObj = step;
          failureErrorMsg = cleanErrMsg;

          emit('step', {
            stepId: step.id,
            index: i + 1,
            status: 'FAILED',
            durationMs,
            error: cleanErrMsg,
          });
          break;
        }
      }

      // Run post-step assertions if all steps passed and running full spec
      if (!failedStepObj && !options?.stepId && spec.assertions && spec.assertions.length > 0) {
        for (const assertion of spec.assertions) {
          const resolvedTarget = environmentManager.interpolate(
            assertion.target || '',
            projectId,
            envName
          );

          if (assertion.type === 'element_visible' && resolvedTarget) {
            const loc = page.locator(resolvedTarget).first();
            await loc.waitFor({ state: 'visible', timeout: 4000 });
          } else if (assertion.type === 'text_visible' && resolvedTarget) {
            const loc = page.locator(`text=${resolvedTarget}`).first();
            await loc.waitFor({ state: 'visible', timeout: 4000 });
          } else if (assertion.type === 'url_contains' && resolvedTarget) {
            const curUrl = page.url();
            if (!curUrl.includes(resolvedTarget)) {
              throw new Error(`URL hiện tại '${curUrl}' không chứa chuỗi kỳ vọng '${resolvedTarget}'.`);
            }
          } else if (assertion.type === 'no_console_errors' && assertion.severity === 'error') {
            if (consoleErrors.length > 0) {
              throw new Error(`Phát hiện lỗi Console: ${consoleErrors[0]}`);
            }
          }
        }
      }
    } catch (assertionErr) {
      if (!failedStepObj) {
        const msg =
          assertionErr instanceof Error ? assertionErr.message : String(assertionErr);
        failureErrorMsg = environmentManager.redact(msg.split('\n')[0], projectId, sensitiveValues);
        failedStepIndex = stepsToRun.length;
        failedStepObj = stepsToRun[stepsToRun.length - 1];
      }
    } finally {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('response', onResponse);
    }

    const totalDurationMs = Date.now() - runStartMs;

    if (!failedStepObj || failedStepIndex === null) {
      const passedSummary: TestRunSummary = {
        runId,
        testId: spec.id,
        projectId,
        environment: envName,
        status: 'PASSED',
        startedAt,
        durationMs: totalDurationMs,
        failedStepIndex: null,
        steps: stepResults,
        evidence: null,
        aiDiagnosis: null,
      };
      artifactManager.writeSummary(runId, passedSummary);
      emit('complete', { runId, summary: passedSummary });
      return passedSummary;
    }

    // Failure Evidence & CDP Triage
    emit('triage', {
      message: 'Đang thu thập bằng chứng CDP và phân tích nguyên nhân lỗi...',
    });

    const runDir = artifactManager.ensureRunDir(runId);
    const rawScreenshotName = `step-${failedStepIndex}-raw.png`;
    const annotatedScreenshotName = `step-${failedStepIndex}-annotated.png`;
    const rawScreenshotPath = path.join(runDir, rawScreenshotName);
    const annotatedScreenshotPath = path.join(runDir, annotatedScreenshotName);

    // Capture screenshot via CDP
    const shotData = await cdpSession.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(rawScreenshotPath, Buffer.from(shotData.data, 'base64'));

    // Extract Semantic Accessibility Tree via CDP
    const a11ySnapshot = await this.extractCompactA11yTree(cdpSession);
    artifactManager.writeA11yTree(runId, a11ySnapshot);

    // Resolve Bounding Box via CDP or Smart Container Fallback
    const boundingBox = await this.resolveFailureBoundingBox(
      page,
      failedStepObj.target,
      projectId,
      envName
    );
    const shortErrorLabel = `Không tìm thấy hoặc lỗi tại: ${failedStepObj.target}`;

    await imageAnnotator.annotateError(
      rawScreenshotPath,
      annotatedScreenshotPath,
      boundingBox,
      shortErrorLabel
    );

    const aiDiagnosis = await this.runLocalAiTriage(
      spec,
      failedStepObj,
      failureErrorMsg,
      a11ySnapshot,
      consoleErrors,
      networkFailures
    );

    const failedSummary: TestRunSummary = {
      runId,
      testId: spec.id,
      projectId,
      environment: envName,
      status: 'FAILED',
      startedAt,
      durationMs: Date.now() - runStartMs,
      failedStepIndex,
      steps: stepResults,
      evidence: {
        rawScreenshot: rawScreenshotName,
        annotatedScreenshot: annotatedScreenshotName,
        boundingBox,
        errorLabel: shortErrorLabel,
        consoleErrors,
        networkFailures,
      },
      aiDiagnosis,
    };

    artifactManager.writeSummary(runId, failedSummary);
    emit('complete', { runId, summary: failedSummary });
    return failedSummary;
  }

  private async runSingleCdpStep(
    page: Page,
    step: TestStep,
    resolvedTarget: string,
    resolvedValue: string,
    resolvedExpected: string,
    timeoutMs: number
  ): Promise<void> {
    if (step.action === 'open') {
      await page.goto(resolvedTarget, {
        waitUntil: 'domcontentloaded',
        timeout: Math.max(timeoutMs, 15000),
      });
      if (resolvedExpected) {
        await this.verifyExpectation(page, resolvedExpected, timeoutMs);
      }
      return;
    }

    if (step.action === 'scroll') {
      const targetLower = (resolvedTarget || 'bottom').trim().toLowerCase();
      if (targetLower === 'bottom' || targetLower === 'end' || targetLower === 'cuối') {
        await page.evaluate(async () => {
          const h = document.body.scrollHeight || document.documentElement.scrollHeight;
          window.scrollTo({ top: Math.floor(h / 2), behavior: 'instant' as ScrollBehavior });
          await new Promise((r) => setTimeout(r, 250));
          const finalH = document.body.scrollHeight || document.documentElement.scrollHeight;
          window.scrollTo({ top: finalH, behavior: 'instant' as ScrollBehavior });
        });
        await page.waitForTimeout(500).catch(() => {});
      } else if (targetLower === 'top' || targetLower === 'start' || targetLower === 'đầu') {
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        });
        await page.waitForTimeout(300).catch(() => {});
      } else {
        if (targetLower.includes('footer')) {
          await page
            .evaluate(() => {
              const h = document.body.scrollHeight || document.documentElement.scrollHeight;
              window.scrollTo({ top: h, behavior: 'instant' as ScrollBehavior });
            })
            .catch(() => {});
          await page.waitForTimeout(400).catch(() => {});
        }
        const scrollLoc = page.locator(resolvedTarget).first();
        await scrollLoc.waitFor({ state: 'attached', timeout: timeoutMs });
        await scrollLoc.scrollIntoViewIfNeeded({ timeout: timeoutMs }).catch(() => {});
      }

      if (resolvedExpected) {
        await this.verifyExpectation(page, resolvedExpected, timeoutMs);
      }
      return;
    }

    if (step.action === 'wait') {
      const rawWait = (resolvedTarget || resolvedValue || '1000').trim();
      if (/^\d+$/.test(rawWait)) {
        const ms = Math.min(Math.max(Number(rawWait), 100), 15000);
        await page.waitForTimeout(ms);
      } else if (rawWait) {
        await this.verifyExpectation(page, rawWait, timeoutMs);
      }
      if (resolvedExpected) {
        await this.verifyExpectation(page, resolvedExpected, timeoutMs);
      }
      return;
    }

    if (
      step.action === 'assert' &&
      (!resolvedTarget || ['page', 'document'].includes(resolvedTarget.trim().toLowerCase()))
    ) {
      const expectation = resolvedExpected || resolvedValue;
      if (expectation) {
        await this.verifyExpectation(page, expectation, timeoutMs);
      }
      return;
    }

    const locator = page.locator(resolvedTarget).first();
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
    if (resolvedTarget.trim().toLowerCase() !== 'body') {
      await locator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    }

    const box = await locator.boundingBox().catch(() => null);
    if (box) {
      this.lastInteractedBox = box;
    }

    if (step.action === 'input') {
      await locator.fill(resolvedValue, { timeout: timeoutMs });
    } else if (step.action === 'click') {
      await locator
        .evaluate((el) => {
          if (el.tagName.toLowerCase() === 'a' && el.getAttribute('target') === '_blank') {
            el.removeAttribute('target');
          }
        })
        .catch(() => {});
      await locator.click({ timeout: timeoutMs });
      await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
    } else if (step.action === 'assert') {
      const expectation = resolvedExpected || resolvedValue;
      if (expectation) {
        const rawText =
          (await locator.innerText().catch(() => '')) ||
          (await locator.textContent().catch(() => '')) ||
          '';
        const pageTitle = (await page.title().catch(() => '')) || '';
        const pageUrl = page.url();
        const normText = `${rawText} ${pageTitle} ${pageUrl}`.replace(/\s+/g, ' ').trim();
        const val = await locator.inputValue().catch(() => '');
        const normExpect = expectation.replace(/\s+/g, ' ').trim();

        const normalizeSeparators = (s: string) =>
          s.toLowerCase().replace(/[.\-–—\s]+/g, ' ').trim();

        const normTextSep = normalizeSeparators(normText);
        const normValSep = normalizeSeparators(val);

        const matchesPart = (part: string) => {
          const pLower = part.toLowerCase().trim();
          const pSep = normalizeSeparators(part);
          return (
            normText.toLowerCase().includes(pLower) ||
            val.toLowerCase().includes(pLower) ||
            (pSep.length >= 2 && (normTextSep.includes(pSep) || normValSep.includes(pSep)))
          );
        };

        let matched = matchesPart(normExpect);
        if (!matched && normExpect.includes(':')) {
          const subParts = normExpect
            .split(':')
            .map((p) => p.trim())
            .filter(Boolean);
          const valuePart = subParts.slice(1).join(':').trim();
          // Match if all parts match OR if the primary value after ':' matches (e.g., when UI uses an icon instead of 'Email:' label)
          matched =
            subParts.every((p) => matchesPart(p)) ||
            (valuePart.length >= 3 && matchesPart(valuePart));
        }

        if (!matched) {
          throw new Error(
            `Phần tử '${resolvedTarget}' không chứa nội dung kỳ vọng: '${expectation}'. Nhận được: '${rawText.replace(/\s+/g, ' ').trim().slice(0, 140) || val}'`
          );
        }
      } else {
        const visible = await locator.isVisible();
        if (!visible) {
          throw new Error(`Phần tử kiểm chứng '${resolvedTarget}' không hiển thị.`);
        }
      }
      return;
    }

    if (resolvedExpected) {
      await this.verifyExpectation(page, resolvedExpected, timeoutMs);
    }
  }

  private async verifyExpectation(page: Page, expected: string, timeoutMs: number): Promise<void> {
    const trimmed = expected.trim();
    if (!trimmed) return;
    const waitTimeout = Math.min(timeoutMs, 4000);

    // 1. Selector pattern (id, class, attribute, xpath, or explicit text=)
    if (/^[#.\[]|^\/\/|^text=/.test(trimmed)) {
      try {
        await page.locator(trimmed).first().waitFor({ state: 'visible', timeout: waitTimeout });
        return;
      } catch {
        throw new Error(`Không tìm thấy phần tử kỳ vọng '${trimmed}' sau khi thực hiện thao tác.`);
      }
    }

    // 2. URL pattern (starts with http, slash, or contains .html or query parameter)
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.includes('.html') ||
      trimmed.includes('?')
    ) {
      const currentUrl = page.url();
      if (currentUrl.includes(trimmed)) {
        return;
      }
      throw new Error(`URL hiện tại '${currentUrl}' không chứa địa chỉ kỳ vọng '${trimmed}'.`);
    }

    // 3. Current URL or visible text
    const currentUrl = page.url();
    if (currentUrl.includes(trimmed)) {
      return;
    }

    try {
      await page
        .locator(`text=${trimmed}`)
        .first()
        .waitFor({ state: 'visible', timeout: waitTimeout });
      return;
    } catch {
      // 4. Generic selector fallback (e.g. tag name like 'form', 'h1')
      try {
        await page.locator(trimmed).first().waitFor({ state: 'visible', timeout: 500 });
        return;
      } catch {
        throw new Error(`Không tìm thấy phần tử hoặc nội dung kỳ vọng '${trimmed}' trên trang.`);
      }
    }
  }

  private async resolveFailureBoundingBox(
    page: Page,
    rawSelector: string,
    projectId: string,
    envName: string
  ): Promise<BoundingBox> {
    const resolvedSelector = environmentManager.interpolate(rawSelector, projectId, envName);
    try {
      const targetBox = await page.locator(resolvedSelector).first().boundingBox({ timeout: 500 });
      if (targetBox && targetBox.width > 0 && targetBox.height > 0) {
        return targetBox;
      }
    } catch {
      // Target is missing; proceed to fallback
    }

    // Fallback 1: Locate visible submit button or primary form container on the current page
    const fallbackCandidates = [
      'form button[type="submit"]',
      '#submit',
      'form',
      '.text-field-container',
      'main',
    ];
    for (const candidate of fallbackCandidates) {
      try {
        const box = await page.locator(candidate).first().boundingBox({ timeout: 400 });
        if (box && box.width > 10 && box.height > 10) {
          return {
            x: Math.max(12, box.x - 6),
            y: Math.max(40, box.y - 6),
            width: Math.min(box.width + 12, 900),
            height: Math.min(box.height + 12, 420),
          };
        }
      } catch {
        // continue
      }
    }

    // Fallback 2: Region near last interacted element
    if (this.lastInteractedBox) {
      return {
        x: this.lastInteractedBox.x,
        y: Math.min(700, this.lastInteractedBox.y + this.lastInteractedBox.height + 16),
        width: Math.max(180, this.lastInteractedBox.width),
        height: 52,
      };
    }

    return { x: 320, y: 240, width: 380, height: 90 };
  }

  private async extractCompactA11yTree(
    cdpSession: CDPSession
  ): Promise<Array<{ role: string; name: string; domId?: string }>> {
    try {
      const res = (await cdpSession.send('Accessibility.getFullAXTree')) as {
        nodes?: Array<{
          role?: { value?: string };
          name?: { value?: string };
          properties?: Array<{ name: string; value?: { value?: string } }>;
        }>;
      };
      const nodes = res.nodes || [];
      const interactiveRoles = new Set([
        'button',
        'textbox',
        'link',
        'checkbox',
        'combobox',
        'heading',
        'searchbox',
      ]);
      const simplified: Array<{ role: string; name: string; domId?: string }> = [];

      for (const n of nodes) {
        const role = n.role?.value || '';
        const name = (n.name?.value || '').trim();
        if (!interactiveRoles.has(role) && !name) continue;
        if (simplified.length >= 60) break;
        simplified.push({ role, name });
      }
      return simplified;
    } catch {
      return [];
    }
  }

  public async runLocalAiTriage(
    spec: TestSpec,
    failedStep: TestStep,
    errorMessage: string,
    a11yNodes: Array<{ role: string; name: string }>,
    consoleErrors: string[],
    networkFailures: Array<{ url: string; method?: string; status: number }>
  ): Promise<AiDiagnosis> {
    const promptPath = path.join(config.promptsRoot, 'triage.md');
    const systemInstructions = fs.existsSync(promptPath)
      ? fs.readFileSync(promptPath, 'utf-8')
      : '';

    const contextPayload = {
      testId: spec.id,
      testTitle: spec.title,
      failedStep: {
        id: failedStep.id,
        action: failedStep.action,
        target: failedStep.target,
        description: failedStep.description,
      },
      errorMessage,
      accessibilityTreeInteractiveNodes: a11yNodes,
      consoleErrors: consoleErrors.slice(0, 8),
      networkFailures: networkFailures.slice(0, 8),
    };

    const fullPrompt = `${systemInstructions}\n\nDữ liệu lỗi từ CDP:\n${JSON.stringify(
      contextPayload,
      null,
      2
    )}`;

    const cliOutput = await this.invokeLocalAiCli(fullPrompt, 12000);
    if (cliOutput) {
      const parsed = this.extractJsonObject<AiDiagnosis>(cliOutput);
      if (parsed && parsed.rootCause && parsed.recommendation) {
        return {
          rootCause: parsed.rootCause,
          recommendation: parsed.recommendation,
          ...(parsed.suggestedSelector ? { suggestedSelector: parsed.suggestedSelector } : {}),
        };
      }
    }

    // Deterministic CDP Accessibility Tree analysis fallback when AI CLI times out or is unavailable
    const buttonsInA11y = a11yNodes.filter((n) => n.role === 'button' && n.name);
    let suggestedSelector: string | undefined;

    if (
      failedStep.action === 'click' &&
      buttonsInA11y.some((b) => b.name.toLowerCase().includes('submit'))
    ) {
      suggestedSelector = '#submit';
    } else if (buttonsInA11y.length > 0) {
      suggestedSelector = `button:has-text("${buttonsInA11y[0].name}")`;
    }

    const netErrorNote =
      networkFailures.length > 0
        ? ` Ngoài ra phát hiện yêu cầu mạng lỗi (${networkFailures[0].status} tại ${networkFailures[0].url}).`
        : '';

    return {
      rootCause: `Không tìm thấy phần tử với bộ chọn '${failedStep.target}' ở bước '${failedStep.description}' (${errorMessage}).${netErrorNote}`,
      recommendation: suggestedSelector
        ? `Trong cây ngữ nghĩa Accessibility Tree hiện tại có nút tương ứng với bộ chọn '${suggestedSelector}'. Hãy cập nhật lại bộ chọn của bước này.`
        : `Kiểm tra lại bộ chọn '${failedStep.target}' trên trang hoặc tăng thời gian chờ (timeout_ms).`,
      ...(suggestedSelector ? { suggestedSelector } : {}),
    };
  }

  private resolveAgentBinary(commandName: string, extraCandidates: string[] = []): string | null {
    const home = os.homedir();
    const searchDirs = [
      ...extraCandidates,
      path.join(home, '.local', 'bin'),
      path.join(home, '.opencode', 'bin'),
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      ...(process.env.PATH ? process.env.PATH.split(path.delimiter) : []),
    ];

    for (const dirOrFile of searchDirs) {
      if (!dirOrFile) continue;
      const fullPath = dirOrFile.endsWith(`/${commandName}`)
        ? dirOrFile
        : path.join(dirOrFile, commandName);
      try {
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            fs.accessSync(fullPath, fs.constants.X_OK);
            return fullPath;
          }
        }
      } catch {
        // continue scanning
      }
    }
    return null;
  }

  private detectAgentVersion(agentId: string, binaryPath: string | null): string | null {
    if (!binaryPath) return null;
    if (this.cachedAgentVersions.has(agentId)) {
      return this.cachedAgentVersions.get(agentId) ?? null;
    }

    if (agentId === 'agy') {
      this.cachedAgentVersions.set(agentId, '2.0');
      return '2.0';
    }

    try {
      const out = execFileSync(binaryPath, ['--version'], {
        timeout: 1800,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      const verMatch = out.match(/(\d+\.\d+(?:\.\d+)?)/);
      const ver = verMatch ? verMatch[1] : out.split('\n')[0].slice(0, 24) || null;
      this.cachedAgentVersions.set(agentId, ver);
      return ver;
    } catch {
      this.cachedAgentVersions.set(agentId, null);
      return null;
    }
  }

  private detectAgentModel(agentId: string, defaultModel: string): string {
    const home = os.homedir();
    try {
      if (agentId === 'agy') {
        const agySettings = path.join(home, '.gemini', 'antigravity-cli', 'settings.json');
        if (fs.existsSync(agySettings)) {
          const parsed = JSON.parse(fs.readFileSync(agySettings, 'utf-8'));
          if (parsed.model && typeof parsed.model === 'string') {
            return parsed.model;
          }
        }
        return process.env.AGY_MODEL || defaultModel;
      }

      if (agentId === 'claude') {
        const claudeSettings = path.join(home, '.claude', 'settings.json');
        if (fs.existsSync(claudeSettings)) {
          const parsed = JSON.parse(fs.readFileSync(claudeSettings, 'utf-8'));
          const envModel =
            parsed.model ||
            parsed.env?.ANTHROPIC_MODEL ||
            parsed.env?.ANTHROPIC_DEFAULT_SONNET_MODEL;
          if (envModel && typeof envModel === 'string') return envModel;
        }
        return process.env.ANTHROPIC_MODEL || defaultModel;
      }

      if (agentId === 'gemini') {
        const geminiSettings = path.join(home, '.gemini', 'settings.json');
        if (fs.existsSync(geminiSettings)) {
          const parsed = JSON.parse(fs.readFileSync(geminiSettings, 'utf-8'));
          const modelVal =
            typeof parsed.model === 'string'
              ? parsed.model
              : parsed.model?.name || parsed.env?.GEMINI_MODEL;
          if (modelVal && typeof modelVal === 'string') return modelVal;
        }
        return process.env.GEMINI_MODEL || defaultModel;
      }

      if (agentId === 'opencode') {
        const stateModelPath = path.join(home, '.local', 'state', 'opencode', 'model.json');
        if (fs.existsSync(stateModelPath)) {
          const parsed = JSON.parse(fs.readFileSync(stateModelPath, 'utf-8'));
          const recent = Array.isArray(parsed.recent) ? parsed.recent[0] : null;
          if (recent?.modelID && typeof recent.modelID === 'string') {
            return recent.modelID;
          }
        }
        return defaultModel;
      }

      if (agentId === 'qwen') {
        const qwenSettings = path.join(home, '.qwen', 'settings.json');
        if (fs.existsSync(qwenSettings)) {
          const parsed = JSON.parse(fs.readFileSync(qwenSettings, 'utf-8'));
          const modelVal = typeof parsed.model === 'string' ? parsed.model : parsed.model?.name;
          if (modelVal && typeof modelVal === 'string') return modelVal;
        }
        return defaultModel;
      }

      if (agentId === 'codex') {
        const codexCfg = path.join(home, '.codex', 'config.json');
        if (fs.existsSync(codexCfg)) {
          const parsed = JSON.parse(fs.readFileSync(codexCfg, 'utf-8'));
          if (parsed.model && typeof parsed.model === 'string') return parsed.model;
        }
        return process.env.OPENAI_MODEL || defaultModel;
      }
    } catch {
      // ignore config parse errors and return defaultModel
    }
    return defaultModel;
  }

  public getAiAgents(): { activeAgentId: string; agents: AiAgentInfo[] } {
    const catalog: Array<{
      id: string;
      name: string;
      command: string;
      defaultModel: string;
    }> = [
      {
        id: 'agy',
        name: 'Antigravity CLI',
        command: 'agy',
        defaultModel: 'Gemini 3.8 Flash (High)',
      },
      {
        id: 'claude',
        name: 'Claude Code',
        command: 'claude',
        defaultModel: 'claude-sonnet-4-6',
      },
      {
        id: 'gemini',
        name: 'Gemini CLI',
        command: 'gemini',
        defaultModel: 'gemini-2.5-pro',
      },
      {
        id: 'opencode',
        name: 'OpenCode',
        command: 'opencode',
        defaultModel: 'nemotron-3-ultra-free',
      },
      {
        id: 'qwen',
        name: 'Qwen Code',
        command: 'qwen',
        defaultModel: 'qwen3-coder-plus',
      },
      {
        id: 'codex',
        name: 'OpenAI Codex',
        command: 'codex',
        defaultModel: 'gpt-5-codex',
      },
      {
        id: 'aider',
        name: 'Aider',
        command: 'aider',
        defaultModel: 'claude-3-7-sonnet',
      },
      {
        id: 'ollama',
        name: 'Ollama Local',
        command: 'ollama',
        defaultModel: 'qwen2.5-coder:7b',
      },
      {
        id: 'goose',
        name: 'Block Goose',
        command: 'goose',
        defaultModel: 'gpt-4o',
      },
      {
        id: 'copilot',
        name: 'GitHub Copilot CLI',
        command: 'copilot',
        defaultModel: 'claude-sonnet-4',
      },
    ];

    const agents: AiAgentInfo[] = catalog.map((item) => {
      const binaryPath = this.resolveAgentBinary(item.command);
      const installed = Boolean(binaryPath);
      const version = installed ? this.detectAgentVersion(item.id, binaryPath) : null;
      const model = this.detectAgentModel(item.id, item.defaultModel);
      return {
        id: item.id,
        name: item.name,
        command: item.command,
        installed,
        binaryPath,
        version,
        model,
        active: false,
      };
    });

    const currentlyValid = agents.find((a) => a.id === this.activeAgentId && a.installed);
    if (!currentlyValid) {
      const firstInstalled = agents.find((a) => a.installed);
      this.activeAgentId = firstInstalled ? firstInstalled.id : catalog[0].id;
    }

    for (const a of agents) {
      a.active = a.id === this.activeAgentId && a.installed;
    }

    return {
      activeAgentId: this.activeAgentId || '',
      agents,
    };
  }

  public selectAiAgent(agentId: string): { activeAgentId: string; agents: AiAgentInfo[] } {
    const current = this.getAiAgents();
    const target = current.agents.find((a) => a.id === agentId);
    if (!target) {
      throw new Error(`Không tìm thấy cấu hình cho AI Agent '${agentId}'.`);
    }
    if (!target.installed) {
      throw new Error(`AI Agent '${target.name}' (${target.command}) chưa được cài đặt trên máy.`);
    }
    this.activeAgentId = target.id;
    return this.getAiAgents();
  }

  private getCliArgsForAgent(agent: AiAgentInfo): string[] {
    switch (agent.id) {
      case 'agy':
        return ['-p', '--disable-slash-commands', '--dangerously-skip-permissions'];
      case 'claude':
        return ['-p', '--strict-mcp-config', '--dangerously-skip-permissions'];
      case 'gemini':
        return ['-p', 'Hãy xử lý dữ liệu từ stdin và chỉ trả về JSON theo đúng quy tắc.'];
      case 'opencode':
        return ['run'];
      case 'qwen':
        return ['-p'];
      case 'codex':
        return ['exec'];
      case 'aider':
        return ['--yes', '--no-git', '--message-file', '-'];
      case 'ollama':
        return ['run', agent.model];
      case 'goose':
        return ['run', '-t'];
      case 'copilot':
        return ['-p'];
      default:
        return ['-p'];
    }
  }

  public invokeLocalAiCli(prompt: string, timeoutMs = 35000): Promise<string | null> {
    const { agents } = this.getAiAgents();
    const installedAgents = agents.filter((a) => a.installed && a.binaryPath);
    if (installedAgents.length === 0) {
      return Promise.resolve(null);
    }

    // Prioritize the user-selected active agent first, then fallback to remaining installed agents
    const orderedAgents = [
      ...installedAgents.filter((a) => a.active),
      ...installedAgents.filter((a) => !a.active),
    ];

    const candidates: Array<{ cmd: string; args: string[] }> = orderedAgents.map((a) => ({
      cmd: a.binaryPath || a.command,
      args: this.getCliArgsForAgent(a),
    }));

    const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;
    delete cleanEnv.CLAUDE_CODE_ENTRYPOINT;

    return new Promise((resolve) => {
      const tryNext = (index: number) => {
        if (index >= candidates.length) {
          resolve(null);
          return;
        }
        const { cmd, args } = candidates[index];
        let stdout = '';
        let finished = false;

        const child = spawn(cmd, args, {
          cwd: os.tmpdir(),
          env: cleanEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        try {
          child.stdin.write(prompt);
          child.stdin.end();
        } catch {
          // ignore stdin write errors
        }

        const timer = setTimeout(() => {
          if (!finished) {
            finished = true;
            child.kill();
            tryNext(index + 1);
          }
        }, timeoutMs);

        child.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
        });

        child.on('error', () => {
          clearTimeout(timer);
          if (!finished) {
            finished = true;
            tryNext(index + 1);
          }
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          if (!finished) {
            finished = true;
            if (code === 0 && stdout.trim()) {
              resolve(stdout.trim());
            } else {
              tryNext(index + 1);
            }
          }
        });
      };

      tryNext(0);
    });
  }

  public extractJsonObject<T>(text: string): T | null {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
    } catch {
      return null;
    }
  }
}

export const cliRunner = new CliRunner();
