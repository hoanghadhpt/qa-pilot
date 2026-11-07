/**
 * QA Pilot - End-to-End Test Runner on VnExpress.net
 * Tests 5 major categories: Thời sự, Kinh doanh, Thể thao, Giải trí, Thế giới
 * Tracks Triple-Oracle, Token usage estimation, and produces HTML report & Playwright spec.
 */

import { browserManager } from './engine/browserManager.js';
import { reportManager } from './engine/reportManager.js';
import { oracleWatcher } from './engine/oracleWatcher.js';
import { modelConfigManager } from './security/modelConfig.js';
import { StepType } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

interface CategoryTestSpec {
  name: string;
  slug: string;
  urlSubstr: string;
  expectedKeywords: string[];
}

const CATEGORIES: CategoryTestSpec[] = [
  {
    name: 'Thời sự',
    slug: 'thoi-su',
    urlSubstr: '/thoi-su',
    expectedKeywords: ['Thời sự', 'Chính trị', 'Dân sinh', 'Giao thông']
  },
  {
    name: 'Kinh doanh',
    slug: 'kinh-doanh',
    urlSubstr: '/kinh-doanh',
    expectedKeywords: ['Kinh doanh', 'Quốc tế', 'Doanh nghiệp', 'Chứng khoán', 'Bất động sản']
  },
  {
    name: 'Thể thao',
    slug: 'the-thao',
    urlSubstr: '/the-thao',
    expectedKeywords: ['Thể thao', 'Bóng đá', 'Tennis', 'Marathon']
  },
  {
    name: 'Giải trí',
    slug: 'giai-tri',
    urlSubstr: '/giai-tri',
    expectedKeywords: ['Giải trí', 'Giới sao', 'Phim', 'Nhạc', 'Thời trang']
  },
  {
    name: 'Thế giới',
    slug: 'the-gioi',
    urlSubstr: '/the-gioi',
    expectedKeywords: ['Thế giới', 'Tư liệu', 'Phân tích', 'Người Việt 5 châu']
  }
];

