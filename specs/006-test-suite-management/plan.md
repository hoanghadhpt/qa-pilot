# Implementation Plan: Test Suite Management & AI Standardized Suite Generator

**Branch**: `006-test-suite-management` | **Date**: 2026-11-07 | **Spec**: [specs/006-test-suite-management/spec.md](file:///Users/hoangha/proj/qa-pilot/specs/006-test-suite-management/spec.md)

**Input**: Feature specification from `specs/006-test-suite-management/spec.md`

---

## Summary

Implement **Test Suite Management & AI Standardized Suite Generator** to allow end users to generate comprehensive, industry-standard test suites (Happy Path, Negative Validation, Boundary Value Analysis, Security Probes) for any module or target URL in under 15 seconds. Store suites as Test-as-Code YAML files in `tests/suites/<module>/<suite-id>.yaml` (Zero-Database architecture), execute them with tag-based filtering (`@smoke`, `@regression`), provide automated multi-role authentication session loading (Feature 005), aggregate results into a visual Suite Report HTML dashboard, and export directly to Playwright TypeScript specs for CI/CD pipelines.

---

## Technical Context

**Language/Version**: TypeScript 5.6+ / Node.js >= 18  
**Primary Dependencies**:
- `@modelcontextprotocol/sdk` (MCP Server tools)
- `playwright` (Chromium automation, context injection, accessibility inspection)
- `@midscene/web` (Visual a11y tree actions, assertions, interactive element extraction)
- `yaml` (Standard YAML serializer and parser for Test-as-Code files)
- Built-in `node:fs`, `node:path`, `node:crypto` (File persistence, run session directories)

**Storage**: File-based Test-as-Code YAML hierarchy (`tests/suites/<module>/<suite-id>.yaml`) and run telemetry artifacts (`tests/runs/suites/<run-id>/`). 100% Zero-Database per Constitution Principle II.  
**Testing**: Playwright automated E2E tests, MCP protocol tests, and unit tests via `tsx` scripts.  
**Target Platform**: macOS, Linux, Windows (headless and headed Chromium via CDP).  
**Project Type**: Monorepo package (`packages/mcp-server`) with CLI & MCP interfaces.  
**Performance Goals**:
- Full AI Suite Generation for a URL/Module: < 15s.
- Suite Test Case Filtering & Run Initialization: < 100ms.
- Suite Report Generation: < 200ms.

**Constraints**:
- Secret redaction: Sample test credentials and sensitive tokens must NEVER appear unmasked in reports or logs.
- Plain functional language: Zero emojis or marketing buzzwords in tool outputs and reports.
- Standardized schema: Every generated test case must strictly follow BDD `Given-When-Then` and ISTQB/IEEE 29119 criteria.

**Scale/Scope**: Support dozens of modules and hundreds of test cases per suite with selective tag execution (`@smoke`, `@regression`, `@p1`).

---

## Constitution Check

*GATE: Passed before Phase 0. Re-checked and confirmed post-Phase 1 design.*

| Principle / Gate | Compliance Analysis | Status |
|---|---|---|
| **I. Semantic Context Only** | Suite generator extracts elements via accessibility (a11y) tree and semantic box models without feeding massive raw DOM dumps to AI. | PASS |
| **II. Zero-Database Persistence** | All test suites and run histories are stored as human-readable, Git-versioned YAML files in `tests/suites/`. Zero external database required. | PASS |
| **III. Secret Redaction (NON-NEGOTIABLE)** | Sample test data and credentials used in suites are automatically passed through `globalRedactor` before being written to reports or stdout. | PASS |
| **IV. Hybrid CDP Execution** | Step execution operates through Playwright CDP with Triple-Oracle telemetry (Console, Network, JS Exceptions). | PASS |
| **V. Safe Git Synchronization** | Test-as-Code YAML files are clean, deterministic, and Git merge-friendly. | PASS |
| **VI. Minimalist Interface & Plain Language** | Plain, concise Vietnamese terminology used throughout. No decorative emojis or exaggerated phrasing in generated test steps or reports. | PASS |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-test-suite-management/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 architectural decisions & GitHub benchmarking
├── data-model.md        # Phase 1 entities & validation rules
├── quickstart.md        # Phase 1 end-to-end runnable validation guide
├── contracts/           # Phase 1 MCP tool schema contracts
│   └── suite-tools.json # Tool definition contract for qa_*_suite
├── checklists/
│   └── requirements.md  # Spec quality validation checklist
└── tasks.md             # Phase 2 implementation tasks (/speckit-tasks output)
```

### Source Code Impact

```text
packages/mcp-server/
├── src/
│   ├── engine/
│   │   ├── suiteManager.ts         # Suite CRUD, YAML read/write, listing
│   │   ├── suiteGenerator.ts       # AI Heuristic Suite Generator (SFDIPOT, BVA, Security)
│   │   ├── suiteRunner.ts          # Execution engine with tag filtering & auth integration
│   │   ├── suiteReportManager.ts   # Executive Suite HTML report generator
│   │   └── suiteExporter.ts        # Playwright TypeScript spec exporter
│   ├── tools/
│   │   ├── suiteGenerate.ts        # MCP tool: qa_generate_suite
│   │   ├── suiteRun.ts             # MCP tool: qa_run_suite
│   │   ├── suiteList.ts            # MCP tool: qa_list_suites
│   │   ├── suiteReport.ts          # MCP tool: qa_get_suite_report
│   │   └── suiteExport.ts          # MCP tool: qa_export_suite
│   ├── types.ts                    # TestSuite, TestCase, TestStep, SuiteRun types
│   └── index.ts                    # Register qa_*_suite tools in MCP server
tests/
└── suites/                         # Test-as-Code YAML repository
    └── auth/
        └── auth-login.yaml
```

**Structure Decision**: Integrated cleanly into `packages/mcp-server/src/engine/` and `tools/` with modular separation between generation, execution, reporting, and export.

---

## Complexity Tracking

> No constitutional violations. The architecture is 100% file-based, utilizes standard YAML, and extends existing MCP server primitives.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A |
