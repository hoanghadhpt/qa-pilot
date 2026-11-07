# Data Model: 3-Tier Packaging & CLI Distribution

**Feature**: `008-skill-mcp-distribution`  
**Date**: 2026-11-07  
**Status**: Complete

---

## 1. Entities & Data Structures

### 1.1 CLI Initialization Options (`InitOptions`)
Structure representing user CLI options passed to `qa-pilot init`:

```typescript
export interface InitOptions {
  /** Target project root directory (defaults to process.cwd()) */
  targetDir: string;
  /** Whether to simulate actions without writing to disk */
  dryRun: boolean;
  /** Whether to overwrite existing files without confirmation */
  force: boolean;
  /** Install only .agents/skills/qa-pilot without touching .mcp.json or tests/ */
  skillOnly: boolean;
  /** Configure only .mcp.json without creating skills or test directories */
  mcpOnly: boolean;
  /** Skip scaffolding tests/ directory and playwright.config.ts */
  skipScaffold: boolean;
  /** Custom path to qa-pilot MCP server entry file (defaults to local dist or npx link) */
  mcpPath?: string;
}
```

### 1.2 MCP Server Configuration (`McpJsonConfig`)
Schema representing the standard `.mcp.json` file:

```typescript
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
```

### 1.3 Skill Heuristic Entry (`HeuristicItem`)
Structure of items indexed in `data/heuristics/sfdipot.md` and searchable via `search-heuristics.js`:

```typescript
export interface HeuristicItem {
  id: string;               // e.g. "sfdipot-data-boundary"
  category: "structure" | "function" | "data" | "interfaces" | "platform" | "operations" | "time";
  title: string;            // e.g. "Boundary Value Testing"
  description: string;      // Guidance on how to test this dimension
  recommendedPayloads: string[]; // Related keys in naughty-strings.json
  checklist: string[];      // Verifications for this heuristic
}
```

### 1.4 Naughty String Payload Item (`NaughtyStringItem`)
Structure of payloads in `data/payloads/naughty-strings.json`:

```typescript
export interface NaughtyStringGroup {
  category: "xss" | "sql_injection" | "unicode_accents" | "boundary_lengths" | "whitespace_special" | "file_path_traversal";
  description: string;
  payloads: Array<{
    id: string;
    value: string;
    risk: "low" | "medium" | "high";
    purpose: string;
    expectedValidation: string;
  }>;
}
```

### 1.5 Test Evaluation Checklist (`TestQualityChecklist`)
Structure of quality criteria in `data/checklists/evaluation-checklist.md`:

```typescript
export interface QualityCriterion {
  id: string;               // e.g. "QC-01"
  dimension: "triple_oracle" | "isolation" | "idempotency" | "security_redaction" | "semantic_locators";
  rule: string;
  severity: "blocker" | "warning";
  howToVerify: string;
}
```

---

## 2. Directory Layout & Relationships

```
<project-root>/
├── .agents/skills/qa-pilot/            <-- Skill Layer (Persona & Heuristics)
│   ├── SKILL.md                        <-- Core instructions for AI Agents
│   ├── data/
│   │   ├── heuristics/sfdipot.md       <-- SFDIPOT dimension guide
│   │   ├── payloads/naughty-strings.json<-- Adversarial & edge case payloads
│   │   └── checklists/evaluation-checklist.md <-- Quality gate criteria
│   └── scripts/
│       └── search-heuristics.js        <-- Zero-dependency offline search script
│
├── .mcp.json                           <-- MCP Configuration (points to engine)
│
├── packages/
│   ├── mcp-server/                     <-- Execution Engine Layer
│   │   └── dist/index.js               <-- Built MCP stdio server
│   └── cli/                            <-- Distribution Layer
│       ├── bin/qa-pilot.js             <-- CLI entrypoint
│       ├── src/
│       │   ├── commands/init.ts        <-- Core init command implementation
│       │   ├── templates/              <-- Embedded skill & scaffold assets
│       │   └── utils/merge-mcp.ts      <-- Safe JSON merger
│       └── package.json                <-- "bin": { "qa-pilot": "bin/qa-pilot.js" }
│
└── tests/                              <-- Playwright Framework (Scaffolded)
    ├── fixtures/test.fixture.ts
    ├── pages/base.page.ts
    ├── suites/
    └── playwright.config.ts
```

