import { handleLaunchBrowser } from './tools/launch.js';
import { handleNavigate } from './tools/navigate.js';
import { handlePlanTestMatrix } from './tools/planMatrix.js';
import { handleAct } from './tools/act.js';
import { handleAssert } from './tools/assert.js';
import { handleGetReport } from './tools/report.js';
import { handleExportTest } from './tools/export.js';
import { browserManager } from './engine/browserManager.js';
import { QA_FIXTURES } from './fixtures/testData.js';

async function runQABrainTest() {
  console.log('================================================================');
  console.log('🧠 KHỞI ĐỘNG BỘ NÃO TESTER CHUYÊN NGHIỆP (QA BRAIN ENGINE)');
  console.log('Mục tiêu: https://demo.automationtesting.in/Register.html');
  console.log('================================================================\n');

  // 1. Khởi chạy trình duyệt (Headed mode)
  console.log('👉 [BƯỚC 1/5] Khởi động trình duyệt...');
  await handleLaunchBrowser({ headless: false, environment: 'local' });
  await new Promise(r => setTimeout(r, 800));
  await handleNavigate({ url: 'https://demo.automationtesting.in/Register.html' });

  // 2. TƯ DUY QA TRƯỚC TIÊN: Lập ma trận kiểm thử
  console.log('\n👉 [BƯỚC 2/5] Khảo sát giao diện & Tự động Lập Ma Trận Kiểm Thử (Test Matrix)...');
  const matrixRes = await handlePlanTestMatrix({});
  console.log('\n' + matrixRes.content[0].text + '\n');

  // 3. THỰC THI MA TRẬN THEO THỨ TỰ
  console.log('👉 [BƯỚC 3/5] Thực thi kịch bản kiểm thử đa chiều...');

  // --- Kịch bản 1: Happy Path ---
  console.log('\n--- 1. Thực thi Happy Path (Dữ liệu hợp lệ chuẩn) ---');
  await handleAct({ action: `điền ${QA_FIXTURES.valid.firstName} vào ô First Name` });
  await handleAct({ action: `điền ${QA_FIXTURES.valid.lastName} vào ô Last Name` });
  await handleAct({ action: `điền ${QA_FIXTURES.valid.email} vào ô Email` });
  await handleAct({ action: `điền ${QA_FIXTURES.valid.phone} vào ô Phone` });
  await handleAct({ action: 'bấm vào Male' });
  await handleAct({ action: 'bấm vào Cricket' });
  await new Promise(r => setTimeout(r, 600));

  // --- Kịch bản 2: Boundary & XSS Injection Attack ---
  console.log('\n--- 2. Thực thi Kịch bản Tấn công Dữ liệu & XSS Payload ---');
  const xss = QA_FIXTURES.boundaryAndAttacks.xssPayloads[0];
  console.log(`  * Tiêm payload XSS: "${xss}" vào First Name...`);
  await handleAct({ action: `điền ${xss} vào ô First Name` });
  await new Promise(r => setTimeout(r, 600));

  // --- Kịch bản 3: Hỗ trợ tiếng Việt đầy đủ ---
  console.log('\n--- 3. Thực thi Kịch bản Unicode / Tiếng Việt có dấu ---');
  const vnText = QA_FIXTURES.boundaryAndAttacks.unicodeAndEmoji[0];
  console.log(`  * Nhập tiếng Việt: "${vnText}" vào First Name...`);
  await handleAct({ action: `điền ${vnText} vào ô First Name` });
  await new Promise(r => setTimeout(r, 600));

  // --- Kịch bản 4: Negative Validation ---
  console.log('\n--- 4. Thực thi Kịch bản Negative Validation (Email sai định dạng) ---');
  const invalidEmail = QA_FIXTURES.negative.invalidEmails[0];
  console.log(`  * Nhập email sai: "${invalidEmail}"...`);
  await handleAct({ action: `điền ${invalidEmail} vào ô Email` });
  await new Promise(r => setTimeout(r, 600));

  // --- Kịch bản 5: State Idempotency (Reset Form) ---
  console.log('\n--- 5. Thực thi Kịch bản Trạng thái (Reset / Refresh Form) ---');
  console.log('  * Nhấn nút Refresh để hoàn nguyên trạng thái form...');
  await handleAct({ action: 'bấm vào Refresh' });
  await new Promise(r => setTimeout(r, 800));

  // 4. Assertions & Triple-Oracle Check
  console.log('\n👉 [BƯỚC 4/5] Xác thực kết quả & Kiểm tra Triple-Oracle (UI + Console + Network)...');
  const assertRes = await handleAssert({ assertion: 'Register' });
  console.log('=> Kết quả xác thực:', assertRes.content[0].text);

  // 5. Đóng gói Báo cáo và Xuất Code
  console.log('\n👉 [BƯỚC 5/5] Tạo Báo cáo Chuyên sâu và Xuất Test-as-Code Playwright...');
  const reportRes = await handleGetReport();
  console.log('=>', reportRes.content[0].text);

  const exportRes = await handleExportTest({
    testName: 'TC-QA-BRAIN-MATRIX-RUN',
    format: 'playwright',
    targetPath: 'tests/e2e/qa-brain-matrix.spec.ts'
  });
  console.log('=>', exportRes.content[0].text);

  await new Promise(r => setTimeout(r, 2000));
  await browserManager.close();

  console.log('\n================================================================');
  console.log('🎉 PHIÊN KIỂM THỬ VỚI TƯ DUY SENIOR QA ĐÃ HOÀN TẤT THÀNH CÔNG!');
  console.log('================================================================');
}

runQABrainTest().catch((err) => {
  console.error('Lỗi phiên test:', err);
  browserManager.close();
  process.exit(1);
});

