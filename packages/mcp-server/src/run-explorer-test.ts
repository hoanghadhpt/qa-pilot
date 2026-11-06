import { handleLaunchBrowser } from './tools/launch.js';
import { handleNavigate } from './tools/navigate.js';
import { handleAct } from './tools/act.js';
import { handleAssert } from './tools/assert.js';
import { handleInspect } from './tools/inspect.js';
import { handleGetReport } from './tools/report.js';
import { handleExportTest } from './tools/export.js';
import { browserManager } from './engine/browserManager.js';
import { reportManager } from './engine/reportManager.js';

async function runExploratoryTest() {
  console.log('=====================================================');
  console.log('🚀 QA PILOT: BẮT ĐẦU PHIÊN EXPLORATORY TESTING');
  console.log('Mục tiêu: https://demo.automationtesting.in/Register.html');
  console.log('=====================================================\n');

  // 1. Launch browser in headed mode (cửa sổ trực quan)
  console.log('[1/8] Khởi động trình duyệt có giao diện (Headed mode)...');
  const launchRes = await handleLaunchBrowser({ headless: false, environment: 'local' });
  console.log('=>', launchRes.content[0].text);

  // 2. Navigate to target URL
  console.log('\n[2/8] Điều hướng đến trang Đăng ký...');
  const navRes = await handleNavigate({ url: 'https://demo.automationtesting.in/Register.html' });
  console.log('=>', navRes.content[0].text);

  // 3. Inspect page layout
  console.log('\n[3/8] Khảo sát cấu trúc trang (Inspect)...');
  const inspectRes = await handleInspect();
  console.log('=> Tóm tắt trang:\n' + inspectRes.content[0].text);

  // 4. Fill form fields
  console.log('\n[4/8] Thực hiện chuỗi nhập liệu thăm dò...');
  
  const actions = [
    'điền Hoang vào ô First Name',
    'điền Ha vào ô Last Name',
    'điền 123 AI Boulevard, Tech City vào ô Address',
    'điền hoangha.test@example.com vào ô Email',
    'điền 0987654321 vào ô Phone',
    'bấm vào Male',
    'bấm vào Cricket',
    'điền SecretPassword123! vào ô Password'
  ];

  for (const act of actions) {
    console.log(`  - Đang thực hiện: "${act}"...`);
    const actRes = await handleAct({ action: act });
    console.log('    ✓', actRes.content[0].text);
    // Short pause for smooth visual observation
    await new Promise(r => setTimeout(r, 600));
  }

  // 5. Assertions
  console.log('\n[5/8] Xác thực nội dung và trạng thái giao diện...');
  const assert1 = await handleAssert({ assertion: 'Register' });
  console.log('  - Assert tiêu đề:', assert1.content[0].text);

  // 6. Test Form Reset (Nút Refresh)
  console.log('\n[6/8] Kiểm thử chức năng làm mới (Reset Form)...');
  const refreshAct = await handleAct({ action: 'bấm vào Refresh' });
  console.log('  - Hành động Refresh:', refreshAct.content[0].text);
  await new Promise(r => setTimeout(r, 1000));

  // 7. Generate Visual Report
  console.log('\n[7/8] Đóng gói và tạo Báo cáo trực quan HTML...');
  const reportRes = await handleGetReport();
  console.log('=>', reportRes.content[0].text);

  // 8. Export to Playwright test
  console.log('\n[8/8] Xuất kịch bản Playwright Test-as-Code...');
  const exportRes = await handleExportTest({
    testName: 'TC-EXPLORATORY-REGISTER',
    format: 'playwright',
    targetPath: 'tests/e2e/exploratory-register.spec.ts'
  });
  console.log('=>', exportRes.content[0].text);

  // Leave browser open for a few seconds so user can see it
  await new Promise(r => setTimeout(r, 3000));
  await browserManager.close();

  console.log('\n=====================================================');
  console.log('✅ PHIÊN EXPLORATORY TESTING ĐÃ HOÀN TẤT!');
  console.log('=====================================================');
}

runExploratoryTest().catch((err) => {
  console.error('Lỗi phiên test:', err);
  browserManager.close();
  process.exit(1);
});

