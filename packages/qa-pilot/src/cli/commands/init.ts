import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ensureDir, writeFileSafe, copyDirectoryRecursive, fileExists } from '../utils/fileSystem.js';
import { mergeMcpConfig } from '../utils/mergeMcp.js';
import {
  PLAYWRIGHT_CONFIG_TEMPLATE,
  BASE_PAGE_TEMPLATE,
  TEST_FIXTURE_TEMPLATE,
  GITKEEP_CONTENT
} from '../templates/seedAssets.js';
import {
  resolveTargetAdapters,
  executeAdapters,
  listSupportedAgents
} from '../adapters/index.js';

export interface CliOptions {
  targetDir: string;
  dryRun: boolean;
  force: boolean;
  skillOnly: boolean;
  mcpOnly: boolean;
  skipScaffold: boolean;
  customMcpPath?: string;
  agents?: string[];
  listAgents?: boolean;
}

export function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    targetDir: '.',
    dryRun: false,
    force: false,
    skillOnly: false,
    mcpOnly: false,
    skipScaffold: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--skill-only') {
      options.skillOnly = true;
    } else if (arg === '--mcp-only') {
      options.mcpOnly = true;
    } else if (arg === '--skip-scaffold') {
      options.skipScaffold = true;
    } else if (arg === '--mcp-path') {
      options.customMcpPath = args[++i];
    } else if (arg === '--list-agents') {
      options.listAgents = true;
    } else if (arg === '--agent' || arg.startsWith('--agent=')) {
      options.agents = options.agents || [];
      if (arg.startsWith('--agent=')) {
        options.agents.push(arg.slice('--agent='.length));
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options.agents.push(args[++i]);
      }
    } else if (!arg.startsWith('-') && options.targetDir === '.') {
      options.targetDir = arg;
    }
  }

  return options;
}

/**
 * Locate the source .agents/skills/qa-pilot directory
 */
export async function resolveSkillSourceDir(): Promise<string> {
  // Try relative to this file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const candidates = [
    // Monorepo root relative
    path.resolve(__dirname, '../../../../../.agents/skills/qa-pilot'),
    path.resolve(__dirname, '../../../../.agents/skills/qa-pilot'),
    // Package root relative (installed package has assets/skills/qa-pilot)
    path.resolve(__dirname, '../../../assets/skills/qa-pilot'),
    path.resolve(__dirname, '../../assets/skills/qa-pilot'),
    path.resolve(process.cwd(), '.agents/skills/qa-pilot')
  ];

  for (const cand of candidates) {
    if (await fileExists(cand)) {
      return cand;
    }
  }

  throw new Error('Không tìm thấy thư mục nguồn cho Skill qa-pilot. Vui lòng kiểm tra cài đặt gói.');
}

