import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileExists, writeFileSafe } from './fileSystem.js';

export interface McpServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  autoApprove?: string[];
}

export interface McpJsonConfig {
  mcpServers: Record<string, McpServerEntry>;
  [key: string]: unknown;
}

export interface MergeMcpOptions {
  dryRun?: boolean;
  force?: boolean;
  customServerPath?: string;
}

export async function mergeMcpConfig(
  targetDir: string,
  options: MergeMcpOptions = {}
): Promise<{ updated: boolean; filePath: string; config: McpJsonConfig }> {
  const mcpFilePath = path.join(targetDir, '.mcp.json');
  let currentConfig: McpJsonConfig = { mcpServers: {} };

  const exists = await fileExists(mcpFilePath);
  if (exists) {
    try {
      const raw = await fs.readFile(mcpFilePath, 'utf-8');
      currentConfig = JSON.parse(raw);
      if (!currentConfig.mcpServers || typeof currentConfig.mcpServers !== 'object') {
        currentConfig.mcpServers = {};
      }
    } catch (e: any) {
      throw new Error(`Tệp .mcp.json hiện có không phải JSON hợp lệ: ${e.message}`);
    }
  }

  // Determine server entrypoint
  const serverPath = options.customServerPath || 'node_modules/qa-pilot/packages/mcp-server/dist/index.js';

  currentConfig.mcpServers['qa-pilot'] = {
    command: 'node',
    args: [serverPath],
    env: {
      NODE_ENV: 'test'
    }
  };

  const formattedJson = JSON.stringify(currentConfig, null, 2) + '\n';

  if (!options.dryRun) {
    if (exists) {
      // Create backup
      const backupPath = path.join(targetDir, '.mcp.json.bak');
      const original = await fs.readFile(mcpFilePath, 'utf-8');
      await fs.writeFile(backupPath, original, 'utf-8');
    }
    await fs.writeFile(mcpFilePath, formattedJson, 'utf-8');
  }

  return {
    updated: true,
    filePath: mcpFilePath,
    config: currentConfig
  };
}

