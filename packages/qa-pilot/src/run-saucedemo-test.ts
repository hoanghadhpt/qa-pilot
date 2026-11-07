import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { ReportManager } from './engine/reportManager.js';
import { oracleWatcher } from './engine/oracleWatcher.js';
import { EnvironmentConfig, QAStep } from './types.js';

async function main() {
  console.log('🚀 [QA Pilot] Khởi chạy kiểm thử tự động trên https://www.saucedemo.com/');
  console.log('📋 Áp dụng mô hình SFDIPOT và Triple-Oracle (UI + Console + Network)...\n');

  const env: EnvironmentConfig = {
    name: 'SauceDemo E-Commerce',
    baseUrl: 'https://www.saucedemo.com',
    isProduction: false,
    allowedDomains: ['saucedemo.com', 'www.saucedemo.com'],
    blockedActions: [],
    secrets: {
      standard_password: 'secret_sauce'
    }
  };

  const reportManager = new ReportManager();
  const session = reportManager.createSession(env, 'headed');
  const reportDir = session.reportDir;

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Attach oracle watcher for console and network monitoring
  oracleWatcher.attach(page);

  let stepIdx = 1;

  async function recordStep(
    type: 'navigate' | 'act' | 'assert' | 'inspect',
    instruction: string,
    actionFn: () => Promise<void>
  ): Promise<boolean> {
    const currentIdx = stepIdx++;
    const start = Date.now();
    const snapName = `step-${currentIdx}-after.png`;
    const snapPath = path.join(reportDir, snapName);

    console.log(`[Step ${currentIdx}] [${type.toUpperCase()}] ${instruction}`);
    let status: 'passed' | 'failed' = 'passed';
    let errorMessage: string | undefined;

    try {
      await actionFn();
      await page.waitForTimeout(600); // Visual stability
      await page.screenshot({ path: snapPath, fullPage: false });
    } catch (err: any) {
      status = 'failed';
      errorMessage = err.message;
      try {
        await page.screenshot({ path: snapPath, fullPage: false });
      } catch {
        // ignore screenshot error
      }
    }

    const durationMs = Date.now() - start;
    const step: QAStep = {
      stepIndex: currentIdx,
      type,
      instruction,
      status,
      durationMs,
      screenshotAfter: snapName,
      errorMessage
    };

    reportManager.addStep(step);
    console.log(`  -> ${status.toUpperCase()} (${durationMs}ms)\n`);
    return status === 'passed';
  }

  try {
    // 1. Structure & Interface: Tải trang chủ
    await recordStep('navigate', 'Mở trang đăng nhập https://www.saucedemo.com/', async () => {
      await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.login_logo');
    });

    // 2. Data Validation (Negative): Bỏ trống thông tin đăng nhập
    await recordStep('act', 'Bỏ trống Username & Password, click nút Login (Negative Validation)', async () => {
      await page.click('[data-test="login-button"]');
      await page.waitForSelector('[data-test="error"]');
      const errText = await page.textContent('[data-test="error"]');
      if (!errText?.includes('Username is required')) {
        throw new Error(`Kỳ vọng cảnh báo 'Username is required', nhận được: ${errText}`);
      }
    });

    // 3. Security Probe: Inject SQLi / Boundary Payload
    await recordStep('act', 'Thử nghiệm Adversarial Payload: Nhập "\' OR \'1\'=\'1" vào Username', async () => {
      await page.fill('[data-test="username"]', "' OR '1'='1");
      await page.fill('[data-test="password"]', "Admin'--");
      await page.click('[data-test="login-button"]');
      await page.waitForSelector('[data-test="error"]');
      const errText = await page.textContent('[data-test="error"]');
      if (!errText?.includes('Username and password do not match')) {
        throw new Error(`Hệ thống không chặn chuỗi độc hại đúng cách: ${errText}`);
      }
    });

    // 4. Negative Test: Tài khoản bị khóa (locked_out_user)
    await recordStep('act', 'Đăng nhập với tài khoản bị khóa (locked_out_user)', async () => {
      await page.fill('[data-test="username"]', 'locked_out_user');
      await page.fill('[data-test="password"]', 'secret_sauce');
      await page.click('[data-test="login-button"]');
      await page.waitForSelector('[data-test="error"]');
      const errText = await page.textContent('[data-test="error"]');
      if (!errText?.includes('Sorry, this user has been locked out')) {
        throw new Error(`Kỳ vọng thông báo khóa tài khoản, nhận được: ${errText}`);
      }
    });

    // 5. Happy Path: Đăng nhập thành công với standard_user
    await recordStep('act', 'Đăng nhập thành công với tài khoản chuẩn (standard_user)', async () => {
      await page.fill('[data-test="username"]', 'standard_user');
      await page.fill('[data-test="password"]', 'secret_sauce');
      await page.click('[data-test="login-button"]');
      await page.waitForURL('**/inventory.html');
      await page.waitForSelector('.inventory_list');
    });

    // 6. UI Assertion: Kiểm tra danh mục sản phẩm Swag Labs
    await recordStep('assert', 'Xác thực trang danh mục sản phẩm hiển thị đầy đủ tiêu đề và nút mua hàng', async () => {
      const title = await page.textContent('.title');
      if (!title?.includes('Products')) {
        throw new Error(`Tiêu đề không khớp: ${title}`);
      }
      const count = await page.locator('.inventory_item').count();
      if (count < 6) {
        throw new Error(`Kỳ vọng ít nhất 6 sản phẩm, nhận được: ${count}`);
      }
    });

    // 7. Operations: Thêm sản phẩm vào giỏ hàng
    await recordStep('act', 'Chọn mua sản phẩm "Sauce Labs Backpack" và kiểm tra Badge giỏ hàng', async () => {
      await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
      await page.waitForSelector('.shopping_cart_badge');
      const badgeText = await page.textContent('.shopping_cart_badge');
      if (badgeText !== '1') {
        throw new Error(`Badge giỏ hàng không hiển thị 1: ${badgeText}`);
      }
    });

    // 8. Navigation: Chuyển tới giỏ hàng
    await recordStep('navigate', 'Vào giỏ hàng (/cart.html) và kiểm tra mặt hàng đã chọn', async () => {
      await page.click('.shopping_cart_link');
      await page.waitForURL('**/cart.html');
      const itemName = await page.textContent('.inventory_item_name');
      if (!itemName?.includes('Sauce Labs Backpack')) {
        throw new Error(`Tên sản phẩm trong giỏ không khớp: ${itemName}`);
      }
    });

    // 9. Checkout Flow: Điền form thanh toán
    await recordStep('act', 'Tiến hành Checkout Step One: Điền thông tin khách hàng', async () => {
      await page.click('[data-test="checkout"]');
      await page.waitForURL('**/checkout-step-one.html');
      await page.fill('[data-test="firstName"]', 'Hoang');
      await page.fill('[data-test="lastName"]', 'Ha');
      await page.fill('[data-test="postalCode"]', '70000');
      await page.click('[data-test="continue"]');
      await page.waitForURL('**/checkout-step-two.html');
    });

    // 10. Final Assertion: Hoàn tất đơn hàng thành công
    await recordStep('assert', 'Xác nhận tổng tiền thanh toán và bấm hoàn tất đơn hàng (Finish)', async () => {
      const summaryTotal = await page.textContent('.summary_total_label');
      console.log(`   [Info] Tổng tiền hóa đơn: ${summaryTotal}`);
      await page.click('[data-test="finish"]');
      await page.waitForURL('**/checkout-complete.html');
      const completeHeader = await page.textContent('.complete-header');
      if (!completeHeader?.includes('Thank you for your order!')) {
        throw new Error(`Kỳ vọng 'Thank you for your order!', nhận được: ${completeHeader}`);
      }
    });

  } finally {
    // Generate Report
    const reportPath = reportManager.generateHtmlReport();
    console.log('\n======================================================');
    console.log(`📊 BÁO CÁO HTML ĐÃ ĐƯỢC TẠO THÀNH CÔNG:`);
    console.log(`   ${reportPath}`);
    console.log('======================================================\n');

    await browser.close();

    // Export report path for subsequent open command
    console.log(`REPORT_URL=${reportPath}`);
  }
}

main().catch((err) => {
  console.error('[Error] Kiểm thử gặp lỗi:', err);
  process.exit(1);
});
