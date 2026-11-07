# Implementation Plan: 009 Multi-Coding-Agent Support

**Branch**: `009-multi-agent-support` | **Date**: 2026-11-07 | **Spec**: [specs/009-multi-agent-support/spec.md](file:///Users/hoangha/proj/qa-pilot/specs/009-multi-agent-support/spec.md)

---

## Summary
Extend `qa-pilot init` to support the top 10 AI coding assistants (Antigravity, Cursor, Claude Code, Windsurf, GitHub Copilot, Roo Code/Cline, Continue.dev, Aider, OpenHands, Gemini/Codex). Employs an extensible Adapter Architecture with auto-detection, `--agent <list>`, `--agent all`, and safe delimiter merging for shared files.

---

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 18+ (ESM)
**Primary Dependencies**: Node.js built-in `node:fs/promises`, `node:path`
**Storage**: N/A (Filesystem test-as-code only)
**Testing**: Node.js test runner / TypeScript unit test scripts in `packages/qa-pilot/src/cli/`
**Target Platform**: Cross-platform (macOS, Linux, Windows)
**Project Type**: CLI Distribution & Multi-Agent Adapter Framework
**Performance Goals**: Adapter generation completes in < 50ms
**Constraints**: Zero external dependencies added to CLI; No emojis in rule headers or CLI outputs (Constitution Principle VI)
**Scale/Scope**: 10 coding agents supported out of the box

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- [x] **Principle I: Semantic Context Only**: Adapter templates instruct LLMs to utilize AX trees and network telemetry, never raw DOM dumps.
- [x] **Principle II: Test-as-Code & Zero-DB**: Generated adapters target file-based Playwright suites in `tests/e2e/`.
- [x] **Principle III: Production Safety & Secret Redaction**: Adapter prompts explicitly enforce production URL whitelists and `[REDACTED]` tokens.
- [x] **Principle IV: Hybrid CDP Execution**: Adapters point to `.mcp.json` running QA Pilot browser and inspection tools.
- [x] **Principle V: Safe Git Sync**: Respects existing git repositories without modifying git staging directly.
- [x] **Principle VI: Minimalist Interface & Plain Language**: No emojis, no marketing hyperbole in prompt text, rule comments, or CLI messages.

---

## Project Structure

### Documentation (this feature)

```text
specs/009-multi-agent-support/
├── spec.md              # Feature specification
├── plan.md              # This plan
├── research.md          # 10 coding agents analysis & decision log
├── data-model.md        # Adapter interface and CLI options schema
├── contracts/
│   └── cli-contract.md  # CLI command, flags, and merge delimiters
├── quickstart.md        # Runnable verification scenarios
└── tasks.md             # Implementation tasks (generated via /speckit-tasks)
```

### Source Code Changes

```text
packages/qa-pilot/
├── src/
│   ├── cli/
│   │   ├── adapters/
│   │   │   ├── index.ts              # Adapter registry & execution engine
│   │   │   ├── definitions.ts        # 10 agent adapter definitions & templates
│   │   │   └── mergeUtil.ts          # Delimiter block safe merge utility
│   │   ├── commands/
│   │   │   └── init.ts               # Updated CLI args parser & multi-agent runner
│   │   ├── verify-cli.ts             # Updated verification test suite
│   │   └── verify-adapters.ts        # New automated verification for all 10 adapters
│   └── bin/
│       └── qa-pilot.js               # CLI entrypoint forwarding --agent & --list-agents
└── package.json                      # Version bump to 0.0.3 preparation
```

---

## Phases & Deliverables

- **Phase 0: Research** (Completed):
  - Analysis of 10 major coding assistants and their rule conventions.
  - Delivery: [research.md](file:///Users/hoangha/proj/qa-pilot/specs/009-multi-agent-support/research.md).

- **Phase 1: Design & Contracts** (Completed):
  - Data model and adapter interfaces: [data-model.md](file:///Users/hoangha/proj/qa-pilot/specs/009-multi-agent-support/data-model.md).
  - CLI Interface contract: [cli-contract.md](file:///Users/hoangha/proj/qa-pilot/specs/009-multi-agent-support/contracts/cli-contract.md).
  - Runnable validation scenarios: [quickstart.md](file:///Users/hoangha/proj/qa-pilot/specs/009-multi-agent-support/quickstart.md).

- **Next Phase**: Run `/speckit-tasks` to generate actionable implementation tasks in `tasks.md`, then execute with `/speckit-implement`.
