# SPECTO (v0.0.1) - INSTRUCTIONS FOR ANTIGRAVITY CLI

> **Role & Objective:** You are an autonomous Senior Full-Stack Engineer and QA Architect. Your mission is to scaffold and implement **Specto (v0.0.1)** from scratch: a local-first, AI-first automated testing dashboard and engine for QA testers using Playwright MCP, Chrome DevTools MCP, Local CLI orchestration, and Git-backed Test-as-Code.

---

## 1. PROJECT OVERVIEW & ARCHITECTURAL PRINCIPLES

- **System Topology:** Monorepo with a Node.js Backend (`server/`, Port 4000) and a React SPA (`client/`, Port 3000).
- **Core Concept:** 
  1. No raw HTML to LLM: only semantic Accessibility (a11y) Tree and filtered delta logs/network failures.
  2. Test-as-Code: Everything is YAML in `tests/projects/<project>/specs/`. No database required.
  3. Safe Execution: Production safety guardrails (hard block on destructive actions/domains).
  4. Visual Evidence: Bounding-box screenshot annotation with `sharp` (red box + label on error) and real-time SSE progress streaming.
  5. Multi-contributor Git: Auto `pull --rebase`, `commit`, and `push` via `simple-git`.

---

## 2. DIRECTORY STRUCTURE TO SCAFFOLD

Create the following file and folder hierarchy:

```text
specto/
├── .mcp.json
├── .gitignore
├── README.md
├── package.json
│
├── tests/
│   ├── projects/
│   │   └── default/
│   │       ├── .env.local
│   │       ├── envs/
│   │       │   ├── local.yaml
│   │       │   ├── staging.yaml
│   │       │   └── production.yaml
│   │       ├── fixtures/
│   │       │   └── users.json
│   │       └── specs/
│   │           ├── TC-01-login-pass.yaml
│   │           └── TC-02-checkout-fail.yaml
│   ├── runs/
│   └── temp/
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── services/
│   │   │   ├── cliRunner.ts          # Spawns CLI subprocess in non-interactive print mode
│   │   │   ├── specAdapter.ts        # YAML <-> JSON conversion and file management
│   │   │   ├── environmentManager.ts # Cascading secrets & prod safety guardrails
│   │   │   ├── imageAnnotator.ts     # Sharp-based SVG red-box overlay on screenshots
│   │   │   ├── gitService.ts         # simple-git wrapper (sync, status, commit, push)
│   │   │   └── artifactManager.ts    # Reads/writes tests/runs/<run_id>
│   │   ├── routes/
│   │   │   ├── specs.ts
│   │   │   ├── runner.ts             # SSE stream endpoint
│   │   │   ├── generator.ts          # Multimodal spec generator endpoint
│   │   │   ├── git.ts
│   │   │   └── envs.ts
│   │   └── prompts/
│   │       ├── triage.md
│   │       └── generator.md
│
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types/
        │   └── index.ts
        ├── components/
        │   ├── Header.tsx            # Project & Env switcher, Git sync status
        │   ├── SuiteSidebar.tsx      # Column 1: Test suites and cases list
        │   ├── StepEditor.tsx        # Column 2: Visual card-based step editor
        │   ├── EvidenceViewer.tsx    # Column 3: Timeline, annotated screenshot, logs, RCA
        │   ├── GenerateSpecModal.tsx # Multimodal dialog (upload Figma image & paste AC)
        │   └── ConflictModal.tsx     # Visual step diff conflict resolver
        └── hooks/
            └── useTestRunner.ts      # EventSource SSE hook
```

---

## 3. CORE CONFIGURATIONS

### 3.1 `.mcp.json` (Root)
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp", "--browser-url=http://127.0.0.1:9222"]
    }
  }
}
```

### 3.2 `.gitignore` (Root)
```gitignore
node_modules/
dist/
.DS_Store
*.log

# Test Artifacts and Temporary Uploads (NEVER COMMIT)
tests/runs/
tests/temp/
*.png
*.har

