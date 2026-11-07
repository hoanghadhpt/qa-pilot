#!/usr/bin/env node

/**
 * QA Pilot CLI Entrypoint
 * Usage: npx qa-pilot init [targetDir] [options]
 */

import { runCli } from '../dist/commands/init.js';

runCli(process.argv.slice(2)).catch((err) => {
  console.error('[qa-pilot] Lỗi thực thi CLI:', err.message || err);
  process.exit(1);
});

