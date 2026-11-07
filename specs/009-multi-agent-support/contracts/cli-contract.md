# Interface Contract: CLI Multi-Agent Command & Flags

## 1. CLI Command Schema

```text
qa-pilot init [path] [options]

Arguments:
  path                         Target directory to initialize (default: ".")

Options:
  --agent <agents>             Comma-separated agent names or 'all'
                               Supported: antigravity, cursor, claude, windsurf,
                                          copilot, cline, continue, aider,
                                          openhands, gemini
  --list-agents                List all 10 supported agents and exit
  --force, -f                  Overwrite existing adapter files
  --dry-run                    Simulate initialization without writing files
  --skill-only                 Install only the Skill layer and agent adapters
  --mcp-only                   Configure only the MCP server (.mcp.json)
  --skip-scaffold              Do not generate Playwright test template files
```

## 2. `--list-agents` Output Schema (Stdout)

```text
Supported Coding Agents (10 total):
--------------------------------------------------------------------------------------
ID           Name                  Target File Path                     Strategy
--------------------------------------------------------------------------------------
antigravity  Google Antigravity    .agents/skills/qa-pilot/SKILL.md    standalone
cursor       Cursor IDE            .cursor/rules/qa-pilot.mdc           standalone
claude       Claude Code           .claude/commands/qa-pilot.md         standalone
windsurf     Codeium Windsurf      .windsurfrules                       append_or_merge
copilot      GitHub Copilot        .github/copilot-instructions.md      append_or_merge
cline        Roo Code / Cline      .clinerules                          standalone
continue     Continue.dev          .continue/prompts/qa-pilot.prompt    standalone
aider        Aider CLI             .aider.prompt.md                     standalone
openhands    OpenHands             .openhands/microagents/qa-pilot.md   standalone
gemini       Gemini / Codex        GEMINI.md                            append_or_merge
--------------------------------------------------------------------------------------
Usage:
  npx qa-pilot init --agent all
  npx qa-pilot init --agent cursor,claude,copilot
```

## 3. Delimiter Block Standard for Merged Files

```markdown
<!-- QA-PILOT-START -->
## QA Automation Standards (QA Pilot Engine)
- Follow SFDIPOT heuristics (Structure, Function, Data, Interfaces, Platform, Operations, Time).
- Consult boundary payloads in .agents/skills/qa-pilot/data/payloads/naughty-strings.json.
- Execute browser automation via QA Pilot MCP tools (launch, act, assert, inspect).
- Enforce Triple-Oracle observation (UI screenshot, console logs, network errors).
<!-- QA-PILOT-END -->
```

