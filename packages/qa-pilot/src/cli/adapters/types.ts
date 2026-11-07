/**
 * Types and interfaces for the Multi-Coding-Agent Adapter system.
 */

export type CodingAgentId =
  | 'antigravity'
  | 'cursor'
  | 'claude'
  | 'windsurf'
  | 'copilot'
  | 'cline'
  | 'continue'
  | 'aider'
  | 'openhands'
  | 'gemini';

export interface AgentAdapter {
  id: CodingAgentId;
  name: string;
  description: string;
  targetRelativePath: string;
  strategy: 'standalone' | 'append_or_merge';
  detect(targetDir: string): Promise<boolean>;
  generateContent(targetDir: string): string;
}

export interface AdapterResult {
  agentId: CodingAgentId;
  agentName: string;
  targetPath: string;
  action: 'created' | 'merged' | 'skipped' | 'dry_run';
  error?: string;
}

