# Implementation Plan: Shared Auth Session Storage

**Branch**: `005-shared-auth-session` | **Date**: 2026-11-06 | **Spec**: [specs/005-shared-auth-session/spec.md](file:///Users/hoangha/proj/qa-pilot/specs/005-shared-auth-session/spec.md)

**Input**: Feature specification from `specs/005-shared-auth-session/spec.md`

---

## Summary

Implement **Shared Auth Session Storage** to eliminate repetitive UI logins in automated testing. The system captures browser cookies and localStorage into portable, Playwright-compatible `storageState` JSON profiles (`tests/fixtures/auth/<role>.json`), enables 0.05s instant zero-latency session replay, provides token expiration inspection (`exp` / Cookie `expires`), and protects team secrets with automatic `.gitignore` exclusion and string redaction.

---

## Technical Context

**Language/Version**: TypeScript 5.4+ / Node.js >= 18  
**Primary Dependencies**:
- `@modelcontextprotocol/sdk` (MCP Server tools)
- `playwright` (Chromium context storageState APIs: `context.storageState()` and `browser.newContext({ storageState })`)
- `@midscene/web` (Visual a11y actions and assertions)
- Built-in `node:fs`, `node:path`, `node:crypto` (File persistence, checksums, base64url decoding)

**Storage**: File-based JSON profiles under `tests/fixtures/auth/<role>.json`. Zero external database per Constitution Principle II.  
**Testing**: Playwright automated E2E tests, MCP protocol tests, and unit tests via `tsx` scripts.  
**Target Platform**: macOS, Linux, Windows (headless and headed Chromium via CDP).  
**Project Type**: Monorepo package (`packages/mcp-server`) with CLI & MCP interfaces.  
**Performance Goals**:
- Session extraction (`qa_auth_save`): < 150ms.
- Session restoration (`qa_auth_load`): < 50ms to instantiate browser context with session.
- Token status inspection (`qa_auth_status`): < 5ms.

**Constraints**:
- Absolute secret redaction: Session tokens must NEVER leak into console logs, AI prompts, or visual HTML reports.
- Git safety: Auth profiles must be git-ignored by default.
- Minimalist UI & Plain Language: Zero decorative emojis; neutral functional feedback only.

**Scale/Scope**: Support multi-role session matrices (`admin`, `staff`, `buyer`, `guest`) across dozens of concurrent or sequential test scenarios.

---

## Constitution Check

*GATE: Passed before Phase 0. Re-checked and confirmed post-Phase 1 design.*

| Principle / Gate | Compliance Analysis | Status |
|---|---|---|
| **I. Semantic Context Only** | Auth tools interact at the CDP / browser context level without dumping raw HTML to LLM. | PASS |
| **II. Zero-Database Persistence** | All auth states are stored as schema-validated JSON files under `tests/fixtures/auth/`. No relational or document database required. | PASS |
| **III. Secret Redaction (NON-NEGOTIABLE)** | Cookies and JWT tokens captured in auth profiles are automatically registered in `globalRedactor` to guarantee `[REDACTED]` masking across reports, logs, and SSE. `tests/fixtures/auth/` is strictly added to `.gitignore`. | PASS |
| **IV. Hybrid CDP Execution** | Directly leverages Playwright's CDP-backed `storageState` APIs for clean session injection into browser contexts. | PASS |
| **V. Safe Git Synchronization** | Sensitive session files are excluded from Git repository tracking, preventing merge conflicts and credential leaks. | PASS |
| **VI. Minimalist Interface & Plain Language** | All MCP tool descriptions and log outputs adhere to neutral, concise Vietnamese terminology without hype ("auto-heal", "magic") or decorative emojis. | PASS |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-shared-auth-session/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 architectural decisions & research
├── data-model.md        # Phase 1 entities & validation rules
├── quickstart.md        # Phase 1 end-to-end runnable validation guide
├── contracts/           # Phase 1 MCP tool schema contracts
│   └── auth-tools.json  # Tool definition contract for qa_auth_*
└── tasks.md             # Phase 2 implementation tasks (/speckit-tasks output)
```

### Source Code Impact

```text
packages/mcp-server/
├── src/
│   ├── engine/
│   │   ├── authManager.ts       # Core session save/load/status logic
│   │   ├── browserManager.ts    # Integration with Playwright newContext(storageState)
│   │   ├── oracleWatcher.ts     # Detection of 401/403 and /login redirects
│   │   └── reportManager.ts     # Visual report header badge for active auth role
│   ├── tools/
│   │   ├── authSave.ts          # MCP tool handler: qa_auth_save
│   │   ├── authLoad.ts          # MCP tool handler: qa_auth_load
│   │   ├── authStatus.ts        # MCP tool handler: qa_auth_status
│   │   └── authClear.ts         # MCP tool handler: qa_auth_clear
│   ├── security/
│   │   └── redactor.ts          # Auto-masking token strings in outputs
│   └── index.ts                 # Registration of qa_auth_* tools
tests/
└── fixtures/
    └── auth/                    # Local storageState profiles (.gitignored)
        ├── .gitkeep
        └── admin.json
.gitignore                       # Added tests/fixtures/auth/ and *.auth.json
```

**Structure Decision**: Integrated directly into `packages/mcp-server` so that all existing runner workflows, agentic explorations, and export tools can seamlessly utilize authenticated browser contexts.

---

## Complexity Tracking

> No constitutional violations. Design is completely minimal, zero-dependency, and adheres strictly to Playwright standard primitives.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A |
