# Feature Specification: 009 Multi-Coding-Agent Support

**Feature Branch**: `009-multi-agent-support`
**Created**: 2026-11-07
**Status**: In Planning
**Input**: Support top 10 common coding agents in `qa-pilot init` via multi-target adapter generation.

---

## User Scenarios & Testing

### User Story 1 - Multi-Agent Scaffolding via CLI Flags (Priority: P1)
As a developer using Cursor, Claude Code, Windsurf, or another AI editor, I want `npx qa-pilot init` to generate configuration rules and skill adapters tailored specifically to my editor, so my AI agent immediately understands QA Pilot heuristics, MCP tools, and test structures.

**Why this priority**:
Currently, `qa-pilot init` only installs `.agents/skills/qa-pilot/` (Antigravity). Developers using Cursor, Claude Code, Copilot, etc. must manually construct rule files. Supporting the top 10 agents drastically lowers friction for cross-agent adoption.

**Independent Test**:
Run `qa-pilot init --agent cursor,claude,copilot` in a test directory and verify `.cursor/rules/qa-pilot.mdc`, `.claude/commands/qa-pilot.md`, and `.github/copilot-instructions.md` are created with appropriate frontmatter and contents.

**Acceptance Scenarios**:
1. **Given** a project directory, **When** running `qa-pilot init --agent all`, **Then** configuration files for all 10 supported coding agents are generated.
2. **Given** an existing `playwright.config.ts`, **When** running `qa-pilot init --agent cursor`, **Then** `.cursor/rules/qa-pilot.mdc` is created with glob targeting tests and playwright configs.
3. **Given** an invalid agent name like `--agent foo`, **When** running `qa-pilot init --agent foo`, **Then** CLI outputs an error listing valid agent identifiers.

---

### User Story 2 - Smart Auto-Detection of Project Coding Agents (Priority: P2)
As a developer running `npx qa-pilot init` without flags, I want the CLI to automatically detect which coding agent folders or config files exist in my repo (e.g., `.cursor/`, `.claude/`, `.github/`, `.continue/`) and automatically install adapters for them.

**Why this priority**:
Zero-configuration onboarding creates a delightful developer experience: the CLI adapts itself to whatever tools the developer already has in their workspace.

**Independent Test**:
In a workspace with `.cursor/` and `.claude/` directories, run `qa-pilot init` (without `--agent`) and verify both Cursor and Claude Code adapters are automatically populated alongside Antigravity.

**Acceptance Scenarios**:
1. **Given** a repo containing a `.cursor/` folder, **When** running `qa-pilot init`, **Then** Cursor rule `.cursor/rules/qa-pilot.mdc` is automatically generated without requiring `--agent cursor`.
2. **Given** a repo without any agent directory, **When** running `qa-pilot init`, **Then** Antigravity skill is installed by default and a tip is displayed showing how to run with `--agent all`.

---

### User Story 3 - List Supported Agents & Adapter Discovery (Priority: P3)
As a developer or QA engineer, I want to inspect which agents are supported and what files they modify by running `qa-pilot init --list-agents`.

**Why this priority**:
Provides transparency and self-documentation without needing to open external docs or browser links.

**Independent Test**:
Run `qa-pilot init --list-agents` and verify stdout prints a formatted table of all 10 agents, short IDs, target file paths, and activation formats.

**Acceptance Scenarios**:
1. **When** running `qa-pilot init --list-agents`, **Then** 10 agents are listed with name, flag id, file destination, and description.

---

## Supported Coding Agents (Target List: 10 Agents)

1. **Antigravity**: `.agents/skills/qa-pilot/SKILL.md` (Agent Skills format with YAML frontmatter).
2. **Cursor**: `.cursor/rules/qa-pilot.mdc` (MDC format with glob filters and YAML frontmatter).
3. **Claude Code**: `.claude/commands/qa-pilot.md` (Custom Slash Command `/qa-pilot`) and `.claude/skills/qa-pilot/SKILL.md`.
4. **Windsurf**: `.windsurfrules` (Cascade rule block).
5. **GitHub Copilot**: `.github/copilot-instructions.md` (Repository instructions section).
6. **Roo Code / Cline**: `.clinerules` (System instructions for autonomous coding tasks).
7. **Continue.dev**: `.continue/prompts/qa-pilot.prompt` (Continue prompt template with context).
8. **Aider**: `.aider.prompt.md` (Aider architect/code prompt guidelines).
9. **Devin / OpenHands**: `.openhands/microagents/qa-pilot.md` (Microagent specification).
10. **Gemini Code Assist / Codex**: `GEMINI.md` (Workspace contextual guidance).

---

## Edge Cases

- **Existing Files**: If an agent file already exists (e.g. `.github/copilot-instructions.md` or `.windsurfrules`), the system MUST NOT blindly overwrite it. For single instruction files (like `copilot-instructions.md` or `.windsurfrules`), append or merge without duplicating sections. For standalone rule files, overwrite only if `--force` is specified.
- **Dry Run Mode**: `--dry-run` MUST show all proposed agent files without writing to disk.
- **Comma-Separated Values**: Flag `--agent cursor,claude` and multiple flags `--agent cursor --agent claude` MUST both be handled cleanly.

---

## Requirements

### Functional Requirements
- **FR-001**: System MUST support 10 predefined coding agent identifiers: `antigravity`, `cursor`, `claude`, `windsurf`, `copilot`, `cline`, `continue`, `aider`, `openhands`, `gemini`.
- **FR-002**: System MUST support `--agent <names>` accepting single or comma-separated agent IDs, or the special keyword `all`.
- **FR-003**: System MUST auto-detect existing workspace agent indicators when `--agent` is omitted.
- **FR-004**: System MUST format each agent adapter in accordance with its native format (e.g., frontmatter globs for Cursor `.mdc`, arguments for Claude `.md`).
- **FR-005**: All generated agent adapters MUST instruct the agent to utilize QA Pilot's SFDIPOT heuristics, boundary data (`naughty-strings.json`), and MCP tools (`launch`, `act`, `assert`, `inspect`, etc.).
- **FR-006**: System MUST provide `--list-agents` command to print supported agents.
