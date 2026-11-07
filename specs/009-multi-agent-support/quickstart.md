# Quickstart: Multi-Agent Adapter Validation

This guide outlines runnable scenarios to verify multi-agent adapter provisioning.

---

## Scenario 1: List Supported Agents
Verify `--list-agents` lists all 10 supported agents without performing any filesystem writes.

```bash
node packages/qa-pilot/bin/qa-pilot.js init --list-agents
```
**Expected Outcome**:
- Returns status code 0.
- Prints tabular output displaying 10 agents with IDs: `antigravity`, `cursor`, `claude`, `windsurf`, `copilot`, `cline`, `continue`, `aider`, `openhands`, `gemini`.

---

## Scenario 2: Dry Run with `--agent all`
Verify `--dry-run` simulates creating all 10 agent adapters without creating real directories.

```bash
node packages/qa-pilot/bin/qa-pilot.js init /tmp/test-multi-agent --dry-run --agent all
```
**Expected Outcome**:
- Outputs simulation logs indicating files for all 10 agents would be created.
- Target directory remains untouched or non-existent.

---

## Scenario 3: Real Initialization for Cursor & Claude
Verify files are correctly written with appropriate frontmatter and directory creation.

```bash
mkdir -p /tmp/test-qa-pilot-agents
node packages/qa-pilot/bin/qa-pilot.js init /tmp/test-qa-pilot-agents --agent cursor,claude
```
**Expected Outcome**:
- `.cursor/rules/qa-pilot.mdc` exists and contains `globs: tests/**/*`.
- `.claude/commands/qa-pilot.md` exists and contains `$ARGUMENTS`.
- Clean up: `rm -rf /tmp/test-qa-pilot-agents`.

---

## Scenario 4: Smart Auto-Detection
Verify auto-detection of existing agent folders.

```bash
mkdir -p /tmp/test-autodetect/.cursor
node packages/qa-pilot/bin/qa-pilot.js init /tmp/test-autodetect
```
**Expected Outcome**:
- Automatically detects `.cursor` directory.
- Creates `.cursor/rules/qa-pilot.mdc` in addition to `.agents/skills/qa-pilot/`.
- Clean up: `rm -rf /tmp/test-autodetect`.

