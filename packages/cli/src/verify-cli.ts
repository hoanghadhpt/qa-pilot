/**
 * Verification Suite for QA Pilot CLI Distribution Layer
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { runCli } from './commands/init.js';
import { fileExists } from './utils/fileSystem.js';

async function createTempDir(prefix: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), `qa-pilot-test-${prefix}-`));
}

async function runAllVerifications() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TÍCH HỢP CHO QA-PILOT CLI ===\n');
  let passedCount = 0;
  let totalCount = 0;

  async function assertTest(name: string, fn: () => Promise<void>) {
    totalCount++;
    try {
      await fn();
      console.log(`[PASS] Kịch bản ${totalCount}: ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`[FAIL] Kịch bản ${totalCount}: ${name}`);
      console.error(`       Chi tiết: ${err.message}`);
    }
  }

  // Kịch bản 1: Dry run không ghi vào đĩa
  await assertTest('Kiểm tra chế độ --dry-run không ghi dữ liệu', async () => {
    const tmp = await createTempDir('dry-run');
    try {
      const exitCode = await runCli(['init', tmp, '--dry-run']);
      if (exitCode !== 0) throw new Error(`Exit code không phải 0: ${exitCode}`);

      const files = await fs.readdir(tmp);
      if (files.length > 0) {
        throw new Error(`Thư mục tạm có chứa file sau dry run: ${files.join(', ')}`);
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  // Kịch bản 2: Khởi tạo đầy đủ (Full Initialization)
  await assertTest('Khởi tạo trọn gói Skill + MCP + Playwright Scaffolding', async () => {
    const tmp = await createTempDir('full-init');
    try {
      const exitCode = await runCli(['init', tmp]);
      if (exitCode !== 0) throw new Error(`Exit code không phải 0: ${exitCode}`);

      const hasSkill = await fileExists(path.join(tmp, '.agents/skills/qa-pilot/SKILL.md'));
      const hasPayloads = await fileExists(path.join(tmp, '.agents/skills/qa-pilot/data/payloads/naughty-strings.json'));
      const hasSearchScript = await fileExists(path.join(tmp, '.agents/skills/qa-pilot/scripts/search-heuristics.js'));
      const hasMcp = await fileExists(path.join(tmp, '.mcp.json'));
      const hasPlaywrightConfig = await fileExists(path.join(tmp, 'playwright.config.ts'));
      const hasBasePage = await fileExists(path.join(tmp, 'tests/pages/base.page.ts'));

      if (!hasSkill) throw new Error('Thiếu SKILL.md');
      if (!hasPayloads) throw new Error('Thiếu naughty-strings.json');
      if (!hasSearchScript) throw new Error('Thiếu search-heuristics.js');
      if (!hasMcp) throw new Error('Thiếu .mcp.json');
      if (!hasPlaywrightConfig) throw new Error('Thiếu playwright.config.ts');
      if (!hasBasePage) throw new Error('Thiếu base.page.ts');

      const mcpRaw = await fs.readFile(path.join(tmp, '.mcp.json'), 'utf-8');
      const mcpConfig = JSON.parse(mcpRaw);
      if (!mcpConfig.mcpServers || !mcpConfig.mcpServers['qa-pilot']) {
        throw new Error('.mcp.json không chứa key "qa-pilot"');
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  // Kịch bản 3: Hợp nhất an toàn .mcp.json hiện hữu (Safe Merge)
  await assertTest('Hợp nhất .mcp.json bảo toàn cấu hình server cũ và tạo backup', async () => {
    const tmp = await createTempDir('mcp-merge');
    try {
      const initialMcp = {
        mcpServers: {
          'custom-service': {
            command: 'node',
            args: ['custom.js']
          }
        }
      };
      await fs.writeFile(path.join(tmp, '.mcp.json'), JSON.stringify(initialMcp, null, 2), 'utf-8');

      const exitCode = await runCli(['init', tmp]);
      if (exitCode !== 0) throw new Error(`Exit code không phải 0: ${exitCode}`);

      // Kiểm tra backup
      const hasBak = await fileExists(path.join(tmp, '.mcp.json.bak'));
      if (!hasBak) throw new Error('Không tạo file backup .mcp.json.bak');

      // Kiểm tra cả 2 server đều tồn tại
      const mergedRaw = await fs.readFile(path.join(tmp, '.mcp.json'), 'utf-8');
      const mergedConfig = JSON.parse(mergedRaw);
      if (!mergedConfig.mcpServers['custom-service']) {
        throw new Error('Mất cấu hình "custom-service" sau khi merge');
      }
      if (!mergedConfig.mcpServers['qa-pilot']) {
        throw new Error('Không tìm thấy cấu hình "qa-pilot" sau khi merge');
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  // Kịch bản 4: Cài đặt chọn lọc với cờ --skill-only và --mcp-only
  await assertTest('Tùy chọn --skill-only và --mcp-only hoạt động độc lập', async () => {
    const tmpSkill = await createTempDir('skill-only');
    const tmpMcp = await createTempDir('mcp-only');
    try {
      // 1. Skill only
      await runCli(['init', tmpSkill, '--skill-only']);
      const hasSkill = await fileExists(path.join(tmpSkill, '.agents/skills/qa-pilot/SKILL.md'));
      const hasMcpInSkill = await fileExists(path.join(tmpSkill, '.mcp.json'));
      if (!hasSkill) throw new Error('--skill-only không tạo SKILL.md');
      if (hasMcpInSkill) throw new Error('--skill-only lại tạo .mcp.json');

      // 2. MCP only
      await runCli(['init', tmpMcp, '--mcp-only']);
      const hasMcp = await fileExists(path.join(tmpMcp, '.mcp.json'));
      const hasSkillInMcp = await fileExists(path.join(tmpMcp, '.agents/skills/qa-pilot'));
      if (!hasMcp) throw new Error('--mcp-only không tạo .mcp.json');
      if (hasSkillInMcp) throw new Error('--mcp-only lại tạo .agents/skills/qa-pilot');
    } finally {
      await fs.rm(tmpSkill, { recursive: true, force: true });
      await fs.rm(tmpMcp, { recursive: true, force: true });
    }
  });

  // Kịch bản 5: Xung đột cờ tùy chọn
  await assertTest('Xử lý lỗi khi truyền đồng thời --skill-only và --mcp-only', async () => {
    const tmp = await createTempDir('conflict');
    try {
      const exitCode = await runCli(['init', tmp, '--skill-only', '--mcp-only']);
      if (exitCode === 0) {
        throw new Error('Mong đợi exitCode != 0 khi kết hợp cả 2 cờ loại trừ lẫn nhau');
      }
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  console.log(`\n=== TỔNG KẾT: ${passedCount}/${totalCount} KỊCH BẢN THÀNH CÔNG ===\n`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAllVerifications().catch((err) => {
  console.error('Lỗi thực thi kiểm thử CLI:', err);
  process.exit(1);
});

