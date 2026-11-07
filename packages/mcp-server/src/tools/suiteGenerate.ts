import { suiteGenerator, GenerateSuiteOptions } from '../engine/suiteGenerator.js';
import { suiteManager } from '../engine/suiteManager.js';

export async function handleGenerateSuite(options: GenerateSuiteOptions) {
  const { module: moduleName, url, prompt, suiteId, tags } = options;

  if (!moduleName) {
    throw new Error('Tham số module là bắt buộc khi sinh Test Suite.');
  }

  const suite = await suiteGenerator.generateSuite({
    module: moduleName,
    url,
    prompt,
    suiteId,
    tags,
  });

  const filePath = suiteManager.getSuitePath(suite.module, suite.id);

  // Thống kê phân loại các case
  const categories: Record<string, number> = {};
  for (const c of suite.cases) {
    categories[c.type] = (categories[c.type] || 0) + 1;
  }

  const categorySummary = Object.entries(categories)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ');

  return {
    content: [
      {
        type: 'text',
        text: `Đã tự động sinh thành công Test Suite chuẩn hóa cho phân hệ '${suite.module}'.
- Tên Suite: ${suite.name}
- Mã định danh (suiteId): ${suite.id}
- Số lượng Test Case: ${suite.cases.length} ca kiểm thử (${categorySummary})
- Tệp lưu trữ Test-as-Code: ${filePath}
- URL khảo sát: ${suite.target_url || 'N/A'}
- Nhãn phân loại (tags): ${suite.tags.join(', ')}

Bạn có thể chạy kiểm thử toàn bộ suite bằng lệnh:
qa_run_suite({ suiteId: "${suite.id}" })
hoặc chạy riêng các ca kiểm thử khói:
qa_run_suite({ suiteId: "${suite.id}", filterTags: ["smoke"] })`,
      },
    ],
  };
}

