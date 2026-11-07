# Quickstart: 3-Tier Distribution Validation Guide

**Feature**: `008-skill-mcp-distribution`  
**Date**: 2026-11-07  
**Status**: Ready for Verification

---

## 1. Prerequisites

- Node.js >= 18.3.0
- npm or npx installed
- Terminal / shell access

---

## 2. Validation Scenarios

### Scenario 1: Verify Skill Layer Offline Search
Proves that the offline search script works without any internet or npm modules.

```bash
# 1. Run search script with category filter
node .agents/skills/qa-pilot/scripts/search-heuristics.js --category xss

# Expected Output:
# Returns list of XSS payloads from naughty-strings.json with risk level and expected validation.

# 2. Run search script with keyword query
node .agents/skills/qa-pilot/scripts/search-heuristics.js --query "boundary"

# Expected Output:
# Matches SFDIPOT data boundary rules and length boundary strings.
```

---

### Scenario 2: Test CLI Dry-Run in a Temporary Directory
Proves that `qa-pilot init --dry-run` previews actions without writing files.

```bash
# Create a scratch directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Run dry-run via qa-pilot CLI
node /path/to/qa-pilot/packages/cli/bin/qa-pilot.js init --dry-run

# Expected Output:
# [DRY RUN] Would create .agents/skills/qa-pilot/SKILL.md
# [DRY RUN] Would create .agents/skills/qa-pilot/data/...
# [DRY RUN] Would create .mcp.json with qa-pilot configuration
# [DRY RUN] Would scaffold tests/ and playwright.config.ts

# Verify nothing written to disk:
ls -la "$TEMP_DIR" # Should only show . and ..
```

---

### Scenario 3: Real CLI Initialization & Safe MCP Merge
Proves that `qa-pilot init` sets up the full workspace and merges existing `.mcp.json` without data loss.

```bash
# Prepare existing .mcp.json in TEMP_DIR
cat << 'EOF' > "$TEMP_DIR/.mcp.json"
{
  "mcpServers": {
    "existing-server": {
      "command": "node",
      "args": ["server.js"]
    }
  }
}
EOF

# Execute real init
node /path/to/qa-pilot/packages/cli/bin/qa-pilot.js init "$TEMP_DIR"

# Expected Outcome:
# 1. .agents/skills/qa-pilot/ exists with SKILL.md and data/
# 2. .mcp.json contains BOTH "existing-server" AND "qa-pilot"
# 3. tests/ and playwright.config.ts are scaffolded
# 4. Exit code is 0.
```

---

### Scenario 4: Selective Flags (`--skill-only` and `--mcp-only`)
Proves that users can cherry-pick only the Skill or only the MCP configuration.

```bash
TEMP_SKILL=$(mktemp -d)
node /path/to/qa-pilot/packages/cli/bin/qa-pilot.js init "$TEMP_SKILL" --skill-only

# Expected Outcome:
# - $TEMP_SKILL/.agents/skills/qa-pilot/ exists
# - $TEMP_SKILL/.mcp.json DOES NOT exist
```

