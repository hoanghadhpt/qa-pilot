import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright-core';
import { config } from '../config/env';
import { TestSpec, TestStep } from './specAdapter';
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
        const redacted = environmentManager.redact(msg.text(), projectId, sensitiveValues);
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

    const locator = page.locator(resolvedTarget).first();
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
    await locator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});

    const box = await locator.boundingBox().catch(() => null);
    if (box) {
      this.lastInteractedBox = box;
    }

    if (step.action === 'input') {
      await locator.fill(resolvedValue, { timeout: timeoutMs });
    } else if (step.action === 'click') {
      await locator.click({ timeout: timeoutMs });
    } else if (step.action === 'assert') {
      const expectation = resolvedExpected || resolvedValue;
      if (expectation) {
        const text = await locator.innerText().catch(() => '');
        const val = await locator.inputValue().catch(() => '');
        if (!text.includes(expectation) && !val.includes(expectation)) {
          throw new Error(
            `Phần tử '${resolvedTarget}' không chứa nội dung kỳ vọng: '${expectation}'. Nhận được: '${text || val}'`
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

  public invokeLocalAiCli(prompt: string, timeoutMs = 15000): Promise<string | null> {
    const candidates: Array<{ cmd: string; args: string[] }> = [
      { cmd: 'claude', args: ['-p', prompt, '--dangerously-skip-permissions'] },
      { cmd: 'gemini', args: ['-p', prompt] },
    ];

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
          env: { ...process.env },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

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
