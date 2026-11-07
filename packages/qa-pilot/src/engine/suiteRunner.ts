import {
  TestSuite,
  TestCase,
  SuiteExecutionRun,
  TestCaseExecutionResult,
  StepExecutionResult,
} from '../types.js';
import { suiteManager } from './suiteManager.js';
import { browserManager } from './browserManager.js';
import { midsceneBridge } from './midsceneBridge.js';
import { oracleWatcher } from './oracleWatcher.js';
import { authManager } from './authManager.js';
import { suiteReportManager } from './suiteReportManager.js';

export interface RunSuiteOptions {
  suiteId: string;
  module?: string;
  filterTags?: string[];
  priority?: string;
  headless?: boolean;
}

export class SuiteRunner {
  private latestRun: SuiteExecutionRun | null = null;

  public getLatestRun(): SuiteExecutionRun | null {
    return this.latestRun;
  }

  /**
   * Thực thi toàn bộ hoặc chọn lọc các test case trong Test Suite
   */
  public async runSuite(options: RunSuiteOptions): Promise<SuiteExecutionRun> {
    const { suiteId, module: moduleName, filterTags, priority, headless = false } = options;

    const suite = await suiteManager.loadSuite(suiteId, moduleName);

    // Đảm bảo trình duyệt đã khởi động
    let page = browserManager.getPage();
    if (!page) {
      page = await browserManager.launch({ headless });
    }
    midsceneBridge.attach(page);

    const runId = `suite-run-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const caseResults: TestCaseExecutionResult[] = [];

    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Lọc các ca kiểm thử
    const activeCases = suite.cases.map((c) => {
      let shouldRun = true;

      if (filterTags && filterTags.length > 0) {
        const hasTag = c.tags.some((t) => filterTags.includes(t));
        if (!hasTag) shouldRun = false;
      }

      if (priority && c.priority !== priority) {
        shouldRun = false;
      }

      return { testCase: c, shouldRun };
    });

    const startTime = Date.now();

    for (const item of activeCases) {
      const { testCase, shouldRun } = item;

      if (!shouldRun) {
        skippedCount++;
        caseResults.push({
          caseId: testCase.id,
          title: testCase.title,
          priority: testCase.priority,
          type: testCase.type,
          status: 'skipped',
          durationMs: 0,
          steps: [],
          oracleIssues: [],
          errorMessage: 'Bỏ qua theo bộ lọc nhãn hoặc mức độ ưu tiên',
        });
        continue;
      }

      // Xử lý nạp quyền người dùng (Auth Session Coordination)
      if (testCase.auth_role) {
        try {
          if (testCase.auth_role === 'guest') {
            await authManager.clearSession(undefined, browserManager.getContext());
          } else if (testCase.auth_role !== authManager.getActiveRole()) {
            const state = await authManager.loadSession(testCase.auth_role);
            page = await browserManager.reloadWithStorageState(state);
            midsceneBridge.attach(page);
          }
        } catch (err: any) {
          console.warn(`[SuiteRunner] Không thể chuyển auth role sang '${testCase.auth_role}': ${err.message}`);
        }
      }

      // Điều hướng đến URL ban đầu nếu có với phiên sạch
      if (suite.target_url) {
        try {
          await page.context().clearCookies().catch(() => {});
          await page.goto(suite.target_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.evaluate(() => localStorage.clear()).catch(() => {});
        } catch {}
      }

      // Thực thi các bước trong test case
      const caseStartTime = Date.now();
      const stepResults: StepExecutionResult[] = [];
      let caseFailed = false;
      let caseErrorMsg: string | undefined = undefined;

      for (const step of testCase.steps) {
        oracleWatcher.startStep();
        const stepStart = Date.now();

        try {
          const actRes = await midsceneBridge.aiAction(step.action, { optional: step.optional });
          if (!actRes.success && !step.optional) {
            throw new Error(actRes.message);
          }

          stepResults.push({
            stepIndex: step.step,
            action: step.action,
            data: step.data,
            expected: step.expected,
            status: actRes.success ? 'passed' : 'warning',
            durationMs: Date.now() - stepStart,
            screenshotAfter: actRes.screenshot,
          });
        } catch (err: any) {
          const isOptional = step.optional || false;

          stepResults.push({
            stepIndex: step.step,
            action: step.action,
            data: step.data,
            expected: step.expected,
            status: isOptional ? 'warning' : 'failed',
            durationMs: Date.now() - stepStart,
            errorMessage: err.message,
          });

          if (!isOptional) {
            caseFailed = true;
            caseErrorMsg = `Bước ${step.step} thất bại: ${err.message}`;
            break; // Dừng các bước tiếp theo trong ca kiểm thử này
          }
        }
      }

      // Nếu các bước đều đạt, tiến hành kiểm tra Assertions
      if (!caseFailed && testCase.assertions && testCase.assertions.length > 0) {
        for (const assertion of testCase.assertions) {
          oracleWatcher.startStep();
          const assertStart = Date.now();
          try {
            const assertRes = await midsceneBridge.aiAssert(assertion);
            if (!assertRes.passed) {
              throw new Error(assertRes.message);
            }
            stepResults.push({
              stepIndex: stepResults.length + 1,
              action: `Xác thực khẳng định: "${assertion}"`,
              expected: assertion,
              status: 'passed',
              durationMs: Date.now() - assertStart,
              screenshotAfter: assertRes.screenshot,
            });
          } catch (err: any) {
            caseFailed = true;
            caseErrorMsg = `Khẳng định không đạt: "${assertion}" (${err.message})`;
            stepResults.push({
              stepIndex: stepResults.length + 1,
              action: `Xác thực khẳng định: "${assertion}"`,
              expected: assertion,
              status: 'failed',
              durationMs: Date.now() - assertStart,
              errorMessage: err.message,
            });
            break;
          }
        }
      }

      const caseDuration = Date.now() - caseStartTime;
      const caseStatus = caseFailed ? 'failed' : 'passed';
      if (caseStatus === 'passed') passedCount++;
      else failedCount++;

      caseResults.push({
        caseId: testCase.id,
        title: testCase.title,
        priority: testCase.priority,
        type: testCase.type,
        status: caseStatus,
        durationMs: caseDuration,
        steps: stepResults,
        oracleIssues: oracleWatcher.getAllIssues(),
        errorMessage: caseErrorMsg,
      });
    }

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const run: SuiteExecutionRun = {
      runId,
      suiteId: suite.id,
      suiteName: suite.name,
      module: suite.module,
      startedAt,
      finishedAt,
      durationMs,
      totalCases: suite.cases.length,
      passedCases: passedCount,
      failedCases: failedCount,
      skippedCases: skippedCount,
      filterTags,
      results: caseResults,
      reportPath: '',
    };

    // Tạo báo cáo HTML tổng hợp
    const reportPath = await suiteReportManager.generateSuiteReport(run);
    run.reportPath = reportPath;
    this.latestRun = run;

    return run;
  }
}

export const suiteRunner = new SuiteRunner();
