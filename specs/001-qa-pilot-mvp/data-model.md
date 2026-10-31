# Phase 1 Data Model: QA Pilot MVP (v0.0.1)

**Feature**: `001-qa-pilot-mvp`
**Date**: 2026-10-31

All persistence in **QA Pilot** is file-based (`tests/projects/<project>/` and `tests/runs/<runId>/`). No external database is used.

---

## 1. Test Specification (`TestSpec`)

- **Storage Path**: `tests/projects/<projectId>/specs/<fileName>.yaml`
- **Format**: YAML on disk, serialized as JSON over REST API.

| Field | Type | Required | Validation / Constraints |
|-------|------|----------|--------------------------|
| `id` | `string` | Yes | Unique per project (e.g., `"TC-01"`) |
| `title` | `string` | Yes | Non-empty human-readable title |
| `description` | `string` | No | Summary of test purpose |
| `tags` | `string[]` | Yes | Array of tags; `destructive`, `financial`, `data-creation` trigger Production block |
| `environments` | `EnvironmentRule` | Yes | `{ allowed: string[], blocked: string[] }` |
| `steps` | `TestStep[]` | Yes | Ordered list of at least 1 step |
| `assertions` | `TestAssertion[]` | No | Post-step or end-of-test verifications |

### 1.1 `TestStep`
| Field | Type | Required | Validation / Constraints |
|-------|------|----------|--------------------------|
| `id` | `string` | Yes | Unique within spec (e.g., `"step-1"`) |
| `action` | `'open' \| 'input' \| 'click' \| 'scroll' \| 'wait' \| 'assert'` | Yes | Supported CDP step action |
| `target` | `string` | Yes | URL (for `open`), `'bottom'`/`'top'`/selector (for `scroll`), duration/selector (for `wait`), or CSS/text/role selector |
| `value` | `string` | No | Input payload; supports `${env.X}`, `${secret.X}`, `${fixture.X}`, `${faker.X}` |
| `expected` | `string` | No | Post-step expectation (selector, URL fragment, or visible text) |
| `description` | `string` | Yes | Human-readable step label |
| `optional` | `boolean` | Yes | Default `false`. If `true`, failure logs warning without aborting run |
| `sensitive` | `boolean` | No | Default `false`. If `true`, `value` is masked in UI and redacted in logs |
| `timeout_ms` | `number` | No | Default `5000` (or `2000` for optional steps) |

### 1.2 `TestAssertion`
| Field | Type | Required | Validation / Constraints |
|-------|------|----------|--------------------------|
| `type` | `'element_visible' \| 'no_console_errors' \| 'url_contains' \| 'text_visible'` | Yes | Verification type |
| `target` | `string` | No | Selector or expected substring (required for element/url/text assertions) |
| `severity` | `'error' \| 'warning'` | No | Default `'error'` |

---

## 2. Environment Configuration (`EnvironmentConfig`)

- **Storage Paths**:
  - `tests/projects/<projectId>/envs/<envName>.yaml` (`local.yaml`, `staging.yaml`, `production.yaml`)
  - `tests/projects/<projectId>/fixtures/*.json`
  - `tests/projects/<projectId>/.env.local` (Git-ignored secrets)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `'local' \| 'staging' \| 'production'` | Yes | Environment identifier |
| `is_production` | `boolean` | Yes | `true` enables strict Production safety guardrails |
| `base_url` | `string` | Yes | Exposed as `${env.BASE_URL}` |
| `allowed_domains` | `string[]` | Yes | Hostnames permitted when `is_production: true` |
| `variables` | `Record<string, string>` | No | Key-value map exposed as `${env.<KEY>}` |

---

## 3. Test Run Summary & Evidence (`TestRunSummary`)

