# Data Model: Test Suite Management & AI Suite Generator

**Feature ID**: `006-test-suite-management`  
**Status**: Ready  
**Date**: 2026-11-07  

---

## 1. Entity Relationship Diagram

```text
+---------------------+
|     TestModule      |
+---------------------+
| id: string          |
| name: string        |
| description: string |
+---------------------+
           | 1
           | has many
           v *
+---------------------+           +--------------------------+
|      TestSuite      |           |    SuiteExecutionRun     |
+---------------------+           +--------------------------+
| id: string          |           | runId: string            |
| module: string      |           | suiteId: string          |
| name: string        |           | startedAt: string        |
| target_url: string  |           | finishedAt: string       |
| tags: string[]      |           | durationMs: number       |
| cases: TestCase[]   |---------->| totalCases: number       |
+---------------------+           | passedCases: number      |
           | 1                    | failedCases: number      |
           | contains             | results: CaseResult[]    |
           v *                    +--------------------------+
+---------------------+                         |
|      TestCase       |                         |
+---------------------+                         v
| id: string          |           +--------------------------+
| title: string       |           |  TestCaseExecutionResult |
| priority: P1-P4     |           +--------------------------+
| type: CaseType      |           | caseId: string           |
| auth_role?: string  |           | status: pass/fail/skip   |
| steps: TestStep[]   |           | durationMs: number       |
| assertions: str[]   |           | stepResults: StepRes[]   |
+---------------------+           | oracleIssues: Issue[]    |
           | 1                    +--------------------------+
           | contains
           v *
+---------------------+
|      TestStep       |
+---------------------+
| step: number        |
| action: string      |
| data?: string       |
| expected: string    |
| optional?: boolean  |
+---------------------+
```

---

## 2. Entity Specifications

### 2.1 `TestSuite`
Represents a cohesive collection of test cases covering a specific application feature or workflow. Persisted as a YAML file under `tests/suites/<module>/<suite-id>.yaml`.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique suite ID (lowercase slug, e.g. `auth-login`, `checkout-cart`). |
| `module` | `string` | Yes | Parent module name (e.g. `auth`, `order`, `settings`). |
| `name` | `string` | Yes | Human-readable suite title (e.g. `Xác thực đăng nhập người dùng`). |
| `description` | `string` | No | Scope, business context, and coverage description. |
| `target_url` | `string` | No | Default entry URL for the suite scenarios. |
| `environment` | `string` | No | Target environment name (default: `local`). |
| `tags` | `string[]` | Yes | Searchable tags (e.g. `["smoke", "auth", "p1"]`). |
| `created_at` | `string` | Yes | ISO 8601 creation timestamp. |
| `updated_at` | `string` | Yes | ISO 8601 last modified timestamp. |
| `cases` | `TestCase[]` | Yes | Ordered list of test cases in this suite. |

### 2.2 `TestCase`
Detailed specification of a single test scenario adhering to ISTQB / IEEE 29119 BDD structure.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique case identifier (e.g. `TC-AUTH-001`). |
| `title` | `string` | Yes | Concise description of the test scenario. |
| `description` | `string` | No | In-depth context or hypothesis being validated. |
| `priority` | `CasePriority` | Yes | `P1` (Critical), `P2` (High), `P3` (Medium), `P4` (Low). |
| `type` | `CaseType` | Yes | Heuristic category: `happy_path`, `negative_validation`, `boundary_value`, `security_probe`, `idempotency`. |
| `tags` | `string[]` | Yes | Tags for selective execution (e.g. `["smoke", "critical"]`). |
| `auth_role` | `string` | No | Required authentication role (e.g. `admin`, `guest`, `customer`). Triggers auto-auth loading. |
| `preconditions` | `string[]` | Yes | Prerequisites that must be true before execution begins. |
| `steps` | `TestStep[]` | Yes | Ordered action sequence to perform. |
| `assertions` | `string[]` | Yes | Visual or semantic expectations that verify success. |
| `postconditions` | `string[]` | No | Expected state cleanup or teardown conditions. |

### 2.3 `TestStep`
An individual step within a test case.

| Field | Type | Required | Description |
|---|---|---|---|
| `step` | `number` | Yes | Sequential step number (1, 2, 3...). |
| `action` | `string` | Yes | Plain-language instruction (e.g. "Nhập email vào ô Email"). |
| `data` | `string` | No | Input value or payload (e.g. `test@example.com`). |
| `expected` | `string` | Yes | Expected visual/system response for this specific step. |
| `optional` | `boolean` | No | If true, step failure does not abort the test case (default: `false`). |

### 2.4 `SuiteExecutionRun` & `TestCaseExecutionResult`
Telemetry captured when running a test suite.

```typescript
export interface SuiteExecutionRun {
  runId: string;
  suiteId: string;
  suiteName: string;
  module: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  skippedCases: number;
  filterTags?: string[];
  results: TestCaseExecutionResult[];
  reportPath: string;
}

export interface TestCaseExecutionResult {
  caseId: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  type: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  steps: StepExecutionResult[];
  oracleIssues: any[];
  errorMessage?: string;
}

export interface StepExecutionResult {
  stepIndex: number;
  action: string;
  expected: string;
  status: 'passed' | 'failed' | 'skipped' | 'warning';
  durationMs: number;
  screenshotBefore?: string;
  screenshotAfter?: string;
  errorMessage?: string;
}
```

---

## 3. Validation Rules

1. **Suite ID Rule**: Must match `^[a-z0-9_-]{3,50}$`. No spaces, no uppercase characters.
2. **Case ID Rule**: Must match `^TC-[A-Z0-9_-]+-[0-9]{3}$` (e.g. `TC-AUTH-001`).
3. **Completeness Rule**: Every `TestCase` MUST contain at least one step and at least one assertion.
4. **Heuristic Coverage Rule**: When AI generates a suite for a module, the generated suite MUST include at least one `happy_path` case and at least one `negative_validation` case.
5. **Secret Redaction Rule**: Any `data` field or test parameter matching secret patterns MUST be registered in `globalRedactor` before saving or reporting.

