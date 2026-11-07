# Research & Architectural Decisions: Test Suite Management & AI Suite Generator

**Feature ID**: `006-test-suite-management`  
**Status**: Completed  
**Date**: 2026-11-07  

---

## 1. AI Suite Generation Heuristic Pipeline

### Context
Generating E2E tests purely with unconstrained LLM prompts often produces generic, redundant happy-path cases while missing subtle boundary edge cases, input validation limits, and security vulnerabilities. To empower end users with a robust, production-grade test suite, we need a deterministic generation heuristic.

### Decision
Implement `SuiteGeneratorEngine` using the **SFDIPOT & BVA Test Heuristic Framework**:
1. **Inspection / Context Ingestion**:
   - If a target URL is provided: Attach to the page via Playwright, extract the semantic Accessibility (a11y) tree and interactive elements (input inputs, buttons, dropdowns) via `midsceneBridge.inspect()`.
   - If a requirement prompt is provided: Extract the domain actors, actions, validation rules, and postconditions.
2. **Four Mandatory Test Categories**:
   - **Category 1: Happy Path (`happy_path`, Priority: P1)**: The standard success scenario with valid inputs and expected dashboard/confirmation redirect.
   - **Category 2: Negative Validation (`negative_validation`, Priority: P1/P2)**: Missing mandatory fields, invalid email/phone formats, mismatched passwords.
   - **Category 3: Boundary Value Analysis (`boundary_value`, Priority: P2)**: Max field length bounds (e.g. 255 chars), zero/negative values for quantities/prices, Unicode special characters, and Naughty Strings.
   - **Category 4: Security & Permissions (`security_probe`, Priority: P2/P3)**: Script tag injection probes (`<script>alert(1)</script>`), SQL single-quote injection probes (`' OR '1'='1`), and role permission boundaries (e.g., guest attempting to access admin route).
3. **Structured Test Case Output**:
   - Each generated test case contains: `id`, `title`, `priority`, `type`, `tags`, `auth_role`, `preconditions`, `steps` (action, data, expected), and `assertions`.

### Alternatives Evaluated
- *Pure DOM Crawler (like testpilot-ai)*: Misses business logic and semantic intent.
- *Manual Test Editor Only*: High human toil, slow adoption for non-QA team members.

---

## 2. Test-as-Code YAML Storage Structure

### Context
Per Constitution Principle II (Zero-Database Persistence), all test definitions, configuration, and suite metadata must be versioned in Git without relying on external databases (like MySQL/PostgreSQL in Kiwi TCMS).

### Decision
Store Test Suites as standard, human-readable YAML files in the repository:
```text
tests/
└── suites/
    ├── auth/
    │   ├── login.yaml
    │   └── register.yaml
    └── checkout/
        ├── cart.yaml
        └── payment.yaml
```

Each file contains:
- `id`: Unique suite identifier (e.g., `auth-login`)
- `module`: Feature module name (e.g., `Authentication`)
- `name`: Human-readable title
- `description`: Scope and business objectives
- `target_url`: Default URL for the suite
- `tags`: Global tags (e.g., `["auth", "core"]`)
- `cases`: Array of standardized `TestCase` objects

### Rationale
- **Zero Database**: 100% file-based; changes are tracked via Git PRs and commits.
- **Easy Diffing & Collaboration**: QA and developers can review test cases using standard code review workflows.
- **Fast Serialization**: Handled natively using the high-performance `yaml` npm package.

---

## 3. Suite Execution Engine & Multi-Role Coordination

### Context
When running a full test suite, cases may require different user permissions (`admin`, `staff`, `customer`, `guest`). In addition, users need to filter execution (e.g., run only `@smoke` tests on quick pull requests).

### Decision
Implement `SuiteRunnerEngine` (`packages/mcp-server/src/engine/suiteRunner.ts`):
1. **Filtering Mechanism**: Filter test cases by `tags` (e.g. `smoke`, `regression`) and/or `priority` (e.g. `P1`).
2. **Context & Auth Switching**:
   - Before executing a test case, if `case.auth_role` is specified and different from the currently active session, the runner invokes `authManager.loadSession(role)` (Feature 005) to restore session cookies and localStorage in 0.05s.
   - If `auth_role` is `'guest'`, the runner clears cookies via `authManager.clearSession()`.
3. **Step Execution & Triple-Oracle Delta**:
   - Steps execute through `midsceneBridge.act()` and `midsceneBridge.assert()`.
   - `oracleWatcher` captures console logs, uncaught exceptions, and HTTP 4xx/5xx errors on each step.
   - Captures screenshots before and after each action.
4. **Resilience**: If a non-optional step fails, the test case is marked `failed`, but subsequent test cases in the suite continue executing, collecting complete suite analytics.

---

## 4. Aggregated Suite Visual Reporting Architecture

### Context
Individual test reports show single-run timelines. A Test Suite needs an executive dashboard summarizing overall module health, pass rate, failure categorizations, and detailed step drill-downs.

### Decision
Implement `SuiteReportManager` (`packages/mcp-server/src/engine/suiteReportManager.ts`):
- Generates a standalone HTML dashboard at `tests/runs/suites/<suite_run_id>/suite-report.html`.
- **KPI Summary Grid**: Total Cases, Pass Rate (%), Total Execution Duration, Triple-Oracle Issues.
- **Filter Bar**: Click to filter cases by status (`All`, `Passed`, `Failed`, `Skipped`) or by Tag (`smoke`, `p1`, `boundary`).
- **Interactive Collapsible Case Cards**:
  - Case metadata badges: Priority (`P1`, `P2`), Type (`happy_path`, `negative_validation`, `boundary_value`), Auth Role (`admin`).
  - Step timeline table with execution latency and expected vs actual result.
  - Lightbox modal for full-resolution screenshots.
- **Strict Secret Redaction**: All tokens, passwords, and sensitive strings run through `globalRedactor` before HTML serialization.

---

## 5. Bidirectional Playwright Export

### Context
Developers and CI/CD engineers need to run generated tests natively in CI (GitHub Actions, GitLab CI) using standard Playwright test runners without MCP dependencies.

### Decision
Implement `SuiteExporter` (`packages/mcp-server/src/engine/suiteExporter.ts`):
- Converts `TestSuite` YAML into standard TypeScript Playwright test files (`tests/e2e/<module>/<suite-id>.spec.ts`).
- Generates:
  - `import { test, expect } from '@playwright/test';`
  - `test.describe('<Suite Name>', () => { ... })`
  - Auth setup in `test.use({ storageState: 'tests/fixtures/auth/<role>.json' })` per role.
  - Natural step translation into Playwright locators and assertions.