# Local Secrets
**/.env.local
.env
```

---

## 4. DATA SCHEMAS & CONTRACTS

### 4.1 Spec YAML Schema (`tests/projects/<project>/specs/<testId>.yaml`)
```yaml
id: "TC-01"
title: "Đăng nhập thành công"
description: "Xác thực luồng đăng nhập hợp lệ"
tags: ["auth", "smoke", "read-only"]
environments:
  allowed: ["local", "staging", "production"]
  blocked: []
steps:
  - id: "step-1"
    action: "open"
    target: "${env.BASE_URL}/login"
    description: "Mở trang đăng nhập"
    optional: false
  - id: "step-2"
    action: "input"
    target: "input[name='username']"
    value: "${secret.STANDARD_USERNAME}"
    description: "Nhập tài khoản"
    optional: false
  - id: "step-3"
    action: "input"
    target: "input[name='password']"
    value: "${secret.STANDARD_PASSWORD}"
    description: "Nhập mật khẩu"
    optional: false
    sensitive: true
  - id: "step-4"
    action: "click"
    target: "button[type='submit']"
    description: "Bấm đăng nhập"
    optional: false
  - id: "step-5"
    action: "input"
    target: "input[name='optional_note']"
    value: "Ghi chú thêm"
    description: "Trường không bắt buộc"
    optional: true
    timeout_ms: 2000
assertions:
  - type: "element_visible"
    target: "text='Bảng điều khiển'"
  - type: "no_console_errors"
    severity: "error"