- **Storage Path**: `tests/runs/<runId>/summary.json`
- **Artifacts in Same Directory**:
  - `step-<n>-raw.png`
  - `step-<n>-annotated.png`
  - `a11y-tree.json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `runId` | `string` | Yes | Format `run-YYYYMMDD-HHmmss` |
| `testId` | `string` | Yes | Reference to `TestSpec.id` |
| `projectId` | `string` | Yes | Project folder name (e.g., `"default"`) |
| `environment` | `string` | Yes | Environment name used for execution |
| `status` | `'RUNNING' \| 'PASSED' \| 'FAILED' \| 'BLOCKED'` | Yes | Overall execution state |
| `startedAt` | `string` | Yes | ISO-8601 timestamp |
| `durationMs` | `number` | Yes | Total elapsed time in milliseconds |
| `failedStepIndex` | `number \| null` | No | 1-based index of failed step if `status === 'FAILED'` |
| `steps` | `StepRunResult[]` | Yes | Per-step execution outcomes |
| `evidence` | `FailureEvidence \| null` | No | Populated when a step fails |
| `aiDiagnosis` | `AiDiagnosis \| null` | No | Vietnamese RCA populated on failure |

### 3.1 `StepRunResult`
| Field | Type | Description |
|-------|------|-------------|
| `stepId` | `string` | Matches `TestStep.id` |
| `action` | `string` | Step action executed |
| `description` | `string` | Step description (redacted) |
| `status` | `'PENDING' \| 'RUNNING' \| 'PASSED' \| 'FAILED' \| 'SKIPPED'` | Step execution status |
| `durationMs` | `number` | Elapsed time in ms |
| `error` | `string \| undefined` | Redacted error message if failed/skipped |

### 3.2 `FailureEvidence`
| Field | Type | Description |
|-------|------|-------------|
| `rawScreenshot` | `string` | Filename of raw PNG in run folder |
| `annotatedScreenshot` | `string` | Filename of `sharp`-annotated PNG in run folder |
| `boundingBox` | `{ x: number, y: number, width: number, height: number }` | Coordinates highlighted on screenshot |
| `errorLabel` | `string` | Short badge text rendered on annotated screenshot |
| `consoleErrors` | `string[]` | Redacted CDP console error messages |
| `networkFailures` | `Array<{ url: string, method?: string, status: number }>` | Failed HTTP/fetch calls captured via CDP |

### 3.3 `AiDiagnosis`
| Field | Type | Description |
|-------|------|-------------|
| `rootCause` | `string` | Explanation of the root cause in Vietnamese |
| `recommendation` | `string` | Actionable fix recommendation in Vietnamese |
| `suggestedSelector` | `string \| undefined` | Optional healed selector derived from the CDP Accessibility Tree for 1-click update |

---

## 4. Git Sync & Conflict Model (`GitStatus`, `SpecConflict`)

| Entity | Fields | Description |
|--------|--------|-------------|
| `GitStatus` | `branch: string`, `ahead: number`, `behind: number`, `modified: string[]`, `hasConflicts: boolean` | Current repository sync state |
| `SpecConflict` | `specPath: string`, `testId: string`, `localSteps: TestStep[]`, `remoteSteps: TestStep[]`, `stepDiffs: Array<{ index: number, local?: TestStep, remote?: TestStep, hasConflict: boolean }>` | Step-by-step conflict structure for `ConflictModal.tsx` |

---

## 5. Multi-Screen Exploration Trace (`ExplorationScreenTrace`)

| Field | Type | Description |
|-------|------|-------------|
| `screenIndex` | `number` | 1-based screen/stage index in the exploration loop |
| `url` | `string` | Live URL at this screen stage |
| `title` | `string` | Page title at this screen stage |
| `actionExecuted` | `string` | Description of the navigation/scroll/click action performed to reach or inspect this screen |
| `elements` | `DiscoveredElement[]` | Interactive elements discovered on this screen |
| `matchedTexts` | `Array<{ selector: string, text: string }>` | Text blocks/elements matching keywords from the user's natural language prompt |

---

## 6. Local AI CLI Agent Info (`AiAgentInfo`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (`'agy' \| 'claude' \| 'gemini' \| 'opencode' \| 'qwen' \| 'codex' \| 'aider' \| 'ollama' \| 'goose' \| 'copilot'`) |
| `name` | `string` | Display name of the AI Agent CLI |
| `command` | `string` | Executable CLI command name |
| `installed` | `boolean` | `true` if the binary is installed and executable on the host machine; `false` disables the option in UI |
| `binaryPath` | `string \| null` | Resolved path to the executable binary on disk (if installed) |
| `version` | `string \| null` | Detected CLI version string |
| `model` | `string` | Active or configured model name for this agent (e.g., `gemini-2.5-pro`, `claude-sonnet-4-6`, `nemotron-3-ultra-free`, `qwen3-coder-plus`) |
| `active` | `boolean` | Whether this agent is currently selected as the primary AI agent in QA Pilot |


