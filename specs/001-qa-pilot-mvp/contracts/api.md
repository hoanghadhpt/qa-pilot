# Phase 1 Interface Contracts: QA Pilot REST & SSE API

**Feature**: `001-qa-pilot-mvp`
**Base URL**: `http://localhost:4000/api`

---

## 1. Specifications API (`/api/specs`)

### `GET /api/specs?projectId=default`
Returns all YAML specs in the project along with their latest run status and production safety evaluation.
- **Response `200 OK`**:
  ```json
  {
    "projectId": "default",
    "specs": [
      {
        "fileName": "TC-01-login-pass.yaml",
        "spec": { "id": "TC-01", "title": "Đăng nhập thành công", "tags": ["auth", "smoke", "read-only"], "environments": { "allowed": ["local", "staging", "production"], "blocked": [] }, "steps": [], "assertions": [] },
        "lastRun": { "status": "PASSED", "runId": "run-20261031-153000", "durationMs": 1420 },
        "prodSafety": { "allowed": true, "reason": null }
      }
    ]
  }
  ```

### `PUT /api/specs/:testId`
Validates and saves updated spec JSON back to its YAML file on disk.
- **Request Body**: `{ "projectId": "default", "fileName": "TC-01-login-pass.yaml", "spec": { ... } }`
- **Response `200 OK`**: `{ "saved": true, "fileName": "TC-01-login-pass.yaml" }`

### `POST /api/specs`
Creates a new YAML test specification file in `tests/projects/<projectId>/specs/`.
- **Request Body**: `{ "projectId": "default", "spec": { ... } }`
- **Response `201 Created`**: `{ "created": true, "fileName": "TC-03-new-case.yaml", "spec": { ... } }`

---

## 2. Environments & Variables API (`/api/envs`)

### `GET /api/envs?projectId=default`
Returns available environments (`local`, `staging`, `production`), their non-secret variable keys, available fixture keys, and secret variable names (values never exposed).
- **Response `200 OK`**:
  ```json
  {
    "environments": [
      { "name": "local", "is_production": false, "base_url": "http://localhost:3000", "allowed_domains": ["localhost"] },
      { "name": "staging", "is_production": false, "base_url": "https://staging.example.com", "allowed_domains": ["staging.example.com"] },
      { "name": "production", "is_production": true, "base_url": "https://app.example.com", "allowed_domains": ["app.example.com"] }
    ],
    "availableHelpers": [
      "${env.BASE_URL}",
      "${secret.STANDARD_USERNAME}",
      "${secret.STANDARD_PASSWORD}",
      "${fixture.users.standard.email}",
      "${faker.email}",
      "${faker.uuid}"
    ]
  }
  ```

---

## 3. Hybrid CDP Runner & SSE API (`/api/runner`)

### `GET /api/runner/cdp-status`
Checks whether Chrome CDP is reachable on `http://127.0.0.1:9222/json/version` and returns browser version, active tab count, and current `headless` mode.

### `GET /api/runner/ai-agents`
Scans the local machine for the 10 supported AI CLI agents (`agy`, `claude`, `gemini`, `opencode`, `qwen`, `codex`, `aider`, `ollama`, `goose`, `copilot`), resolves their installation status, version, and active/configured model, and returns the currently selected `activeAgentId`.
- **Response `200 OK`**:
  ```json
  {
    "activeAgentId": "agy",
    "agents": [
      {
        "id": "agy",
        "name": "Antigravity CLI",
        "command": "agy",
        "installed": true,
        "version": "2.0",
        "model": "gemini-2.5-pro",
        "active": true
      },
      {
        "id": "claude",
        "name": "Claude Code",
        "command": "claude",
        "installed": true,
        "version": "2.1.241",
        "model": "claude-sonnet-4-6",
        "active": false
      },
      {
        "id": "codex",
        "name": "OpenAI Codex",
        "command": "codex",
        "installed": false,
        "version": null,
        "model": "gpt-5-codex",
        "active": false
      }
    ]
  }
  ```

### `POST /api/runner/ai-agents/select`
Changes the active AI CLI agent used for Spec Generation and Failure RCA. Rejects selection if the target agent is not installed on the machine.
- **Request Body**: `{ "agentId": "claude" }`
- **Response `200 OK`**: `{ "activeAgentId": "claude", "agents": [ ... ] }`

### `POST /api/runner/cdp-launch`
Auto-launches or restarts local Chrome with `--remote-debugging-port=9222` and `--user-data-dir=tests/temp/chrome-profile` in `headed` or `headless` mode.

### `POST /api/runner/stop`
Aborts the currently active test execution stream cleanly.

