import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { suiteManager } from './engine/suiteManager.js';
import { suiteGenerator } from './engine/suiteGenerator.js';
import { suiteRunner } from './engine/suiteRunner.js';
import { suiteExporter } from './engine/suiteExporter.js';
import { handleGenerateSuite } from './tools/suiteGenerate.js';
import { handleListSuites } from './tools/suiteList.js';
import { handleRunSuite } from './tools/suiteRun.js';
import { handleGetSuiteReport } from './tools/suiteReport.js';
import { handleExportSuite } from './tools/suiteExport.js';
import { browserManager } from './engine/browserManager.js';

async function runSuiteManagementVerification() {
  console.log('=== QA Pilot Feature 006: Test Suite Management Verification ===\n');

  // Scenario 1: AI Full-Suite Generation
  console.log('[Scenario 1] AI Generating full test suite for auth module...');
  const genRes = await handleGenerateSuite({
    module: 'auth',
    suiteId: 'auth-register',
    url: 'https://demo.automationtesting.in/Register.html',
    tags: ['smoke', 'regression', 'p1'],
    prompt: 'Kiểm thử đăng ký thành viên mới trên form demo',
  });
  console.log('Generate result:\n', genRes.content[0].text);

  const suitePath = suiteManager.getSuitePath('auth', 'auth-register');
  assert.ok(fs.existsSync(suitePath), `File suite ${suitePath} phải tồn tại`);

  const suite = await suiteManager.loadSuite('auth-register', 'auth');
  assert.strictEqual(suite.module, 'auth');
  assert.strictEqual(suite.id, 'auth-register');
  assert.ok(suite.cases.length >= 6, `Suite phải có ít nhất 6 test cases (thực tế: ${suite.cases.length})`);

  // Kiểm tra 4 nhóm heuristic bắt buộc
  const caseTypes = new Set(suite.cases.map((c) => c.type));
  assert.ok(caseTypes.has('happy_path'), 'Phải có ca kiểm thử happy_path');
  assert.ok(caseTypes.has('negative_validation'), 'Phải có ca kiểm thử negative_validation');
  assert.ok(caseTypes.has('boundary_value'), 'Phải có ca kiểm thử boundary_value');
  assert.ok(caseTypes.has('security_probe'), 'Phải có ca kiểm thử security_probe');
  console.log('✓ Scenario 1 verified: All 4 heuristic categories present in generated YAML suite');

  // Scenario 2: Suite Management & Cataloging
  console.log('\n[Scenario 2] Cataloging suites across modules...');
  const listRes = await handleListSuites({});
  console.log('List result:\n', listRes.content[0].text);

  const summaries = await suiteManager.listSuites();
  assert.ok(
    summaries.some((s) => s.id === 'auth-register'),
    'auth-register phải xuất hiện trong danh sách suites'
  );
  console.log('✓ Scenario 2 verified: Suite catalog discovered');

  // Scenario 3: Selective Tagged Suite Execution (@smoke)
  console.log('\n[Scenario 3] Running filtered suite with tag @smoke in headless mode...');
  const runRes = await handleRunSuite({
    suiteId: 'auth-register',
    filterTags: ['smoke'],
    headless: true,
  });
  console.log('Run result:\n', runRes.content[0].text);

  const latestRun = suiteRunner.getLatestRun();
  assert.ok(latestRun, 'Phải có latestRun');
  assert.ok(latestRun.passedCases > 0, 'Phải có ít nhất 1 case pass');
  assert.ok(latestRun.skippedCases > 0, 'Phải có các case non-smoke bị skipped');
  console.log(`✓ Scenario 3 verified: ${latestRun.passedCases} passed, ${latestRun.skippedCases} skipped`);

  // Scenario 4: Aggregated Suite Visual Report
  console.log('\n[Scenario 4] Verifying aggregated visual report...');
  const reportRes = await handleGetSuiteReport();
  console.log('Report result:\n', reportRes.content[0].text);

  assert.ok(fs.existsSync(latestRun.reportPath), `File report ${latestRun.reportPath} phải tồn tại`);
  const reportHtml = fs.readFileSync(latestRun.reportPath, 'utf8');
  assert.ok(reportHtml.includes('Suite Report'), 'Report HTML phải chứa tiêu đề Suite Report');
  assert.ok(reportHtml.includes('Pass Rate'), 'Report HTML phải chứa KPI Pass Rate');
  assert.ok(reportHtml.includes('TC-AUTH-001'), 'Report HTML phải hiển thị mã test case');
  console.log('✓ Scenario 4 verified: Standalone visual report generated correctly');

  // Scenario 5: Bidirectional Playwright Export
  console.log('\n[Scenario 5] Exporting suite to Playwright TypeScript spec...');
  const exportRes = await handleExportSuite({
    suiteId: 'auth-register',
    format: 'playwright',
  });
  console.log('Export result:\n', exportRes.content[0].text);

  const exportPath = path.resolve(process.cwd(), 'tests', 'e2e', 'auth', 'auth-register.spec.ts');
  assert.ok(fs.existsSync(exportPath), `File export ${exportPath} phải tồn tại`);
  const specCode = fs.readFileSync(exportPath, 'utf8');
  assert.ok(specCode.includes("import { test, expect } from '@playwright/test';"), 'Phải chứa Playwright import');
  assert.ok(specCode.includes('test.describe'), 'Phải chứa test.describe');
  assert.ok(specCode.includes('TC-AUTH-001'), 'Phải chứa test cases');
  console.log('✓ Scenario 5 verified: Standalone Playwright spec exported');

  // Cleanup browser
  await browserManager.close();

  console.log('\n=== ALL 5 TEST SUITE MANAGEMENT SCENARIOS PASSED SUCCESSFULLY ===');
}

runSuiteManagementVerification().catch((err) => {
  console.error('Lỗi kiểm thử verify-suite-management:', err);
  process.exit(1);
});