```

### 4.2 Run Summary Schema (`tests/runs/<run_id>/summary.json`)
```json
{
  "runId": "run-20261031-153022",
  "testId": "TC-02",
  "projectId": "default",
  "environment": "staging",
  "status": "FAILED",
  "durationMs": 4250,
  "failedStepIndex": 3,
  "steps": [
    { "stepId": "step-1", "action": "open", "status": "PASSED", "durationMs": 850 },
    { "stepId": "step-2", "action": "click", "status": "PASSED", "durationMs": 320 },
    { "stepId": "step-3", "action": "click", "status": "FAILED", "durationMs": 2000, "error": "Target #btn-pay not found" }
  ],
  "evidence": {
    "rawScreenshot": "step-3-raw.png",
    "annotatedScreenshot": "step-3-annotated.png",
    "boundingBox": { "x": 340, "y": 210, "width": 120, "height": 45 },
    "errorLabel": "Element #btn-pay missing",
    "consoleErrors": ["Uncaught TypeError: Cannot read properties of undefined"],
    "networkFailures": [{ "url": "/api/v1/cart/validate", "status": 500 }]
  },
  "aiDiagnosis": {
    "rootCause": "Nút '#btn-pay' không hiển thị do API '/api/v1/cart/validate' trả về lỗi 500.",
    "recommendation": "Kiểm tra mock service backend hoặc tăng wait timeout."
  }
}
```

---

## 5. BACKEND IMPLEMENTATION REQUIREMENTS

1. **Subprocess CLI Runner (`cliRunner.ts`):**
   - Execute Claude CLI or Antigravity CLI with `-p` flag (non-interactive print mode) and `--dangerously-skip-permissions`.
   - Provide an execution stream converting CLI `stdout` chunks into Server-Sent Events (`data: JSON\n\n`).
   - Clean-slate policy: each testcase execution triggers an independent, isolated subprocess.

2. **Environment & Production Safety (`environmentManager.ts`):**
   - Cascading resolution order: `Global Fixtures` $\rightarrow$ `Project Config (local/staging/production.yaml)` $\rightarrow$ `.env.local`.
   - **Production Guardrails:**
     - Check `is_production: true`.
     - Deny execution if test tags contain `destructive`, `financial`, or `data-creation`.
     - Deny execution if target URL matches non-whitelisted production domains without explicit confirmation.
   - Redact all values matching keys in `.env.local` to `[REDACTED]` before writing to logs or sending to LLM context.

3. **Screenshot Annotator (`imageAnnotator.ts`):**
   - Use `sharp` to composite an SVG overlay over the raw screenshot:
     - Dotted red rectangle (`stroke="#EF4444"`, `stroke-width="3"`, `stroke-dasharray="6"`).
     - Text badge with error reason on top of the box.
   - Save output as `step-<n>-annotated.png`.

4. **Git Engine (`gitService.ts`):**
   - Wrap `simple-git`.
   - Methods: `getStatus()`, `pullRebase()`, `commitAndPushSpec(specPath, testId, author)`.
   - Handle conflict detection by serving a step-by-step JSON diff endpoint.

5. **Multimodal Generator (`generator.ts`):**
   - Accepts multipart form data with text (Acceptance Criteria) and image files (Figma wireframes).
   - Generates JSON-formatted test matrix with Happy Paths and Negative Cases.

---

## 6. FRONTEND (DASHBOARD UI) IMPLEMENTATION REQUIREMENTS

Build a 3-column split view using React 18, Tailwind CSS, and Lucide React:

1. **Top Navigation Bar (`Header.tsx`):**
   - Project Selector dropdown.
   - Environment Selector dropdown (`Local`, `Staging`, `Production`).
     - **Visual Alert:** If `Production` is selected, header border switches to red with a prominent warning badge.
   - Git Status Bar (`Behind: X`, `Ahead: Y`, `[Sync Now]` button).

2. **Column 1: Suite & Case Explorer (`SuiteSidebar.tsx`):**
   - Search bar filtering by ID or Title.
   - Tree view of suites and cases.
   - Status badges (Green = Passed, Red = Failed, Gray = Untested).
   - Tag badges: `[PROD SAFE]` vs `[BLOCKED ON PROD]`.
   - Action: `[✨ Sinh kịch bản bằng AI]` button opening `GenerateSpecModal`.

3. **Column 2: Step Editor (`StepEditor.tsx`):**
   - Action Toolbar: Test ID, title, `[Run Test]` button, `[Save Changes]` button.
     - Disable `[Run Test]` with tooltip if blocked on current environment.
   - Card-based step list with icons (`open`, `input`, `click`, `assert`).
   - Inline editable selectors and values.
   - Variable Helper popup (`${secret.X}`, `${faker.email}`).
   - Checkbox for `Optional Step` (non-blocking).
   - Single step dry-run button (`⚡ Play Step`).
   - Add Step & Reorder controls.

4. **Column 3: Evidence & AI Diagnosis (`EvidenceViewer.tsx`):**
   - Timeline with timestamps and step statuses.
   - Screenshot Inspector with a toggle: `[x] Hiển thị vùng lỗi (Highlight Error)` switching between raw and annotated screenshot.
   - Dark-theme Console Error Log panel.
   - AI Root Cause Diagnosis Card (explaining bug in Vietnamese).
   - Action: `[Copy Bug Report]` button copying formatted Markdown directly to clipboard.

---

## 7. EXECUTION ROADMAP FOR ANTIGRAVITY

Implement this project step-by-step in the following sequence:

1. **Step 1:** Initialize repository structure, root `package.json`, `.mcp.json`, and `.gitignore`.
2. **Step 2:** Scaffold `server/` with Express, TypeScript, `js-yaml`, `sharp`, `simple-git`, and CORS.
3. **Step 3:** Implement server services (`specAdapter`, `environmentManager`, `imageAnnotator`, `cliRunner`).
4. **Step 4:** Build backend routes (`/api/specs`, `/api/runner`, `/api/git`, `/api/generator`).
5. **Step 5:** Scaffold `client/` using Vite + React + Tailwind CSS.
6. **Step 6:** Build the 3-column UI components and connect to backend APIs and SSE stream.
7. **Step 7:** Populate sample testcases (`TC-01-login-pass.yaml`, `TC-02-checkout-fail.yaml`) and create a root `npm run dev` script using `concurrently` to start backend on 4000 and frontend on 3000.