export async function runCli(rawArgs: string[]): Promise<number> {
  const args = rawArgs[0] === 'init' ? rawArgs.slice(1) : rawArgs;
  const options = parseCliArgs(args);
  const targetDir = path.resolve(process.cwd(), options.targetDir);

  if (options.listAgents) {
    const list = await listSupportedAgents(targetDir);
    console.log(list);
    return 0;
  }

  const modePrefix = options.dryRun ? '[DRY RUN] ' : '';
  console.log(`${modePrefix}Bắt đầu khởi tạo môi trường QA Pilot tại: ${targetDir}`);

  if (options.skillOnly && options.mcpOnly) {
    console.error('Lỗi: Không thể kết hợp đồng thời --skill-only và --mcp-only.');
    return 1;
  }

  await ensureDir(targetDir, options.dryRun);

  const summary = {
    skillsInstalled: false,
    adaptersCount: 0,
    mcpConfigured: false,
    scaffoldCreated: false,
    filesAffected: [] as string[]
  };

  // 1. Install Skill Layer & Coding Agent Adapters
  if (!options.mcpOnly) {
    let targetAdapters;
    try {
      targetAdapters = await resolveTargetAdapters(targetDir, options.agents);
    } catch (err: any) {
      console.error(`Lỗi: ${err.message}`);
      return 1;
    }

    // A. Antigravity Skill installation
    if (targetAdapters.some((a) => a.id === 'antigravity')) {
      try {
        const skillSrc = await resolveSkillSourceDir();
        const skillDest = path.join(targetDir, '.agents/skills/qa-pilot');
        console.log(`${modePrefix}- Cài đặt Skill vào: .agents/skills/qa-pilot/`);
        const copied = await copyDirectoryRecursive(skillSrc, skillDest, {
          dryRun: options.dryRun,
          force: options.force
        });
        summary.skillsInstalled = true;
        summary.filesAffected.push(...copied);
      } catch (err: any) {
        console.warn(`Cảnh báo: Không thể sao chép thư mục skill: ${err.message}`);
      }
    }

    // B. Other Agent Adapters (Cursor, Claude, Copilot, Windsurf, Cline, Continue, Aider, OpenHands, Gemini)
    const otherAdapters = targetAdapters.filter((a) => a.id !== 'antigravity');
    if (otherAdapters.length > 0) {
      console.log(
        `${modePrefix}- Thiết lập quy tắc cho ${otherAdapters.length} coding agent (${otherAdapters.map((a) => a.name).join(', ')})`
      );
      const adapterResults = await executeAdapters(targetDir, otherAdapters, {
        dryRun: options.dryRun,
        force: options.force
      });

      for (const res of adapterResults) {
        if (res.action !== 'skipped') {
          summary.filesAffected.push(res.targetPath);
          summary.adaptersCount++;
        }
        console.log(
          `  [${res.agentId}] -> ${path.relative(targetDir, res.targetPath)} (${res.action})`
        );
      }
    }
  }

  // 2. Configure MCP Server (.mcp.json)
  if (!options.skillOnly) {
    console.log(`${modePrefix}- Hợp nhất cấu hình .mcp.json`);
    const mcpRes = await mergeMcpConfig(targetDir, {
      dryRun: options.dryRun,
      force: options.force,
      customServerPath: options.customMcpPath
    });
    summary.mcpConfigured = mcpRes.updated;
    summary.filesAffected.push(mcpRes.filePath);
  }

  // 3. Scaffold Playwright Framework Structure
  if (!options.skillOnly && !options.mcpOnly && !options.skipScaffold) {
    console.log(`${modePrefix}- Khởi tạo khung kiểm thử Playwright (tests/)`);

    const configPath = path.join(targetDir, 'playwright.config.ts');
    const configRes = await writeFileSafe(configPath, PLAYWRIGHT_CONFIG_TEMPLATE, {
      dryRun: options.dryRun,
      force: options.force
    });
    if (configRes.written) summary.filesAffected.push(configPath);

    const fixturePath = path.join(targetDir, 'tests/fixtures/test.fixture.ts');
    const fixtureRes = await writeFileSafe(fixturePath, TEST_FIXTURE_TEMPLATE, {
      dryRun: options.dryRun,
      force: options.force
    });
    if (fixtureRes.written) summary.filesAffected.push(fixturePath);

    const basePath = path.join(targetDir, 'tests/pages/base.page.ts');
    const baseRes = await writeFileSafe(basePath, BASE_PAGE_TEMPLATE, {
      dryRun: options.dryRun,
      force: options.force
    });
    if (baseRes.written) summary.filesAffected.push(basePath);

    // Ensure test directories exist
    const subDirs = ['tests/e2e', 'tests/suites', 'tests/fixtures/auth'];
    for (const sub of subDirs) {
      const fullSub = path.join(targetDir, sub);
      await ensureDir(fullSub, options.dryRun);
      const keepPath = path.join(fullSub, '.gitkeep');
      await writeFileSafe(keepPath, GITKEEP_CONTENT, {
        dryRun: options.dryRun,
        force: false
      });
    }

    summary.scaffoldCreated = true;
  }

  console.log(`\n${modePrefix}Khởi tạo hoàn tất:`);
  console.log(`  - Tầng Skill (.agents/skills/qa-pilot): ${summary.skillsInstalled ? 'Đã cài đặt' : 'Bỏ qua'}`);
  console.log(`  - Quy tắc Coding Agent đã tạo/cập nhật: ${summary.adaptersCount} adapter`);
  console.log(`  - Tầng MCP Server (.mcp.json)         : ${summary.mcpConfigured ? 'Đã cấu hình' : 'Bỏ qua'}`);
  console.log(`  - Khung Playwright E2E (tests/)       : ${summary.scaffoldCreated ? 'Đã khởi tạo' : 'Bỏ qua'}`);
  if (options.dryRun) {
    console.log(`\n[DRY RUN] Không có thay đổi nào được ghi vào đĩa.`);
  }

  return 0;
}
