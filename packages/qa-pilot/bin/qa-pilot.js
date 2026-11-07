#!/usr/bin/env node

/**
 * QA Pilot Unified CLI & MCP Server Binary
 *
 * Usage:
 *   npx qa-pilot init [options]    -> Scaffold Playwright tests & .agents/skills/qa-pilot
 *   npx qa-pilot server            -> Launch QA Pilot Model Context Protocol (MCP) Server
 */

import * as path from 'node:path';

const args = process.argv.slice(2);
const invokedBinary = path.basename(process.argv[1] || '');

const isServer =
  invokedBinary === 'qa-pilot-mcp' ||
  args[0] === 'server' ||
  args[0] === 'mcp';

if (isServer) {
  // Launch MCP Server
  import('../dist/index.js').catch((err) => {
    console.error('[qa-pilot] Lỗi khởi động MCP Server:', err);
    process.exit(1);
  });
} else if (args[0] === 'init' || args.length > 0) {
  // Launch CLI Init / Scaffolding
  import('../dist/cli/commands/init.js').then(({ runCli }) => {
    runCli(args).catch((err) => {
      console.error('[qa-pilot] Lỗi thực thi lệnh:', err.message || err);
      process.exit(1);
    });
  }).catch((err) => {
    console.error('[qa-pilot] Lỗi nạp module CLI:', err);
    process.exit(1);
  });
} else {
  console.log(`
QA Pilot (v0.0.2) - Agentic AI Web Testing Platform

Cách dùng:
  qa-pilot init [targetDir] [options]   Khởi tạo Skill, cấu hình .mcp.json và khung Playwright
  qa-pilot server                      Khởi động máy chủ MCP Server qua luồng stdio

Tùy chọn cho lệnh init:
  --dry-run          Xem trước các thay đổi dự kiến mà không ghi vào đĩa
  --force            Ghi đè tệp cấu hình nếu đã tồn tại
  --skill-only       Chỉ cài đặt tầng Skill (.agents/skills/qa-pilot)
  --mcp-only         Chỉ cấu hình tệp .mcp.json
  --skip-scaffold    Bỏ qua việc tạo thư mục tests/ và playwright.config.ts

Ví dụ:
  npx qa-pilot init
  npx qa-pilot init --dry-run
  npx -y qa-pilot server
`);
  process.exit(0);
}

