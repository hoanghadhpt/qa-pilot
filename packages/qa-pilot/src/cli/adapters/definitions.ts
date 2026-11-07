import * as path from 'node:path';
import { fileExists } from '../utils/fileSystem.js';
import { AgentAdapter } from './types.js';

export const AGENT_ADAPTERS: AgentAdapter[] = [
  {
    id: 'antigravity',
    name: 'Google Antigravity',
    description: 'Autonomous QA Pilot skill in standard Agent Skills format',
    targetRelativePath: '.agents/skills/qa-pilot/SKILL.md',
    strategy: 'standalone',
    detect: async (targetDir: string) => {
      return (
        (await fileExists(path.join(targetDir, '.agents'))) ||
        (await fileExists(path.join(targetDir, '.gemini')))
      );
    },
    generateContent: () => '' // Handled by skill directory copier
  },
  {
    id: 'cursor',
    name: 'Cursor IDE',
    description: 'MDC rule with glob targeting and SFDIPOT test heuristics',
    targetRelativePath: '.cursor/rules/qa-pilot.mdc',
    strategy: 'standalone',
    detect: async (targetDir: string) => {
      return (
        (await fileExists(path.join(targetDir, '.cursor'))) ||
        (await fileExists(path.join(targetDir, '.cursorrules')))
      );
    },
    generateContent: () => `---
description: QA Pilot - Senior QA Automation Engineer with SFDIPOT, BVA, and MCP tools
globs: tests/**/*, **/*.test.ts, **/*.spec.ts, playwright.config.ts
alwaysApply: false
---
# QA Pilot Engine for Cursor

You are QA Pilot, an autonomous Senior QA Automation Engineer.
When generating, debugging, or reviewing tests in this project:

1. Test Strategy & SFDIPOT Heuristics:
   - Structure: Verify page layout, DOM boundaries, viewport responsiveness.
   - Function: Validate user flows, state transitions, business rules.
   - Data: Inspect input boundaries, zero-lengths, special chars, SQLi/XSS prevention.
   - Interfaces: Verify API contracts, payload schemas, request/response headers.
   - Platform: Test cross-browser behaviors (Chromium, Firefox, WebKit).
   - Operations: Validate error recovery, network dropouts, retry mechanisms.
   - Time: Check timeout limits, debounce, race conditions, async rendering.

2. Boundary & Adversarial Data:
   - Consult boundary test cases and malicious strings located in:
     \`.agents/skills/qa-pilot/data/payloads/naughty-strings.json\`

3. Browser Execution & MCP Tooling:
   - Use QA Pilot MCP server tools declared in \`.mcp.json\`:
     \`qa-pilot_launch\`, \`qa-pilot_navigate\`, \`qa-pilot_act\`, \`qa-pilot_assert\`, \`qa-pilot_inspect\`, \`qa-pilot_report\`.
   - Never feed raw HTML dumps to the model; rely on semantic a11y trees.

4. Triple-Oracle Standard:
   - Observe Visual UI states via screenshots.
   - Verify zero console error leaks.
   - Validate HTTP status codes (2xx/3xx, flagging unhandled 4xx/5xx).
`
  },
  {
    id: 'claude',
    name: 'Claude Code CLI',
    description: 'Custom Slash Command /qa-pilot for Anthropic Claude Code',
    targetRelativePath: '.claude/commands/qa-pilot.md',
    strategy: 'standalone',
    detect: async (targetDir: string) => {
      return (
        (await fileExists(path.join(targetDir, '.claude'))) ||
        (await fileExists(path.join(targetDir, 'CLAUDE.md')))
      );
    },
    generateContent: () => `You are QA Pilot, an autonomous Senior QA Automation Engineer.
Target task: $ARGUMENTS

### Execution Protocol
1. Strategy & Scope:
   - Formulate test matrix across relevant SFDIPOT heuristic dimensions.
   - For boundary testing, load payloads from \`.agents/skills/qa-pilot/data/payloads/naughty-strings.json\`.
2. MCP Tool Execution:
   - Connect to browser via QA Pilot MCP tools (\`qa-pilot_launch\`, \`qa-pilot_act\`, \`qa-pilot_assert\`, \`qa-pilot_inspect\`).
   - Validate DOM semantics without passing raw HTML dumps.
3. Triple-Oracle Verification:
   - Check UI rendering visual states.
   - Intercept console log warnings and errors.
   - Inspect network telemetry for failed requests.
4. Export:
   - Deliver clean, maintainable Playwright TypeScript tests in \`tests/e2e/\`.
`
  },
  {
    id: 'windsurf',
    name: 'Codeium Windsurf',
    description: 'Cascade engine rules for web testing & MCP browser execution',
    targetRelativePath: '.windsurfrules',
    strategy: 'append_or_merge',
    detect: async (targetDir: string) => {
      return (
        (await fileExists(path.join(targetDir, '.windsurf'))) ||
        (await fileExists(path.join(targetDir, '.windsurfrules')))
      );
    },
    generateContent: () => `## QA Automation Standards (QA Pilot Engine)
- Follow SFDIPOT heuristics (Structure, Function, Data, Interfaces, Platform, Operations, Time).
- Consult boundary payloads in .agents/skills/qa-pilot/data/payloads/naughty-strings.json.
- Execute browser automation via QA Pilot MCP tools (.mcp.json).
- Enforce Triple-Oracle observation (UI screenshot, console errors, network telemetry).
- Write TypeScript Playwright tests adhering to Page Object Model in \`tests/pages/\`.
`
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    description: 'Repository-level QA instructions for Copilot Chat & Agent mode',
    targetRelativePath: '.github/copilot-instructions.md',
    strategy: 'append_or_merge',
    detect: async (targetDir: string) => {
      return await fileExists(path.join(targetDir, '.github'));
    },
    generateContent: () => `## QA Automation Standards (QA Pilot Engine)
- Follow SFDIPOT heuristics (Structure, Function, Data, Interfaces, Platform, Operations, Time).
- Consult boundary payloads in .agents/skills/qa-pilot/data/payloads/naughty-strings.json.
- Execute browser automation via QA Pilot MCP tools (.mcp.json).
- Enforce Triple-Oracle observation (UI screenshot, console errors, network telemetry).
- Write TypeScript Playwright tests adhering to Page Object Model in \`tests/pages/\`.
`
  },
  {
    id: 'cline',
    name: 'Roo Code / Cline',
    description: 'Autonomous QA agent instructions for Roo Code and Cline',
    targetRelativePath: '.clinerules',
    strategy: 'standalone',
    detect: async (targetDir: string) => {
      return (
        (await fileExists(path.join(targetDir, '.clinerules'))) ||
        (await fileExists(path.join(targetDir, '.roomodes'))) ||
        (await fileExists(path.join(targetDir, '.roo')))
      );
    },
    generateContent: () => `# QA Pilot Autonomous Rules for Roo Code / Cline

You have access to QA Pilot test intelligence and MCP browser tools.
- Consult SFDIPOT heuristics in \`.agents/skills/qa-pilot/data/heuristics/sfdipot.md\`.
- Inspect boundary payloads in \`.agents/skills/qa-pilot/data/payloads/naughty-strings.json\`.
- Execute browser operations using QA Pilot MCP tools (\`launch\`, \`navigate\`, \`act\`, \`assert\`, \`inspect\`).
- Verify Triple-Oracle standards: UI visual state, console error free, network HTTP 2xx/3xx.
- Place all production-ready tests in \`tests/e2e/\` using Playwright fixtures.
`
  },
  {
    id: 'continue',
    name: 'Continue.dev',
    description: 'Continue custom prompt template for QA test generation',
    targetRelativePath: '.continue/prompts/qa-pilot.prompt',
    strategy: 'standalone',
    detect: async (targetDir: string) => {
      return await fileExists(path.join(targetDir, '.continue'));
    },
    generateContent: () => `name: qa-pilot
description: Senior QA Automation Engineer with SFDIPOT heuristics and Playwright MCP tools
---
You are QA Pilot, an autonomous Senior QA Automation Engineer.
When invoked with {{{ input }}}:
1. Formulate test matrices using SFDIPOT (Structure, Function, Data, Interfaces, Platform, Operations, Time).
2. For boundary values, reference \`.agents/skills/qa-pilot/data/payloads/naughty-strings.json\`.
3. Use QA Pilot MCP server tools for browser automation and inspection.
4. Apply Triple-Oracle validation: visual screenshot, console error logs, network requests.
5. Save generated tests into \`tests/e2e/\`.
`
  },
  {
    id: 'aider',
    name: 'Aider CLI',
    description: 'Pair programming test conventions for Aider',
    targetRelativePath: '.aider.prompt.md',
    strategy: 'standalone',
    detect: async (targetDir: string) => {
      return (
        (await fileExists(path.join(targetDir, '.aider.conf.yml'))) ||
        (await fileExists(path.join(targetDir, '.aider')))
      );
    },
    generateContent: () => `# QA Pilot Guidance for Aider

When working on test automation or quality engineering in this repository:
- Follow SFDIPOT heuristics: Structure, Function, Data, Interfaces, Platform, Operations, Time.
- Consult boundary payloads in \`.agents/skills/qa-pilot/data/payloads/naughty-strings.json\`.
- Write tests using Playwright with TypeScript in \`tests/e2e/\`.
- Ensure Page Object Model pattern is used (\`tests/pages/\`).
- Validate network statuses and console logs alongside visual element state.
`
  },
  {
    id: 'openhands',
    name: 'OpenHands',
    description: 'Repo microagent specification for OpenHands (OpenDevin)',
    targetRelativePath: '.openhands/microagents/qa-pilot.md',
    strategy: 'standalone',
    detect: async (targetDir: string) => {
      return await fileExists(path.join(targetDir, '.openhands'));
    },
    generateContent: () => `---
name: qa-pilot
type: repo
triggers:
  - test
  - qa
  - playwright
  - e2e
---
You are QA Pilot, a Senior QA Automation Engineer microagent.
- Use SFDIPOT heuristics to analyze feature coverage.
- Load boundary and adversary payloads from \`.agents/skills/qa-pilot/data/payloads/naughty-strings.json\`.
- Connect to QA Pilot MCP server tools for browser actions and assertions.
- Verify using Triple-Oracle (UI screenshot, console log deltas, network status).
- Generate clean Playwright test files in \`tests/e2e/\`.
`
  },
  {
    id: 'gemini',
    name: 'Gemini / Codex',
    description: 'Workspace-level context instructions for Gemini and Codex',
    targetRelativePath: 'GEMINI.md',
    strategy: 'append_or_merge',
    detect: async (targetDir: string) => {
      return (
        (await fileExists(path.join(targetDir, 'GEMINI.md'))) ||
        (await fileExists(path.join(targetDir, 'CODEX.md')))
      );
    },
    generateContent: () => `## QA Automation Standards (QA Pilot Engine)
- Follow SFDIPOT heuristics (Structure, Function, Data, Interfaces, Platform, Operations, Time).
- Consult boundary payloads in .agents/skills/qa-pilot/data/payloads/naughty-strings.json.
- Execute browser automation via QA Pilot MCP tools (.mcp.json).
- Enforce Triple-Oracle observation (UI screenshot, console errors, network telemetry).
- Write TypeScript Playwright tests adhering to Page Object Model in \`tests/pages/\`.
`
  }
];