### `GET /api/runner/stream?projectId=default&testId=TC-01&environment=staging&stepId=&headless=false`
Starts a full test run (or single-step dry-run on the persistent CDP tab if `stepId` is provided) over **Server-Sent Events (`text/event-stream`)**.
- **Pre-Flight Production Block (`event: blocked`)**:
  ```text
  event: blocked
  data: {"status":"BLOCKED","reason":"Kịch bản có gắn nhãn 'financial' bị chặn thực thi trên môi trường Production."}
  ```
- **Step Progress (`event: step`)**:
  ```text
  event: step
  data: {"stepId":"step-1","index":1,"status":"RUNNING","description":"Mở trang đăng nhập"}
  ```
- **Triage Progress (`event: triage`)**:
  ```text
  event: triage
  data: {"message":"Đang chụp vùng lỗi và phân tích nguyên nhân gốc rễ bằng AI CLI..."}
  ```
- **Run Complete (`event: complete`)**:
  ```text
  event: complete
  data: {"runId":"run-20261031-153022","summary":{ ...TestRunSummary... }}
  ```

### `GET /api/runner/runs/:runId`
Fetches a stored `summary.json` by `runId`.

### `GET /api/runner/artifacts/:runId/:fileName`
Serves `step-<n>-raw.png` or `step-<n>-annotated.png` from `tests/runs/<runId>/`.

---

## 4. Multimodal AI Spec Generator & Live Exploration API (`/api/generator`)

### `POST /api/generator/explore`
Khám phá trang web thực tế qua kết nối CDP, trích xuất cấu trúc phần tử tương tác và tóm tắt Accessibility Tree phục vụ sinh kịch bản chính xác:
- **Request Body**:
  ```json
  {
    "url": "https://demo.automationtesting.in/Register.html",
    "projectId": "default"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "url": "https://demo.automationtesting.in/Register.html",
    "title": "Register",
    "elements": [
      { "selector": "input[ng-model='FirstName']", "tag": "input", "role": "textbox", "label": "First Name" },
      { "selector": "#submitbtn", "tag": "button", "role": "button", "label": "Submit" }
    ],
    "a11ySummary": "- Form: Register\n- Input 'First Name': input[ng-model='FirstName']\n- Button 'Submit': #submitbtn"
  }
  ```

### `POST /api/generator/generate`
Nhận yêu cầu tự nhiên từ một ô Prompt duy nhất, tự động bóc tách URL/từ khóa, thực thi **Vòng lặp Khám phá Đa màn hình (Multi-Screen Iterative Exploration)** qua CDP và sinh danh sách kịch bản kiểm thử:
- Accepts `multipart/form-data` with:
  - `acceptanceCriteria` (`string`, required): Câu prompt ngôn ngữ tự nhiên mô tả luồng kiểm thử (có thể chứa một hoặc nhiều URL, thao tác qua nhiều màn hình, cuộn trang, kiểm chứng nội dung)
  - `projectId` (`string`, default `"default"`)
  - `environment` (`string`, default `"local"`): Môi trường dùng để lấy `BASE_URL` mặc định nếu trong prompt không ghi rõ URL
  - `image` (`File`, optional): Uploaded Figma wireframe / UI screenshot saved temporarily to `tests/temp/`
- **Response `200 OK`**:
  ```json
  {
    "explorationTrace": [
      {
        "screenIndex": 1,
        "url": "https://vnexpress.net/",
        "title": "Báo VnExpress",
        "actionExecuted": "Mở trang và cuộn xuống cuối trang",
        "elementCount": 55,
        "matchedTexts": [{ "selector": "footer", "text": "Email: bandoc@vnexpress.net" }]
      }
    ],
    "generatedSpecs": [
      {
        "id": "TC-03",
        "title": "Kiểm tra thông tin email liên hệ ở footer trang VnExpress",
        "description": "...",
        "tags": ["smoke", "read-only"],
        "environments": { "allowed": ["local", "staging", "production"], "blocked": [] },
        "steps": [ ... ],
        "assertions": [ ... ]
      }
    ]
  }
  ```

---

## 5. Git Synchronization & Conflict Resolution API (`/api/git`)

### `GET /api/git/status`
Returns current branch, `ahead`, `behind`, modified spec files, and conflict details if any.

### `POST /api/git/sync`
Executes `git pull --rebase`, stages changes in `tests/projects/`, commits with author metadata, and pushes if a remote is configured. If a conflict occurs on a YAML spec, returns `409 Conflict` with step-by-step diff payload for `ConflictModal.tsx`.

### `POST /api/git/resolve`
Accepts the user's chosen step resolution list for a conflicted spec, writes the merged YAML, and completes the rebase/commit.

