import { suiteRunner, RunSuiteOptions } from '../engine/suiteRunner.js';

export async function handleRunSuite(options: RunSuiteOptions) {
  const { suiteId } = options;

  if (!suiteId) {
    throw new Error('Tham số suiteId là bắt buộc khi thực thi Test Suite.');
  }

  const run = await suiteRunner.runSuite(options);

  const executed = run.passedCases + run.failedCases;
  const passRate = executed > 0 ? Math.round((run.passedCases / executed) * 100) : 0;

  return {
    content: [
      {
        type: 'text',
        text: `Đã hoàn thành thực thi Test Suite '${run.suiteName}' (${run.suiteId}).
- Kết quả: ${run.passedCases}/${executed} ca kiểm thử đạt (${passRate}%)
- Thất bại: ${run.failedCases}
- Bỏ qua: ${run.skippedCases}
- Thời gian chạy: ${(run.durationMs / 1000).toFixed(2)}s
- Báo cáo HTML trực quan cấp Suite: ${run.reportPath}

Bạn có thể mở tệp báo cáo trên trình duyệt để kiểm tra chi tiết từng bước và bằng chứng ảnh chụp.`,
      },
    ],
  };
}

