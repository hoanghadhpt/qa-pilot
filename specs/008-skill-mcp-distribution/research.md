# Research: 3-Tier Hybrid Packaging (Skill, MCP Server, CLI)

**Feature**: `008-skill-mcp-distribution`  
**Date**: 2026-11-07  
**Status**: Complete

---

## 1. Research Objectives & Key Questions

1. **How does `ui-ux-pro-max-skill` package its knowledge, and how can we adapt it for QA?**
   - *Findings*: `ui-ux-pro-max-skill` organizes into:
     - `SKILL.md`: Frontmatter YAML + Senior Designer persona + step-by-step workflow.
     - `data/`: Local JSON/Markdown databases for zero-network query.
     - `scripts/`: Local lightweight search script (BM25 or simple token matching) using standard Python/Node libraries with zero external dependencies.
     - An npm CLI package (`ui-ux-pro-max-cli`) providing `npx ... init` to bootstrap into `.agents/skills/` or IDE folders.
   - *Application to `qa-pilot`*:
     - Provide `.agents/skills/qa-pilot/SKILL.md` as the core persona & mindset guide.
     - Package `data/heuristics/sfdipot.md`, `data/payloads/naughty-strings.json`, and `data/checklists/evaluation-checklist.md`.
     - Provide `scripts/search-heuristics.js` (pure Node.js, 0 dependencies) so AI agents or users can run `node .agents/skills/qa-pilot/scripts/search-heuristics.js <query>` directly.

2. **How should `packages/cli` be structured for `npx qa-pilot init`?**
   - *Findings*: A standard npm CLI package has:
     - `package.json` with `"bin": { "qa-pilot": "bin/qa-pilot.js" }`.
     - Executable header `#!/usr/bin/env node`.
     - Bundled templates or skill assets in `assets/` or relative path, copied over upon running `qa-pilot init`.
     - Zero-dependency argument parsing (using `process.argv` and `util.parseArgs` built into Node.js 18.3+) to maintain fast download times (< 2 seconds via `npx`).
   - *Decision*: Build `packages/cli` using Node.js standard libraries (`node:fs`, `node:path`, `node:util`), avoiding heavy CLI dependencies like `commander` or `yargs`.

3. **How to merge `.mcp.json` safely without corrupting existing configurations?**
   - *Findings*:
     - Standard `.mcp.json` format:
       ```json
       {
         "mcpServers": {
           "server-name": {
             "command": "node",
             "args": ["path/to/server.js"],
             "env": {}
           }
         }
       }
       ```
     - If `.mcp.json` exists: parse existing JSON, ensure `mcpServers` object exists, insert or update `qa-pilot` entry, and format with 2 spaces indentation.
     - If it doesn't exist: create a new one.
     - Backup: Create `.mcp.json.bak` if modifying an existing file.

4. **How does the CLI scaffold the Playwright E2E framework?**
   - *Findings*: From Feature 007 (`007-standard-playwright-project`), a standard enterprise Playwright structure includes:
     - `tests/pages/base.page.ts`, `tests/pages/components/`
     - `tests/fixtures/test.fixture.ts`
     - `tests/data/data-factory.ts`
     - `playwright.config.ts`
     - `tests/suites/`
   - *Decision*: When `npx qa-pilot init` runs in a new project, if `playwright.config.ts` does not exist, it scaffolds these starter files so the user has a production-ready testing workspace immediately.

---

## 2. Architectural Decisions & Alternatives

### Decision 1: Pure Node.js Standard Library for CLI (`util.parseArgs`)
- **Rationale**: Minimal bundle size. Running `npx qa-pilot init` downloads in under 2 seconds without pulling hundreds of transitive node_modules.
- **Alternatives considered**:
  - `commander`: Adds ~150KB and extra dependencies. Unnecessary for a single command `init` with 4 flags.
  - Shell script (`curl -sSL ... | bash`): Hard to support cross-platform (Windows PowerShell vs macOS/Linux zsh). Node.js is already guaranteed because the project uses Playwright/MCP.

### Decision 2: Search Script in JavaScript (`node:fs` + Regex/Levenshtein) vs Python
- **Rationale**: While `ui-ux-pro-max-skill` used Python `search.py`, `qa-pilot` is a TypeScript/JavaScript ecosystem (Node.js + Playwright). Requiring Python 3 would add an unnecessary second runtime requirement. A pure Node.js script `scripts/search-heuristics.js` runs natively in the developer's existing environment.
- **Alternatives considered**:
  - Python `search.py`: Requires Python installed on the host machine.
  - Full-text search via sqlite: Violates Constitution Principle II (Zero-Database).

### Decision 3: Separation of Concerns (Skill vs MCP vs CLI)
- **Tầng Skill (`.agents/skills/qa-pilot`)**: Pure markdown/json/static scripts. Universal across all AI assistants (Antigravity, Claude Code, Cursor, Windsurf).
- **Tầng MCP Server (`packages/mcp-server`)**: Browser automation, Chrome DevTools Protocol, DOM interaction, Auth state management.
- **Tầng CLI (`packages/cli`)**: One-stop onboarding, distribution, and project scaffolding.