async function runVnExpressExploratorySuite() {
  console.log('🚀 [QA Pilot] Khởi động kiểm thử toàn diện trên VnExpress.net (5 Chuyên Mục Chính)...');

  // 1. Configure Model & Token Tracker (Tự động phát hiện Model được chọn trong IDE UI)
  modelConfigManager.detectAndConfigureProvider();
  modelConfigManager.resetUsage();

  // 2. Initialize QA Session
  const session = reportManager.createSession({
    name: 'VnExpress Portal',
    baseUrl: 'https://vnexpress.net',
    isProduction: true,
    allowedDomains: ['vnexpress.net'],
    blockedActions: [],
    secrets: {}
  }, 'headed');

  console.log(`📋 Session ID: ${session.sessionId}`);
  console.log(`📁 Thư mục báo cáo: ${session.reportDir}`);

  // 3. Launch Headed Browser
  console.log('🌐 Đang khởi động Google Chrome...');
  await browserManager.launch({
    headless: false
  });

  const page = browserManager.getPage();
  if (!page) {
    throw new Error('Không thể khởi tạo browser page');
  }

  // 4. Attach Triple-Oracle Watcher
  oracleWatcher.attach(page);

  // Helper for tracking steps
  let stepIndex = 0;
  async function recordStep(
    type: StepType,
    instruction: string,
    screenshotName: string,
    fn: () => Promise<void>
  ) {
    stepIndex++;
    const startTime = Date.now();
    let status: 'passed' | 'failed' | 'warning' = 'passed';
    let errorMessage: string | undefined;

    console.log(`\n▶️ Bước ${stepIndex}: ${instruction}`);

    // Estimate contextual tokens for the agent turn
    modelConfigManager.recordTurnEstimation(
      `Thực hiện kiểm thử: ${instruction} trên VnExpress. Xác thực DOM, Triple-Oracle network/console và chụp màn hình.`,
      `Hoàn thành bước kiểm thử ${instruction}. Trạng thái DOM ổn định, không có blocking errors.`
    );

    try {
      await fn();
    } catch (err: any) {
      status = 'failed';
      errorMessage = err.message || String(err);
      console.error(`❌ Thất bại: ${errorMessage}`);
    }

    const durationMs = Date.now() - startTime;
    const screenshotPath = path.join(session.reportDir, screenshotName);

    try {
      await page!.screenshot({ path: screenshotPath, fullPage: false });
    } catch (ssErr) {
      console.warn('Không thể chụp screenshot:', ssErr);
    }

    reportManager.addStep({
      stepIndex,
      type,
      instruction,
      status,
      durationMs,
      errorMessage,
      screenshotAfter: screenshotPath
    });

    console.log(`✔️ [${status.toUpperCase()}] trong ${durationMs}ms`);
  }

  try {
    // ----------------------------------------------------
    // Bước 1: Mở trang chủ VnExpress
    // ----------------------------------------------------
    await recordStep('navigate', 'Mở trang chủ https://vnexpress.net và chờ tải xong', '01-homepage.png', async () => {
      await page.goto('https://vnexpress.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      const title = await page.title();
      console.log(`   Tiêu đề trang chủ: "${title}"`);
      if (!title.toLowerCase().includes('vnexpress')) {
        throw new Error(`Tiêu đề không chứa VnExpress: ${title}`);
      }
    });

    // ----------------------------------------------------
    // Bước 2 - 6: Kiểm tra 5 Category thông dụng nhất
    // ----------------------------------------------------
    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i];
      const stepNum = i + 2;
      const stepImg = `0${stepNum}-category-${cat.slug}.png`;

      await recordStep(
        'act',
        `Điều hướng & kiểm tra chuyên mục "${cat.name}" (${cat.urlSubstr})`,
        stepImg,
        async () => {
          console.log(`   Đang tìm link chuyên mục "${cat.name}"...`);

          // Tìm và click link theo href hoặc text trên menu bar
          const linkLocator = page.locator(`header a[href*="${cat.urlSubstr}"], nav a[href*="${cat.urlSubstr}"], a[title="${cat.name}"]`).first();
          
          if (await linkLocator.isVisible({ timeout: 4000 }).catch(() => false)) {
            await linkLocator.click();
          } else {
            console.log(`   Dùng navigation trực tiếp đến https://vnexpress.net${cat.urlSubstr}`);
            await page.goto(`https://vnexpress.net${cat.urlSubstr}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
          }

          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(2000);

          const currentUrl = page.url();
          console.log(`   URL hiện tại: ${currentUrl}`);

          // Assert URL matches category
          if (!currentUrl.includes(cat.slug)) {
            throw new Error(`URL không chứa slug "${cat.slug}": ${currentUrl}`);
          }

          // Kiểm tra số lượng bài viết hiển thị trên chuyên mục
          const articleCount = await page.locator('article, .item-news, .has-header').count();
          console.log(`   Số lượng bài viết tìm thấy trong chuyên mục ${cat.name}: ${articleCount}`);
          if (articleCount === 0) {
            throw new Error(`Không tìm thấy bài viết nào hiển thị trong chuyên mục ${cat.name}`);
          }
        }
      );
    }

    // ----------------------------------------------------
    // Bước 7: Thao tác sâu - Mở chi tiết 1 bài báo
    // ----------------------------------------------------
    await recordStep(
      'inspect',
      'Kiểm thử chi tiết bài viết: Bấm vào bài báo đầu tiên và kiểm tra cấu trúc tiêu đề, nội dung & tác giả',
      '07-article-detail.png',
      async () => {
        // Tìm headline article đầu tiên
        const firstArticleLink = page.locator('article h2 a, article h3 a, .item-news h3 a, .title-news a').first();
        const articleTitle = (await firstArticleLink.textContent())?.trim() || 'Bài báo';
        console.log(`   Bấm vào bài viết: "${articleTitle}"`);

        await firstArticleLink.click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2500);

        const currentArticleUrl = page.url();
        console.log(`   Đã mở chi tiết bài viết: ${currentArticleUrl}`);

        // Kiểm tra phần tử tiêu đề và nội dung bài viết
        const titleVisible = await page.locator('.title-detail, h1.title-news').first().isVisible().catch(() => false);
        const contentVisible = await page.locator('.fck_detail, article.fck_detail, .sidebar-1').first().isVisible().catch(() => false);

        console.log(`   Tiêu đề bài viết hiển thị: ${titleVisible}, Nội dung bài viết hiển thị: ${contentVisible}`);
        if (!titleVisible) {
          throw new Error('Không hiển thị phần tử tiêu đề bài báo (.title-detail)');
        }
      }
    );

    // ----------------------------------------------------
    // Bước 8: Kiểm tra Triple-Oracle & Ghi nhận chẩn đoán
    // ----------------------------------------------------
    await recordStep(
      'assert',
      'Phân tích Triple-Oracle: Quét console exceptions, lỗi network 4xx/5xx và cảnh báo bảo mật',
      '08-oracle-audit.png',
      async () => {
        const issues = oracleWatcher.getAllIssues();
        console.log(`   Tổng số vấn đề phát hiện ngầm qua Triple-Oracle: ${issues.length}`);
        
        const errorIssues = issues.filter(i => i.type === 'console_error' || i.type === 'js_exception' || i.type === 'http_server_error');
        const warningIssues = issues.filter(i => i.type === 'network_failure');

        console.log(`   - Lỗi nghiêm trọng (JS exception / 5xx): ${errorIssues.length}`);
        console.log(`   - Cảnh báo (Network failure / Ads / Tracking): ${warningIssues.length}`);
      }
    );

    // ----------------------------------------------------
    // Xuất Playwright Test Suite
    // ----------------------------------------------------
    const playwrightSpecContent = `import { test, expect } from '@playwright/test';

test.describe('VnExpress News Portal - 5 Main Categories Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Open homepage
    await page.goto('https://vnexpress.net', { waitUntil: 'domcontentloaded' });
  });

  test('TC01: Verify VnExpress Homepage Title & Branding', async ({ page }) => {
    await expect(page).toHaveTitle(/VnExpress/i);
  });

  const categories = [
    { name: 'Thời sự', slug: '/thoi-su' },
    { name: 'Kinh doanh', slug: '/kinh-doanh' },
    { name: 'Thể thao', slug: '/the-thao' },
    { name: 'Giải trí', slug: '/giai-tri' },
    { name: 'Thế giới', slug: '/the-gioi' }
  ];

  for (const cat of categories) {
    test(\`TC: Navigate and assert Category \${cat.name}\`, async ({ page }) => {
      // Find and click category link
      const link = page.locator(\`header a[href*="\${cat.slug}"], nav a[href*="\${cat.slug}"]\`).first();
      await link.click();
      
      await expect(page).toHaveURL(new RegExp(cat.slug));
      
      // Ensure at least 3 article headlines are rendered
      const articles = page.locator('article, .item-news');
      await expect(articles.first()).toBeVisible();
      const count = await articles.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  }

  test('TC07: Deep Drill-down into Headline Article', async ({ page }) => {
    const headline = page.locator('article h2 a, article h3 a, .title-news a').first();
    await expect(headline).toBeVisible();
    await headline.click();

    // Verify detail elements
    await expect(page.locator('.title-detail, h1.title-news').first()).toBeVisible();
  });
});
`;

    const projectRoot = process.cwd();
    const playwrightDir = path.join(projectRoot, 'tests', 'e2e');
    if (!fs.existsSync(playwrightDir)) {
      fs.mkdirSync(playwrightDir, { recursive: true });
    }
    const specPath = path.join(playwrightDir, 'vnexpress-5-categories.spec.ts');
    fs.writeFileSync(specPath, playwrightSpecContent, 'utf8');
    reportManager.setPlaywrightSpec(playwrightSpecContent);
    console.log(`\n💾 Đã tự động xuất Playwright test script tại: ${specPath}`);

  } finally {
    // Generate Final HTML Report
    const reportPath = reportManager.generateHtmlReport();
    console.log(`\n📊 Báo cáo kiểm thử HTML hoàn tất tại:`);
    console.log(`   👉 ${reportPath}`);
    console.log(`   👉 ${path.join(process.cwd(), 'tests', 'runs', 'latest.html')}`);

    const stats = modelConfigManager.getUsageStats();
    console.log(`\n⚡ Thống kê Token & Chi Phí:`);
    console.log(`   - Model: ${stats.modelName} (${stats.provider})`);
    console.log(`   - Input Tokens: ${stats.inputTokens.toLocaleString()}`);
    console.log(`   - Output Tokens: ${stats.outputTokens.toLocaleString()}`);
    console.log(`   - Tổng Tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`   - Chi phí ước tính: $${stats.estimatedCostUsd.toFixed(5)} USD`);

    // Clean up browser
    console.log('\n🧹 Dọn dẹp trình duyệt...');
    await browserManager.close();
    console.log('✅ Hoàn thành quy trình kiểm thử!');
  }
}

runVnExpressExploratorySuite().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
