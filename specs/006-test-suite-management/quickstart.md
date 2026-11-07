# Quickstart Validation Guide: Test Suite Management & AI Suite Generator

**Feature ID**: `006-test-suite-management`  
**Status**: Ready for Verification  
**Date**: 2026-11-07  

---

## 1. Prerequisites

1. Node.js >= 18 installed.
2. Dependencies built in `packages/mcp-server/`.
3. Chromium browser binaries installed via Playwright (`npx playwright install chromium`).

---

## 2. Validation Scenarios

### Scenario 1: AI Full-Suite Generation for a Target URL (P1)
**Goal**: Verify that providing a URL automatically generates a structured YAML Test Suite containing all 4 heuristic categories.

1. **Invoke MCP Generation Tool**:
   ```bash
   qa_generate_suite({
     module: "auth",
     suiteId: "auth-register",
     url: "https://demo.automationtesting.in/Register.html",
     tags: ["smoke", "auth", "regression"]
   })
   ```
2. **Verify Output Artifact**:
   - Verify file `tests/suites/auth/auth-register.yaml` exists.
   - Verify it contains at least 6 test cases covering:
     - `happy_path` (P1)
     - `negative_validation` (P1/P2)
     - `boundary_value` (P2)
     - `security_probe` (P2/P3)
   - Verify every test case has valid `preconditions`, `steps` (with `action`, `data`, `expected`), and `assertions`.

---

### Scenario 2: Suite Management & Listing (P1)
**Goal**: Verify that all saved suites across modules can be discovered and cataloged.

1. **Invoke MCP Listing Tool**:
   ```bash
   qa_list_suites({})
   ```
2. **Expected Outcome**:
   - Returns array of registered suites.
   - Displays suite ID, module name, total test case counts, and tags.

---

### Scenario 3: Selective Tagged Suite Execution (P1)
**Goal**: Verify running a test suite with tag filtering (`@smoke`).

1. **Execute Smoke Subset**:
   ```bash
   qa_run_suite({
     suiteId: "auth-register",
     filterTags: ["smoke"],
     headless: true
   })
   ```
2. **Expected Outcome**:
   - Only test cases tagged `smoke` are executed.
   - Non-smoke test cases are marked `skipped`.
   - Returns `totalCases`, `passedCases`, `failedCases`, and `reportPath`.

---

### Scenario 4: Aggregated Suite Visual Report (P2)
**Goal**: Verify the generation and rendering of the executive Suite Report HTML.

1. **Fetch Suite Report**:
   ```bash
   qa_get_suite_report()
   ```
2. **Verify HTML Report**:
   - Open generated `tests/runs/suites/<run-id>/suite-report.html`.
   - Verify KPI cards: Pass Rate (%), Total Execution Duration, Case Breakdown.
   - Verify interactive collapsible test cases with Step-by-Step execution evidence and Triple-Oracle logs.
   - Verify sensitive test values (passwords, tokens) are masked with `[REDACTED]`.

---

### Scenario 5: Bidirectional Playwright Export (P3)
**Goal**: Verify translating YAML Test Suite into standalone Playwright TypeScript code.

1. **Export to Playwright**:
   ```bash
   qa_export_suite({
     suiteId: "auth-register",
     format: "playwright",
     targetPath: "tests/e2e/auth/auth-register.spec.ts"
   })
   ```
2. **Verify Generated Code**:
   - Inspect `tests/e2e/auth/auth-register.spec.ts`.
   - Verify valid syntax: `import { test, expect } from '@playwright/test';`, `test.describe()`, and `test()` blocks.
   - Run verification via `npx playwright test tests/e2e/auth/auth-register.spec.ts --dry-run`.

