import { handleLaunchBrowser } from './tools/launch.js';
import { handleNavigate } from './tools/navigate.js';
import { handleAct } from './tools/act.js';
import { handleAssert } from './tools/assert.js';
import { handleGetReport } from './tools/report.js';
import { handleExportTest } from './tools/export.js';
import { browserManager } from './engine/browserManager.js';

async function verify() {
  console.log('--- BẮT ĐẦU KIỂM THỬ TÍCH HỢP QA PILOT MCP ---');

  // 1. Launch browser in headless mode for CI/test run
  console.log('1. Khởi chạy trình duyệt (headless)...');
  const launchRes = await handleLaunchBrowser({ headless: true, environment: 'local' });
  console.log('Kết quả launch:', launchRes.content[0].text);

  // 2. Navigate
  console.log('2. Điều hướng đến trang demo...');
  const navRes = await handleNavigate({ url: 'https://demo.automationtesting.in/Register.html' });
  console.log('Kết quả navigate:', navRes.content[0].text);

  // 3. Act
  console.log('3. Điền trường nhập First Name...');
  const actRes = await handleAct({ action: 'điền Nguyen vào ô First Name' });
  console.log('Kết quả act:', actRes.content[0].text);

  // 4. Assert
  console.log('4. Kiểm tra assertion tiêu đề...');
  const assertRes = await handleAssert({ assertion: 'Register' });
  console.log('Kết quả assert:', assertRes.content[0].text);

  // 5. Get visual report
  console.log('5. Tạo báo cáo trực quan...');
  const reportRes = await handleGetReport();
  console.log('Kết quả report:', reportRes.content[0].text);

  // 6. Export test
  console.log('6. Xuất kịch bản Playwright...');
  const exportRes = await handleExportTest({
    testName: 'TC-01-register-demo',
    format: 'playwright',
    targetPath: 'tests/e2e/demo-register.spec.ts'
  });
  console.log('Kết quả export:', exportRes.content[0].text);

  // 7. Cleanup
  await browserManager.close();
  console.log('--- HOÀN THÀNH KIỂM THỬ THÀNH CÔNG! ---');
}

verify().catch((err) => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});

