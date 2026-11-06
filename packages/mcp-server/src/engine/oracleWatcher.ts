import { Page, ConsoleMessage, Request, Response } from 'playwright';

export interface OracleIssue {
  type: 'console_error' | 'js_exception' | 'network_failure' | 'http_server_error';
  message: string;
  timestamp: string;
  source?: string;
}

export class OracleWatcher {
  private issues: OracleIssue[] = [];
  private stepDelta: OracleIssue[] = [];

  public attach(page: Page): void {
    this.issues = [];
    this.stepDelta = [];

    // 1. Console Oracle: Capture console errors
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const issue: OracleIssue = {
          type: 'console_error',
          message: msg.text(),
          timestamp: new Date().toISOString(),
          source: msg.location().url
        };
        this.issues.push(issue);
        this.stepDelta.push(issue);
      }
    });

    // 2. Exception Oracle: Unhandled JavaScript exceptions
    page.on('pageerror', (err: Error) => {
      const issue: OracleIssue = {
        type: 'js_exception',
        message: err.message,
        timestamp: new Date().toISOString()
      };
      this.issues.push(issue);
      this.stepDelta.push(issue);
    });

    // 3. Network Oracle: Request failures (DNS, timeout, abort)
    page.on('requestfailed', (req: Request) => {
      const failure = req.failure();
      const issue: OracleIssue = {
        type: 'network_failure',
        message: `Yêu cầu mạng thất bại: ${req.method()} ${req.url()} (${failure?.errorText || 'Unknown'})`,
        timestamp: new Date().toISOString()
      };
      this.issues.push(issue);
      this.stepDelta.push(issue);
    });

    // 4. HTTP Status Oracle: 4xx and 5xx responses
    page.on('response', (res: Response) => {
      const status = res.status();
      if (status >= 500) {
        const issue: OracleIssue = {
          type: 'http_server_error',
          message: `Lỗi máy chủ HTTP ${status}: ${res.request().method()} ${res.url()}`,
          timestamp: new Date().toISOString()
        };
        this.issues.push(issue);
        this.stepDelta.push(issue);
      }
    });
  }

  public startStep(): void {
    this.stepDelta = [];
  }

  public getStepIssues(): OracleIssue[] {
    return [...this.stepDelta];
  }

  public getAllIssues(): OracleIssue[] {
    return [...this.issues];
  }
}

export const oracleWatcher = new OracleWatcher();

