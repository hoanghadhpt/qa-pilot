import * as path from 'node:path';
import { AGENT_ADAPTERS } from './definitions.js';
import { AgentAdapter, AdapterResult, CodingAgentId } from './types.js';
import { mergeDelimiterBlock } from './mergeUtil.js';
import { writeFileSafe, ensureDir } from '../utils/fileSystem.js';

export * from './types.js';
export * from './definitions.js';
export * from './mergeUtil.js';

export function getAllAdapters(): AgentAdapter[] {
  return AGENT_ADAPTERS;
}

export function getAdapterById(id: string): AgentAdapter | undefined {
  return AGENT_ADAPTERS.find((a) => a.id.toLowerCase() === id.toLowerCase());
}

/**
 * Resolve which adapters should be generated based on user input or auto-detection.
 */
export async function resolveTargetAdapters(
  targetDir: string,
  agentArgs?: string[]
): Promise<AgentAdapter[]> {
  // If user specified 'all'
  if (agentArgs && agentArgs.some((arg) => arg.toLowerCase() === 'all')) {
    return AGENT_ADAPTERS;
  }

  // If user explicitly specified one or more agents
  if (agentArgs && agentArgs.length > 0) {
    const selected: AgentAdapter[] = [];
    const invalid: string[] = [];

    for (const arg of agentArgs) {
      const parts = arg.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
      for (const part of parts) {
        if (part === 'all') {
          return AGENT_ADAPTERS;
        }
        const found = getAdapterById(part);
        if (found) {
          if (!selected.some((s) => s.id === found.id)) {
            selected.push(found);
          }
        } else {
          invalid.push(part);
        }
      }
    }

    if (invalid.length > 0) {
      const validIds = AGENT_ADAPTERS.map((a) => a.id).join(', ');
      throw new Error(
        `Coding agent không hợp lệ: "${invalid.join(', ')}". Các agent được hỗ trợ: ${validIds}, all`
      );
    }

    return selected;
  }

  // Default auto-detection mode: Antigravity + detected assistants in targetDir
  const resolved: AgentAdapter[] = [];
  const antigravity = getAdapterById('antigravity');
  if (antigravity) {
    resolved.push(antigravity);
  }

  for (const adapter of AGENT_ADAPTERS) {
    if (adapter.id === 'antigravity') continue;
    try {
      const detected = await adapter.detect(targetDir);
      if (detected) {
        resolved.push(adapter);
      }
    } catch {
      // Ignore detection errors
    }
  }

  return resolved;
}

/**
 * Execute generation or merging of adapter files.
 */
export async function executeAdapters(
  targetDir: string,
  adapters: AgentAdapter[],
  options: { dryRun?: boolean; force?: boolean } = {}
): Promise<AdapterResult[]> {
  const results: AdapterResult[] = [];

  for (const adapter of adapters) {
    // Antigravity is handled separately by copying the full skill assets directory
    if (adapter.id === 'antigravity') {
      continue;
    }

    const targetPath = path.join(targetDir, adapter.targetRelativePath);
    try {
      const content = adapter.generateContent(targetDir);

      if (adapter.strategy === 'append_or_merge') {
        const mergeRes = await mergeDelimiterBlock(targetPath, content, options);
        results.push({
          agentId: adapter.id,
          agentName: adapter.name,
          targetPath,
          action: mergeRes.action
        });
      } else {
        // Standalone file
        await ensureDir(path.dirname(targetPath), options.dryRun);
        const writeRes = await writeFileSafe(targetPath, content, {
          dryRun: options.dryRun,
          force: options.force
        });
        results.push({
          agentId: adapter.id,
          agentName: adapter.name,
          targetPath,
          action: options.dryRun
            ? 'dry_run'
            : writeRes.written
            ? 'created'
            : 'skipped'
        });
      }
    } catch (err: any) {
      results.push({
        agentId: adapter.id,
        agentName: adapter.name,
        targetPath,
        action: 'skipped',
        error: err.message
      });
    }
  }

  return results;
}

/**
 * Produce a formatted list of all supported coding agents.
 */
export async function listSupportedAgents(targetDir?: string): Promise<string> {
  const lines: string[] = [];
  lines.push('Supported Coding Agents (10 total):');
  lines.push('--------------------------------------------------------------------------------------');
  lines.push('ID           Name                  Target File Path                     Strategy');
  lines.push('--------------------------------------------------------------------------------------');

  for (const a of AGENT_ADAPTERS) {
    let detectedStr = '';
    if (targetDir) {
      try {
        const detected = await a.detect(targetDir);
        if (detected) detectedStr = ' [DETECTED]';
      } catch {
        // ignore
      }
    }
    const idPad = a.id.padEnd(12, ' ');
    const namePad = a.name.padEnd(22, ' ');
    const pathPad = a.targetRelativePath.padEnd(37, ' ');
    lines.push(`${idPad} ${namePad} ${pathPad} ${a.strategy}${detectedStr}`);
  }

  lines.push('--------------------------------------------------------------------------------------');
  lines.push('Usage:');
  lines.push('  npx qa-pilot init --agent all');
  lines.push('  npx qa-pilot init --agent cursor,claude,copilot');

  return lines.join('\n');
}
