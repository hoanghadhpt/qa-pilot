import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {
  getAllAdapters,
  resolveTargetAdapters,
  executeAdapters,
  listSupportedAgents,
  mergeDelimiterBlock,
  DELIMITER_START,
  DELIMITER_END
} from './adapters/index.js';
import { fileExists } from './utils/fileSystem.js';

async function main() {
  console.log('=== QA Pilot Multi-Agent Adapters Verification ===\n');
  const tempDir = path.resolve(process.cwd(), '.temp_verify_adapters');

  try {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.mkdir(tempDir, { recursive: true });

    // Test 1: Registry completeness
    console.log('[Test 1] Kiểm tra danh sách 10 coding agent...');
    const allAdapters = getAllAdapters();
    if (allAdapters.length !== 10) {
      throw new Error(`Kỳ vọng 10 adapters nhưng nhận được: ${allAdapters.length}`);
    }
    const expectedIds = [
      'antigravity',
      'cursor',
      'claude',
      'windsurf',
      'copilot',
      'cline',
      'continue',
      'aider',
      'openhands',
      'gemini'
    ];
    for (const id of expectedIds) {
      if (!allAdapters.some((a) => a.id === id)) {
        throw new Error(`Thiếu adapter cho: ${id}`);
      }
    }
    console.log('  -> Pass: Đã đăng ký đủ 10 coding agent.');

    // Test 2: --list-agents output
    console.log('\n[Test 2] Kiểm tra hàm listSupportedAgents()...');
    const listOutput = await listSupportedAgents(tempDir);
    for (const id of expectedIds) {
      if (!listOutput.includes(id)) {
        throw new Error(`listSupportedAgents không chứa id: ${id}`);
      }
    }
    console.log('  -> Pass: Bảng tra cứu hiển thị đầy đủ 10 agent.');

    // Test 3: resolveTargetAdapters with 'all'
    console.log('\n[Test 3] Kiểm tra resolveTargetAdapters(["all"])...');
    const resolvedAll = await resolveTargetAdapters(tempDir, ['all']);
    if (resolvedAll.length !== 10) {
      throw new Error(`Kỳ vọng 10 adapters khi dùng 'all', nhận được: ${resolvedAll.length}`);
    }
    console.log('  -> Pass: Cờ "all" nạp đủ 10 adapters.');

    // Test 4: resolveTargetAdapters with specific list
    console.log('\n[Test 4] Kiểm tra resolveTargetAdapters(["cursor,claude"])...');
    const resolvedSpecific = await resolveTargetAdapters(tempDir, ['cursor,claude']);
    if (resolvedSpecific.length !== 2) {
      throw new Error(`Kỳ vọng 2 adapters, nhận được: ${resolvedSpecific.length}`);
    }
    if (!resolvedSpecific.some((a) => a.id === 'cursor') || !resolvedSpecific.some((a) => a.id === 'claude')) {
      throw new Error('Không khớp cursor hoặc claude');
    }
    console.log('  -> Pass: Khớp đúng danh sách chỉ định.');

    // Test 5: Invalid agent name error
    console.log('\n[Test 5] Kiểm tra validation agent không hợp lệ...');
    let caughtError = false;
    try {
      await resolveTargetAdapters(tempDir, ['unknown_agent']);
    } catch (err: any) {
      caughtError = true;
      if (!err.message.includes('unknown_agent')) {
        throw new Error('Thông báo lỗi không chứa tên agent sai.');
      }
    }
    if (!caughtError) {
      throw new Error('Không quăng lỗi khi truyền agent không tồn tại');
    }
    console.log('  -> Pass: Bắt lỗi chính xác khi nhập agent lạ.');

    // Test 6: Auto-detection
    console.log('\n[Test 6] Kiểm tra cơ chế tự động phát hiện (Auto-detection)...');
    const autoDir = path.join(tempDir, 'autodetect_proj');
    await fs.mkdir(path.join(autoDir, '.cursor'), { recursive: true });
    await fs.mkdir(path.join(autoDir, '.claude'), { recursive: true });

    const autoResolved = await resolveTargetAdapters(autoDir);
    const autoIds = autoResolved.map((a) => a.id);
    if (!autoIds.includes('antigravity') || !autoIds.includes('cursor') || !autoIds.includes('claude')) {
      throw new Error(`Auto-detect thất bại, nhận được: ${autoIds.join(', ')}`);
    }
    console.log(`  -> Pass: Tự động nhận diện được: ${autoIds.join(', ')}`);

    // Test 7: Merge utility (standalone + delimiter replace + append)
    console.log('\n[Test 7] Kiểm tra mergeDelimiterBlock...');
    const sharedFile = path.join(tempDir, 'shared-notes.md');

    // 7A: Create new
    const resA = await mergeDelimiterBlock(sharedFile, '## Section 1\nRule 1');
    if (resA.action !== 'created') throw new Error('Kỳ vọng action created');
    const contentA = await fs.readFile(sharedFile, 'utf-8');
    if (!contentA.includes(DELIMITER_START) || !contentA.includes('Rule 1')) {
      throw new Error('Nội dung file mới không có delimiter');
    }

    // 7B: Replace between delimiters
    const resB = await mergeDelimiterBlock(sharedFile, '## Section 1 Updated\nRule 1 New');
    if (resB.action !== 'merged') throw new Error('Kỳ vọng action merged');
    const contentB = await fs.readFile(sharedFile, 'utf-8');
    if (!contentB.includes('Rule 1 New') || contentB.includes('Rule 1\n')) {
      throw new Error('Không thay thế được nội dung giữa các delimiter');
    }

    // 7C: Make sure delimiters are not duplicated
    const startOccurrences = (contentB.match(new RegExp(DELIMITER_START, 'g')) || []).length;
    if (startOccurrences !== 1) {
      throw new Error(`Bị nhân bản delimiter: ${startOccurrences} lần`);
    }
    console.log('  -> Pass: mergeDelimiterBlock hoạt động chính xác.');

    // Test 8: executeAdapters (dry-run & real write)
    console.log('\n[Test 8] Kiểm tra executeAdapters (Dry-run & Real write)...');
    const execDir = path.join(tempDir, 'exec_proj');
    await fs.mkdir(execDir, { recursive: true });

    const adaptersToExec = resolvedAll.filter((a) => a.id !== 'antigravity');

    // 8A: Dry run
    const dryResults = await executeAdapters(execDir, adaptersToExec, { dryRun: true });
    for (const r of dryResults) {
      if (r.action !== 'dry_run') throw new Error(`Dry run thất bại cho ${r.agentId}`);
      const onDisk = await fileExists(r.targetPath);
      if (onDisk) throw new Error(`Dry run không được ghi ra đĩa: ${r.targetPath}`);
    }

    // 8B: Real write
    const realResults = await executeAdapters(execDir, adaptersToExec);
    for (const r of realResults) {
      if (r.action !== 'created') throw new Error(`Real write thất bại cho ${r.agentId}: ${r.action}`);
      const onDisk = await fileExists(r.targetPath);
      if (!onDisk) throw new Error(`File chưa được tạo: ${r.targetPath}`);
    }

    // Verify Cursor rule contents
    const cursorFile = path.join(execDir, '.cursor/rules/qa-pilot.mdc');
    const cursorContent = await fs.readFile(cursorFile, 'utf-8');
    if (!cursorContent.includes('globs: tests/**/*') || !cursorContent.includes('SFDIPOT')) {
      throw new Error('Cursor rule thiếu frontmatter hoặc heuristics');
    }

    // Verify Claude command contents
    const claudeFile = path.join(execDir, '.claude/commands/qa-pilot.md');
    const claudeContent = await fs.readFile(claudeFile, 'utf-8');
    if (!claudeContent.includes('$ARGUMENTS') || !claudeContent.includes('Triple-Oracle')) {
      throw new Error('Claude command thiếu $ARGUMENTS hoặc protocol');
    }

    console.log('  -> Pass: Đã sinh thành công và kiểm tra nội dung tất cả adapter.');

    console.log('\n=== TẤT CẢ CÁC BÀI TEST ADAPTER ĐÃ PASS THÀNH CÔNG (8/8) ===');
    process.exit(0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('\nLỗi khi chạy verify-adapters:', err);
  process.exit(1);
});

