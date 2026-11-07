# Data Model: Multi-Coding-Agent Support (Feature 009)

## Entity Definitions

### 1. `CodingAgent` (Enum / Type)
List of canonical supported agent identifiers:
```typescript
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
```

### 2. `AgentAdapter` (Interface)
Defines how each coding assistant is identified, detected, and provisioned with QA Pilot rules:
```typescript
export interface AgentAdapter {
  id: CodingAgentId;
  name: string;
  description: string;
  targetRelativePath: string;
  strategy: 'standalone' | 'append_or_merge';
  detect(targetDir: string): Promise<boolean>;
  generateContent(targetDir: string): string;
}
```

### 3. `InitOptions` (Extended CLI Options)
```typescript
export interface CliOptions {
  targetDir: string;
  dryRun: boolean;
  force: boolean;
  skillOnly: boolean;
  mcpOnly: boolean;
  skipScaffold: boolean;
  customMcpPath?: string;
  agents?: string[];      // e.g. ['cursor', 'claude'] or ['all']
  listAgents?: boolean;   // if true, displays table and exits 0
}
```

### 4. `AdapterExecutionResult`
```typescript
export interface AdapterExecutionResult {
  agentId: CodingAgentId;
  agentName: string;
  targetPath: string;
  action: 'created' | 'merged' | 'skipped' | 'dry_run';
  error?: string;
}
```

---

## State & Transition Rules
1. **Detection Phase**:
   - For each registered `AgentAdapter`, run `detect(targetDir)`.
   - If user passed `--agent <list>`, override auto-detection and select specified agents (or all if `all`).
   - If user did not pass `--agent`, select `antigravity` + any detected agents.
2. **Generation Phase**:
   - For `standalone` strategy:
     - Check if destination exists.
     - If exists and `!force`, skip and record `action: 'skipped'`.
     - Else write file and record `action: 'created'`.
   - For `append_or_merge` strategy:
     - Read existing file if present.
     - If delimiters `<!-- QA-PILOT-START -->` and `<!-- QA-PILOT-END -->` exist, replace between delimiters.
     - If delimiters absent, append block to EOF.
     - Record `action: 'merged'` or `'created'`.

