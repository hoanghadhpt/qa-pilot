# Research: Multi-Coding-Agent Support (Feature 009)

## Executive Summary
Modern software engineering utilizes diverse AI coding assistants across development teams. Rather than locking QA Pilot strictly into Google Antigravity, QA Pilot adopts a **Single Source of Truth, Multi-Target Adapter** model. The core knowledge base (SFDIPOT, Naughty Strings, MCP tool interface) remains unified, while lightweight adapters are generated in the exact native directory structure and format expected by each coding assistant.

---

## 1. Supported Coding Assistants Matrix (Top 10)

| Agent Identifier | Editor / CLI Platform | Native Target File Path | Format & Metadata Schema | Detection Indicator |
| :--- | :--- | :--- | :--- | :--- |
| `antigravity` | Google Antigravity / Gemini CLI | `.agents/skills/qa-pilot/SKILL.md` | YAML Frontmatter (`name`, `description`) + Markdown | `.agents/`, `.gemini/` |
| `cursor` | Cursor IDE | `.cursor/rules/qa-pilot.mdc` | MDC format (`description`, `globs`, `alwaysApply`) | `.cursor/`, `.cursorrules` |
| `claude` | Anthropic Claude Code CLI | `.claude/commands/qa-pilot.md` | Custom Slash Command (`/qa-pilot $ARGUMENTS`) | `.claude/`, `CLAUDE.md` |
| `windsurf` | Codeium Windsurf IDE | `.windsurfrules` | Markdown instructions for Cascade Engine | `.windsurf/`, `.windsurfrules` |
| `copilot` | GitHub Copilot / VS Code | `.github/copilot-instructions.md` | Markdown instructions for Workspace Agent | `.github/` |
| `cline` | Roo Code / Cline (VS Code) | `.clinerules` | Markdown autonomous engineer rules | `.clinerules`, `.roomodes`, `.roo/` |
| `continue` | Continue.dev (VS Code / JetBrains) | `.continue/prompts/qa-pilot.prompt` | Continue Custom Slash Prompt template | `.continue/` |
| `aider` | Aider CLI | `.aider.prompt.md` | System prompt guidance for pair programming | `.aider*`, `.aider.conf.yml` |
| `openhands` | OpenHands (formerly OpenDevin) | `.openhands/microagents/qa-pilot.md` | Microagent format with `name`, `type`, `triggers` | `.openhands/` |
| `gemini` | Gemini Code Assist / Codex | `GEMINI.md` | Project-level AI context instructions | `GEMINI.md` |

---

## 2. Architectural Decisions & Rationales

### Decision 1: Adapter Generator Architecture vs Static Duplication
- **Choice**: Implement an extensible TypeScript adapter registry (`agentAdapters.ts`) inside `packages/qa-pilot/src/cli/adapters/`.
- **Rationale**: Each adapter defines:
  1. `id`: Short lowercase slug (e.g. `cursor`, `claude`).
  2. `name`: Human-readable name.
  3. `detect(targetDir)`: Checks whether indicators exist.
  4. `generate(targetDir, context)`: Returns file path and content, handling standalone file creation or safe appending.
- **Alternatives Considered**:
  - *Hardcoding file copies from an assets directory*: Inflexible for agents requiring appending (e.g., `.github/copilot-instructions.md` or `.windsurfrules`) or dynamic path resolution.

### Decision 2: File Collision & Merging Strategy
- **Choice**:
  - Standalone dedicated rule files (e.g. `.cursor/rules/qa-pilot.mdc`, `.claude/commands/qa-pilot.md`, `.openhands/microagents/qa-pilot.md`): Written cleanly; if existing, require `--force` to overwrite.
  - Shared repository instruction files (e.g. `.github/copilot-instructions.md`, `.windsurfrules`, `GEMINI.md`): Check if `<!-- QA-PILOT-START -->` and `<!-- QA-PILOT-END -->` delimiter block exists. If present, replace only the delimited section. If absent, append neatly to the end of the file.
- **Rationale**: Prevents destroying pre-existing developer prompt guidelines or Copilot repo instructions.

### Decision 3: CLI Flag Syntax and Ergonomics
- **Choice**:
  - `qa-pilot init`: Defaults to installing Antigravity skill + auto-detecting any present agent configurations.
  - `qa-pilot init --agent all`: Generates adapters for all 10 supported agents.
  - `qa-pilot init --agent cursor,claude`: Generates adapters for specified agents.
  - `qa-pilot init --list-agents`: Displays a tabular overview of all 10 agents with detection status in the current working directory.
- **Rationale**: Gives full control while keeping default behavior intelligent and frictionless.

---

## 3. Constitution Compliance Check
- **Principle I (Semantic Context Only)**: All generated adapter rules explicitly mandate passing semantic a11y trees and network logs rather than raw HTML dumps.
- **Principle II (Test-as-Code & Zero-DB)**: Rules instruct agents to write standard Playwright test files in `tests/e2e/`.
- **Principle III (Production Safety)**: Rules include warnings regarding `is_production` safety checks and secret redaction.
- **Principle VI (Minimalist Language & No Emojis)**: All generated rules and CLI output strictly omit emojis and marketing hype in compliance with Constitution Principle VI.

