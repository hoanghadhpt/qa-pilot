import fs from 'node:fs';
import path from 'node:path';
import { SuiteExecutionRun } from '../types.js';
import { globalRedactor } from '../security/redactor.js';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeText(str: string): string {
  return escapeHtml(globalRedactor.redact(str));
}

function findWorkspaceRoot(startDir: string): string {
  let cur = startDir;
  while (cur !== path.dirname(cur)) {
    if (
      fs.existsSync(path.join(cur, 'specs')) ||
      fs.existsSync(path.join(cur, '.agents')) ||
      fs.existsSync(path.join(cur, 'package.json'))
    ) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return startDir;
}

export class SuiteReportManager {
  private runsDir: string;
  private latestRun: SuiteExecutionRun | null = null;

  constructor() {
    const root = findWorkspaceRoot(process.cwd());
    this.runsDir = path.resolve(root, 'tests', 'runs', 'suites');
    if (!fs.existsSync(this.runsDir)) {
      fs.mkdirSync(this.runsDir, { recursive: true });
    }
  }

  public getLatestRun(): SuiteExecutionRun | null {
    return this.latestRun;
  }

  public async generateSuiteReport(run: SuiteExecutionRun): Promise<string> {
    this.latestRun = run;

    const runDir = path.join(this.runsDir, run.runId);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const reportPath = path.join(runDir, 'suite-report.html');
    const latestPath = path.join(this.runsDir, 'latest-suite-report.html');

    const executedCases = run.passedCases + run.failedCases;
    const passRate = executedCases > 0 ? Math.round((run.passedCases / executedCases) * 100) : 0;
    const isOverallPass = run.failedCases === 0;

    const caseCardsHtml = run.results
      .map((c) => {
        const statusClass =
          c.status === 'passed' ? 'status-pass' : c.status === 'failed' ? 'status-fail' : 'status-skip';
        const statusLabel =
          c.status === 'passed' ? '✓ ĐẠT' : c.status === 'failed' ? '✕ THẤT BẠI' : '⊘ BỎ QUA';

        const stepsHtml = c.steps
          .map((s) => {
            const stepStatusClass =
              s.status === 'passed'
                ? 'step-pass'
                : s.status === 'failed'
                ? 'step-fail'
                : s.status === 'warning'
                ? 'step-warn'
                : 'step-skip';

            const errHtml = s.errorMessage
              ? `<div class="step-error">${safeText(s.errorMessage)}</div>`
              : '';

            return `
              <div class="step-row ${stepStatusClass}">
                <div class="step-num">#${s.stepIndex}</div>
                <div class="step-body">
                  <div class="step-action"><strong>Hành động:</strong> ${safeText(s.action)}</div>
                  <div class="step-expected"><strong>Kỳ vọng:</strong> ${safeText(s.expected)}</div>
                  ${errHtml}
                </div>
                <div class="step-meta">
                  <span class="step-badge ${s.status}">${s.status.toUpperCase()}</span>
                  <span class="step-time">${s.durationMs}ms</span>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="case-card ${statusClass}" data-status="${c.status}">
            <div class="case-header" onclick="toggleCaseDetails(this)">
              <div class="case-info">
                <span class="case-badge-id">${safeText(c.caseId)}</span>
                <span class="case-badge-pri">${safeText(c.priority)}</span>
                <span class="case-badge-type">${safeText(c.type)}</span>
                <h3 class="case-title">${safeText(c.title)}</h3>
              </div>
              <div class="case-meta">
                <span class="case-status-badge ${c.status}">${statusLabel}</span>
                <span class="case-duration">${(c.durationMs / 1000).toFixed(2)}s</span>
                <span class="expand-icon">▼</span>
              </div>
            </div>
            <div class="case-details">
              ${c.errorMessage ? `<div class="case-error-banner">${safeText(c.errorMessage)}</div>` : ''}
              <div class="steps-list">
                ${stepsHtml || '<div class="no-steps">Không có bước nào được thực thi (ca kiểm thử bị bỏ qua).</div>'}
              </div>
            </div>
          </div>
        `;
      })
      .join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suite Report: ${safeText(run.suiteName)}</title>
  <style>
    :root {
      --bg-base: #090d16;
      --bg-surface: #111827;
      --bg-card: #1f2937;
      --border-color: #374151;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --color-pass: #10b981;
      --color-fail: #ef4444;
      --color-warn: #f59e0b;
      --color-skip: #6b7280;
      --color-primary: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg-base); color: var(--text-main); padding: 24px; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Top Header */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }
    .brand-title { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .brand-subtitle { font-size: 13px; color: var(--text-muted); }
    .badge-status {
      font-size: 13px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
    }
    .badge-status.pass { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-status.fail { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }

    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px 20px;
    }
    .kpi-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
    .kpi-value { font-size: 28px; font-weight: 800; }
    .kpi-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
    }
    .filter-btn {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .filter-btn:hover, .filter-btn.active {
      background: var(--color-primary);
      color: #fff;
      border-color: var(--color-primary);
    }

    /* Test Case Card */
    .case-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .case-card:hover { border-color: #4b5563; }
    .case-card.status-pass { border-left: 4px solid var(--color-pass); }
    .case-card.status-fail { border-left: 4px solid var(--color-fail); }
    .case-card.status-skip { border-left: 4px solid var(--color-skip); opacity: 0.75; }

    .case-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      cursor: pointer;
      user-select: none;
    }
    .case-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .case-badge-id { font-size: 12px; font-weight: 700; background: #374151; padding: 2px 8px; border-radius: 4px; }
    .case-badge-pri { font-size: 11px; font-weight: 700; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 6px; border-radius: 4px; }
    .case-badge-type { font-size: 11px; font-weight: 600; background: #1f2937; color: var(--text-muted); padding: 2px 6px; border-radius: 4px; border: 1px solid #374151; }
    .case-title { font-size: 15px; font-weight: 600; color: #f3f4f6; }

    .case-meta { display: flex; align-items: center; gap: 12px; }
    .case-status-badge { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; }
    .case-status-badge.passed { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .case-status-badge.failed { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .case-status-badge.skipped { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
    .case-duration { font-size: 12px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .expand-icon { font-size: 10px; color: var(--text-muted); transition: transform 0.2s; }
    .case-card.open .expand-icon { transform: rotate(180deg); }

    /* Case Details */
    .case-details { display: none; padding: 0 20px 16px 20px; border-top: 1px solid #1f2937; }
    .case-card.open .case-details { display: block; }
    .case-error-banner {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      margin: 12px 0;
    }

    /* Steps List */
    .steps-list { margin-top: 12px; display: flex; flexDirection: column; gap: 8px; }
    .step-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #1f2937;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      border-left: 3px solid transparent;
    }
    .step-row.step-pass { border-left-color: var(--color-pass); }
    .step-row.step-fail { border-left-color: var(--color-fail); }
    .step-row.step-warn { border-left-color: var(--color-warn); }
    .step-num { font-weight: 700; color: var(--text-muted); min-width: 24px; }
    .step-body { flex: 1; }
    .step-action { color: #f3f4f6; margin-bottom: 2px; }
    .step-expected { color: var(--text-muted); font-size: 12px; }
    .step-error { color: #f87171; font-size: 12px; margin-top: 4px; }
    .step-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .step-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .step-badge.passed { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .step-badge.failed { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .step-badge.warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .step-time { font-size: 11px; color: var(--text-muted); }
    .no-steps { color: var(--text-muted); font-size: 13px; font-style: italic; padding: 12px 0; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Top Header -->
    <header class="header-bar">
      <div>
        <h1 class="brand-title">🧪 Suite Report: ${safeText(run.suiteName)}</h1>
        <div class="brand-subtitle">Phân hệ: <strong>${safeText(run.module)}</strong> • Phiên chạy: <strong>${safeText(run.runId)}</strong> • Bắt đầu: ${new Date(run.startedAt).toLocaleString('vi-VN')}</div>
      </div>
      <div>
        <span class="badge-status ${isOverallPass ? 'pass' : 'fail'}">
          ${isOverallPass ? '✓ SUITE PASSED' : '✕ SUITE FAILED'}
        </span>
      </div>
    </header>

    <!-- KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Tỷ Lệ Đạt (Pass Rate)</div>
        <div class="kpi-value" style="color: ${isOverallPass ? '#34d399' : '#f87171'};">${passRate}%</div>
        <div class="kpi-sub">${run.passedCases}/${executedCases} ca kiểm thử đạt</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tổng Số Ca Kiểm Thử</div>
        <div class="kpi-value" style="color: #60a5fa;">${run.totalCases}</div>
        <div class="kpi-sub">Đạt: ${run.passedCases} • Thất bại: ${run.failedCases} • Bỏ qua: ${run.skippedCases}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Thời Gian Thực Thi</div>
        <div class="kpi-value" style="color: #c084fc;">${(run.durationMs / 1000).toFixed(2)}s</div>
        <div class="kpi-sub">Tổng thời lượng chạy</div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <button class="filter-btn active" onclick="filterCases('all', this)">Tất Cả (${run.results.length})</button>
      <button class="filter-btn" onclick="filterCases('passed', this)">Đạt (${run.passedCases})</button>
      <button class="filter-btn" onclick="filterCases('failed', this)">Thất Bại (${run.failedCases})</button>
      <button class="filter-btn" onclick="filterCases('skipped', this)">Bỏ Qua (${run.skippedCases})</button>
    </div>

    <!-- Test Cases Container -->
    <div class="cases-container">
      ${caseCardsHtml}
    </div>
  </div>

  <script>
    function toggleCaseDetails(headerEl) {
      const card = headerEl.parentElement;
      card.classList.toggle('open');
    }

    function filterCases(status, btnEl) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');

      const cards = document.querySelectorAll('.case-card');
      cards.forEach(card => {
        if (status === 'all' || card.getAttribute('data-status') === status) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;

    fs.writeFileSync(reportPath, htmlContent, 'utf8');
    fs.writeFileSync(latestPath, htmlContent, 'utf8');

    return reportPath;
  }
}

export const suiteReportManager = new SuiteReportManager();

