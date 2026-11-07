import { suiteReportManager } from '../engine/suiteReportManager.js';

export interface GetSuiteReportArgs {
  runId?: string;
}

export async function handleGetSuiteReport(args: GetSuiteReportArgs = {}) {
  const latestRun = suiteReportManager.getLatestRun();

  if (!latestRun) {
    return {
      content: [
        {
          type: 'text',
          text: 'Chưa có phiên chạy Suite nào được thực thi trong phiên làm việc hiện tại. Vui lòng chạy qa_run_suite trước.',
        },
      ],
    };
  }

  const executed = latestRun.passedCases + latestRun.failedCases;
  const passRate = executed > 0 ? Math.round((latestRun.passedCases / executed) * 100) : 0;

  return {
    content: [
      {
        type: 'text',
        text: `Báo cáo trực quan cấp Suite:
- Suite: ${latestRun.suiteName} (${latestRun.suiteId})
- Phiên chạy: ${latestRun.runId}
- Tỷ lệ đạt: ${passRate}% (${latestRun.passedCases}/${executed} cases)
- Đường dẫn tệp báo cáo: ${latestRun.reportPath}`,
      },
    ],
  };
}

