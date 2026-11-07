import { suiteExporter } from '../engine/suiteExporter.js';

export interface ExportSuiteArgs {
  suiteId: string;
  format?: 'playwright' | 'yaml';
  targetPath?: string;
}

export async function handleExportSuite(args: ExportSuiteArgs) {
  const { suiteId, format = 'playwright', targetPath } = args;

  if (!suiteId) {
    throw new Error('Tham số suiteId là bắt buộc khi xuất Test Suite.');
  }

  const result = await suiteExporter.exportSuite(suiteId, format, targetPath);

  return {
    content: [
      {
        type: 'text',
        text: `Đã xuất Test Suite '${suiteId}' thành công (${result.caseCount} ca kiểm thử).
- Định dạng xuất: ${format.toUpperCase()}
- Đường dẫn tệp: ${result.targetPath}

Bạn có thể chạy kiểm thử Playwright trực tiếp bằng lệnh:
npx playwright test ${result.targetPath}`,
      },
    ],
  };
}

