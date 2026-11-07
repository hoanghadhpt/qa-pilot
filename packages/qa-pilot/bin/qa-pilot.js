#!/usr/bin/env node

/**
 * QA Pilot Unified CLI & MCP Server Binary
 *
 * Usage:
 *   npx qa-pilot init [options]    -> Scaffold Playwright tests, Agent Skills & Rules
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
QA Pilot (v0.0.4) - Agentic AI Web Testing Platform

Cách dùng:
  qa-pilot init [targetDir] [options]   Khởi tạo Skill/Rules, .mcp.json và khung Playwright
  qa-pilot server                      Khởi động máy chủ MCP Server qua luồng stdio

Tùy chọn cho lệnh init:
  --agent <names>    Tên coding agent (cursor, claude, copilot, windsurf, cline, ...) hoặc 'all'
  --list-agents      Hiển thị danh sách 10 coding agent được hỗ trợ và thoát
  --dry-run          Xem trước các thay đổi dự kiến mà không ghi vào đĩa
  --force, -f        Ghi đè tệp cấu hình nếu đã tồn tại
  --skill-only       Chỉ cài đặt tầng Skill/Rules cho các coding agent
  --mcp-only         Chỉ cấu hình tệp .mcp.json
  --skip-scaffold    Bỏ qua việc tạo khung kiểm thử tests/

Ví dụ:
  npx qa-pilot init --agent all
  npx qa-pilot init --agent cursor,claude,copilot
  npx qa-pilot init --list-agents
  npx -y qa-pilot server
`);
  process.exit(0);
}
