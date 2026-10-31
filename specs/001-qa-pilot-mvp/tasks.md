---
description: "Task list for QA Pilot MVP (v0.0.1) implementation"
---

# Tasks: QA Pilot MVP (v0.0.1)

**Input**: Design documents from `/specs/001-qa-pilot-mvp/`

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`

**Tests**: Verified via live end-to-end execution against `https://demoqa.com/` (`TC-01-login-pass.yaml` and `TC-02-checkout-fail.yaml`) over Chrome DevTools Protocol (CDP).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. All UI components MUST follow Principle VI (Minimalist Interface & Plain Functional Language: Ant Design v5 + clean CSS variables, no Tailwind/PostCSS, no emojis, no hyperbolic marketing terms).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize monorepo directory structure, root scripts, MCP configuration, and TypeScript/React + Ant Design v5 toolchains (without Tailwind/PostCSS bloat).

- [X] T001 Create monorepo directory hierarchy (`server/src/{config,services,routes,prompts}`, `client/src/{types,components,hooks}`, `tests/projects/default/{envs,fixtures,specs}`, `tests/runs`, `tests/temp`) and root `package.json` with `concurrently` scripts (`dev`, `install:all`, `build`) in `package.json`
- [X] T002 [P] Create `.mcp.json` configuring `chrome-devtools-mcp` (`--browser-url=http://127.0.0.1:9222`) and `.gitignore` excluding `node_modules/`, `dist/`, `tests/runs/`, `tests/temp/`, `*.png`, `*.har`, and `**/.env.local` in `.mcp.json` and `.gitignore`
- [X] T003 [P] Initialize backend package and TypeScript configuration (`express`, `cors`, `js-yaml`, `sharp`, `simple-git`, `multer`, `dotenv`, `playwright-core`, `tsx`) in `server/package.json` and `server/tsconfig.json`
- [X] T004 [P] Initialize frontend Vite + React 18 + Ant Design v5 (`antd`, `@ant-design/icons`) configuration and minimalist `styles.css` (CSS variables, 3-column grid layout, zero Tailwind/PostCSS dependencies) in `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`, and `client/src/styles.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core shared types, server configuration, YAML spec adapter, artifact storage manager, and Express API entry point that all user stories rely on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Create server runtime and path configuration (`PORT=4000`, `CDP_URL=http://127.0.0.1:9222`, `TESTS_ROOT`, `CHROME_PROFILE_DIR=tests/temp/chrome-profile`) in `server/src/config/env.ts`
- [X] T006 [P] Define shared frontend & backend TypeScript interfaces (`TestSpec`, `TestStep` with `action: 'open' | 'input' | 'click' | 'assert'`, `optional: boolean`, `sensitive?: boolean`, `timeout_ms?: number`, `TestAssertion` with `type: 'element_visible' | 'no_console_errors' | 'url_contains' | 'text_visible'`, `EnvironmentConfig`, `TestRunSummary`, `FailureEvidence`, `AiDiagnosis` with `rootCause`, `recommendation`, `suggestedSelector?`, `GitStatus`, `SpecConflict`) in `client/src/types/index.ts`
- [X] T007 Implement `specAdapter.ts` for reading, writing, and validating YAML test specifications (`id` unique per project, `title` non-empty, `tags: string[]`, `environments: { allowed: string[], blocked: string[] }`, `steps` ordered list of at least 1 step) in `server/src/services/specAdapter.ts`
- [X] T008 [P] Implement `artifactManager.ts` for creating `tests/runs/<runId>/` (`run-YYYYMMDD-HHmmss`), reading/writing `summary.json`, and resolving `step-<n>-raw.png`, `step-<n>-annotated.png`, and `a11y-tree.json` in `server/src/services/artifactManager.ts`
- [X] T009 Create Express server bootstrap with CORS, JSON body parsing, static artifact serving, and route mounting (`/api/specs`, `/api/envs`, `/api/runner`, `/api/generator`, `/api/git`) in `server/src/index.ts`

**Checkpoint**: Foundation ready — user story implementation can now proceed.

---

## Phase 3: User Story 1 - Soạn thảo và thực thi kịch bản kiểm thử qua CDP với Bằng chứng trực quan & Phân tích lỗi (Priority: P1) 🎯 MVP

**Goal**: Enable QA engineers to browse/edit YAML test cases in a clean minimalist interface, auto-connect or launch Chrome over CDP (`http://127.0.0.1:9222`) in Headed/Headless mode, run full tests or single-step runs (`Chạy bước này`) on a persistent tab, abort active runs (`Dừng`), view zoomable `sharp`-annotated error bounding boxes (with container fallback when selectors are missing), receive Vietnamese AI Root Cause Analysis with selector suggestions (`Áp dụng bộ chọn`), and copy formatted Markdown bug reports.

**Independent Test**: Run `TC-01-login-pass.yaml` (Pass) and `TC-02-checkout-fail.yaml` (Fail) against `https://demoqa.com/`, observe real-time SSE step status updates, verify `step-<n>-annotated.png` red dotted box + label in `EvidenceViewer`, test `Áp dụng bộ chọn`, and click `Sao chép báo cáo`.

### Implementation for User Story 1

- [X] T010 [P] [US1] Implement `imageAnnotator.ts` using `sharp` to composite a dotted red SVG bounding box (`stroke="#EF4444"`, `stroke-width="3"`, `stroke-dasharray="6"`) and high-contrast red error label badge onto `step-<n>-raw.png` to produce `step-<n>-annotated.png` in `server/src/services/imageAnnotator.ts`
- [X] T011 [P] [US1] Create Vietnamese AI RCA prompt template (`triage.md`) instructing the Local AI CLI to analyze the CDP Accessibility Tree (`Accessibility.getFullAXTree`), console errors, and network failures (never raw HTML) and return plain, concise JSON `{ rootCause, recommendation, suggestedSelector }` without emojis or marketing language in `server/src/prompts/triage.md`
- [X] T012 [US1] Implement `cliRunner.ts` with persistent Chrome CDP connection/auto-launch (`--remote-debugging-port=9222`, `--user-data-dir=tests/temp/chrome-profile`), `headed`/`headless` toggle, active run cancellation (`stopRun`), CDP telemetry capture (`Accessibility.getFullAXTree`, `DOM.getBoxModel` with parent/container fallback when selector is missing, `Runtime` console errors, `Network` status `>= 400`), optional step non-blocking handling (`optional: true`, `timeout_ms`), and isolated Local AI CLI subprocess (`claude`/`agy`/`gemini` `-p`) for Vietnamese RCA in `server/src/services/cliRunner.ts`
- [X] T013 [P] [US1] Implement `/api/specs` routes (`GET /api/specs`, `PUT /api/specs/:testId`, `POST /api/specs`) in `server/src/routes/specs.ts`
- [X] T014 [US1] Implement `/api/runner` routes (`GET /api/runner/cdp-status`, `POST /api/runner/cdp-launch`, `POST /api/runner/stop`, `GET /api/runner/stream` SSE endpoint for full run & single-step `stepId` execution, `GET /api/runner/runs/:runId`, `GET /api/runner/artifacts/:runId/:fileName`) in `server/src/routes/runner.ts`
- [X] T015 [P] [US1] Create sample live test cases targeting `https://demoqa.com/text-box` (`TC-01-login-pass.yaml` testing form submission happy path with an `optional: true` step, and `TC-02-checkout-fail.yaml` triggering a missing selector `#btn-pay` failure for visual RCA and `suggestedSelector` replacement) in `tests/projects/default/specs/TC-01-login-pass.yaml` and `tests/projects/default/specs/TC-02-checkout-fail.yaml`
- [X] T016 [P] [US1] Implement `useTestRunner.ts` hook managing `EventSource` SSE streaming, step progress state, `Dừng` trigger, and CDP browser status/mode (`headed`/`headless`) in `client/src/hooks/useTestRunner.ts`
- [X] T017 [P] [US1] Implement Column 1 `SuiteSidebar.tsx` using Ant Design components with search by ID/Title, case list, plain text status tags (`Đạt`/`Lỗi`/`Chưa chạy`), Production safety tags (`An toàn Prod`/`Bị chặn trên Prod`), and `Tạo kịch bản` button (zero emojis) in `client/src/components/SuiteSidebar.tsx`
- [X] T018 [P] [US1] Implement Column 2 `StepEditor.tsx` using Ant Design components with `Chạy kiểm thử`, `Dừng`, `Lưu` (`Cmd/Ctrl+S` and `Cmd/Ctrl+Enter` shortcuts), `Hiện trình duyệt` switch, context-aware step cards (hiding `value` input when action is `open` or `click`), `Bước tùy chọn` checkbox, `Chạy bước này` button, and step add/reorder controls (zero emojis) in `client/src/components/StepEditor.tsx`
- [X] T019 [P] [US1] Implement Column 3 `EvidenceViewer.tsx` using Ant Design `Timeline`, `Image` (with built-in lightbox zoom preview and `Hiển thị vùng lỗi` toggle between raw and annotated PNG), Console/Network error log tabs, plain Vietnamese AI Diagnosis card with `Áp dụng bộ chọn` button, and `Sao chép báo cáo` button (zero emojis) in `client/src/components/EvidenceViewer.tsx`

**Checkpoint**: User Story 1 (MVP) is complete and independently testable against `https://demoqa.com/` over Chrome CDP.

---

## Phase 4: User Story 2 - Bảo vệ an toàn môi trường Production và Quản lý biến mật (Priority: P1)

**Goal**: Provide cascading variable resolution (`Fixtures` → `Env YAML` → `.env.local`), `Chèn biến` popover selector in `StepEditor`, 100% redaction of secret values (`[REDACTED]`) across logs/SSE/AI prompts, and hard Production guardrails blocking `destructive`, `financial`, and `data-creation` specs or non-whitelisted domains.

**Independent Test**: Switch environment to `Production` in `Header`, verify red warning border and `Bị chặn trên Prod` disabled `Chạy kiểm thử` button on `TC-02`, attempt execution via API to confirm backend `BLOCKED` response, and verify `.env.local` values are replaced by `[REDACTED]` in `summary.json`.

### Implementation for User Story 2

- [X] T020 [P] [US2] Create default project fixtures (`users.json`), environment configs (`local.yaml`, `staging.yaml`, `production.yaml` with `base_url: "https://demoqa.com"`, `allowed_domains: ["demoqa.com"]`, `is_production: true` on production), and `.env.local` in `tests/projects/default/fixtures/users.json`, `tests/projects/default/envs/local.yaml`, `tests/projects/default/envs/staging.yaml`, `tests/projects/default/envs/production.yaml`, and `tests/projects/default/.env.local`
- [X] T021 [US2] Implement `environmentManager.ts` with cascading variable interpolation (`${env.X}`, `${secret.X}`, `${fixture.X}`, `${faker.X}`), secret redaction sanitizer (`[REDACTED]` for all `.env.local` keys and `sensitive: true` steps), and Production safety guardrails (`is_production: true` tag & domain whitelist enforcement) in `server/src/services/environmentManager.ts`
- [X] T022 [US2] Implement `/api/envs` route (`GET /api/envs?projectId=default`) returning environment configs and safe variable helper tokens (without exposing secret values) in `server/src/routes/envs.ts`
- [X] T023 [US2] Wire `environmentManager` into `cliRunner.ts` and `specs.ts` for pre-flight Production blocking, variable interpolation before CDP actions, and output redaction in `server/src/services/cliRunner.ts` and `server/src/routes/specs.ts`
- [X] T024 [P] [US2] Implement minimalist `Header.tsx` using Ant Design components with QA Pilot title, Project selector, Environment selector (`Local`, `Staging`, `Production` with red alert border and plain `Môi trường Production` warning tag when active), and plain `CDP: Đã kết nối (9222)` / `Khởi động trình duyệt` control (zero emojis) in `client/src/components/Header.tsx`
- [X] T025 [US2] Add `Chèn biến` Popover selector (`${env.BASE_URL}`, `${secret.STANDARD_USERNAME}`, `${secret.STANDARD_PASSWORD}`, `${faker.email}`) and masked `sensitive` input display to `StepEditor.tsx` in `client/src/components/StepEditor.tsx`

**Checkpoint**: User Stories 1 and 2 are complete; Production guardrails and secret redaction are enforced end-to-end.

---

## Phase 5: User Story 3 - Tạo kịch bản kiểm thử từ tài liệu và hình ảnh giao diện (Priority: P2)

**Goal**: Allow QA engineers to upload a UI/Figma wireframe image and enter Acceptance Criteria in `GenerateSpecModal` so the Local AI CLI generates structured Happy Path and Negative Case YAML specifications and saves them to the project.

**Independent Test**: Click `Tạo kịch bản`, upload an image and enter Acceptance Criteria for a `https://demoqa.com` form, generate specs, save them, and verify the new `.yaml` files appear in `SuiteSidebar`.

### Implementation for User Story 3

- [X] T026 [P] [US3] Create multimodal AI test matrix prompt template (`generator.md`) instructing Local AI CLI to generate schema-compliant Happy Path and Negative Case `TestSpec` JSON objects with plain, concise Vietnamese text (no emojis) in `server/src/prompts/generator.md`
- [X] T027 [US3] Implement `/api/generator` route (`POST /api/generator/generate` with `multer` storing temporary uploads in `tests/temp/` and invoking Local AI CLI with fallback template generation) in `server/src/routes/generator.ts`
- [X] T028 [P] [US3] Implement minimalist `GenerateSpecModal.tsx` using Ant Design `Modal` and `Upload.Dragger` for image upload, Acceptance Criteria input, preview of generated specs, and `Lưu vào dự án` action (zero emojis) in `client/src/components/GenerateSpecModal.tsx`

**Checkpoint**: User Story 3 is complete and independently testable via `Tạo kịch bản`.

---

## Phase 6: User Story 4 - Đồng bộ kịch bản kiểm thử qua Git và Giải quyết xung đột (Priority: P3)

**Goal**: Enable QA teams to check Git sync status (`Ahead`/`Behind`), run `pull --rebase` + `commit` + `push` via `Đồng bộ`, and resolve YAML spec merge conflicts step-by-step in `ConflictModal`.

**Independent Test**: Modify a step in `StepEditor`, click `Lưu`, verify Git status in `Header`, click `Đồng bộ`, and test step-level diff resolution in `ConflictModal`.

### Implementation for User Story 4

- [X] T029 [P] [US4] Implement `gitService.ts` wrapping `simple-git` for `getStatus()`, `pullRebase()`, `commitAndPushSpec()`, and step-by-step YAML conflict diff parsing (`localSteps` vs `remoteSteps`) in `server/src/services/gitService.ts`
- [X] T030 [US4] Implement `/api/git` routes (`GET /api/git/status`, `POST /api/git/sync`, `POST /api/git/resolve`) in `server/src/routes/git.ts`
- [X] T031 [P] [US4] Implement minimalist `ConflictModal.tsx` using Ant Design `Modal` displaying step-by-step diffs (`Bản cục bộ` vs `Bản từ kho chung`) and submitting merged step selections to `/api/git/resolve` (zero emojis) in `client/src/components/ConflictModal.tsx`

**Checkpoint**: All 4 User Stories are complete and independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Assemble the full 3-column application shell in `App.tsx`, write documentation, install dependencies, and validate end-to-end execution against `https://demoqa.com/`.

- [X] T032 Assemble the 3-column dashboard layout with Ant Design `ConfigProvider` (clean minimalist theme tokens) connecting `Header`, `SuiteSidebar`, `StepEditor`, `EvidenceViewer`, `GenerateSpecModal`, and `ConflictModal` in `client/src/App.tsx` and `client/src/main.tsx`
- [X] T033 [P] Create concise `README.md` with QA Pilot architecture, CDP port `9222` setup, `https://demoqa.com/` sample test guide, and Production safety rules in `README.md`
- [X] T034 Install all dependencies (`npm install` at root, `server/`, and `client/`), verify TypeScript compilation (`tsc --noEmit`), verify zero emojis/marketing copy in UI components, and validate `quickstart.md` scenarios against `https://demoqa.com/`

---

## Phase 8: Convergence

**Purpose**: Bổ sung cơ chế kỳ vọng kết quả cho từng bước kiểm thử (`step.expected` / `expectation`) và hoàn thiện giao diện quản lý điều kiện kiểm chứng (`assertions`).

- [X] T035 Bổ sung trường `expected?: string` cho `TestStep` trong `client/src/types/index.ts`, `server/src/services/specAdapter.ts` và logic xác thực schema YAML per `FR-002` (missing)
- [X] T036 Cập nhật `server/src/services/cliRunner.ts` để kiểm chứng kỳ vọng từng bước (`step.expected` hoặc `action: 'assert'` với so khớp văn bản/hiển thị) và hỗ trợ đầy đủ các kiểu assertion (`url_contains`, `text_visible`, `element_visible`, `no_console_errors`) per `FR-002`, `FR-003` (partial)
- [X] T037 Cập nhật giao diện `client/src/components/StepEditor.tsx` hiển thị ô nhập `Kỳ vọng` cho bước kiểm thử và khu vực quản lý danh sách `Điều kiện kiểm chứng (assertions)` của kịch bản per `FR-010.2` (missing)

---

## Phase 9: Live Page Exploration & Exact Selector Discovery (Explore Test)

**Purpose**: Bổ sung cơ chế khám phá trang web trực tiếp qua CDP (`http://127.0.0.1:9222`) trước khi sinh kịch bản để tự động trích xuất các phần tử tương tác thực tế và ghép vào các bước test với selector chính xác 100%.

- [X] T038 Xây dựng phương thức `explorePage(url: string)` trong `server/src/services/cliRunner.ts` trích xuất danh sách Interactive Elements (input, button, select, link) và a11y summary qua CDP session per `FR-011`
- [X] T039 Xây dựng endpoint `POST /api/generator/explore` và cập nhật `POST /api/generator/generate` trong `server/src/routes/generator.ts` cùng prompt `server/src/prompts/generator.md` để nạp các selector thật vào AI generator
- [X] T040 Cập nhật giao diện `client/src/components/GenerateSpecModal.tsx` thêm ô nhập Live URL, nút `Khám phá trang`, thẻ hiển thị các phần tử đã phát hiện và tự động điền URL vào kịch bản sinh ra
- [X] T041 Kiểm thử thực tế tính năng Explore Test với `https://demo.automationtesting.in/Register.html` và một trang tin tức/biểu mẫu thực tế, xác thực các bước sinh ra có selector thật và chạy đạt (PASSED)

---

## Phase 10: One-Prompt Multi-Screen Autonomous Exploration & Spec Generation

**Purpose**: Chuyển đổi sang luồng "1-Prompt Duy Nhất — Hệ thống Tự Động Hóa Toàn Bộ", hỗ trợ lệnh `scroll` / `wait` và Vòng lặp Khám phá Đa màn hình (Multi-Screen Iterative Exploration) qua CDP.

- [X] T042 Mở rộng `StepAction` thêm `'scroll'` và `'wait'` trong `client/src/types/index.ts`, `server/src/services/specAdapter.ts`, `server/src/services/cliRunner.ts` và `client/src/components/StepEditor.tsx` per `FR-002`
- [X] T043 Xây dựng Vòng lặp Khám phá Đa màn hình `exploreMultiStageFlow(prompt: string, defaultBaseUrl?: string)` và tối ưu hóa `invokeLocalAiCli` (truyền prompt qua `stdin`, bỏ load MCP thừa, timeout 45s) trong `server/src/services/cliRunner.ts` per `FR-011`
- [X] T044 Cập nhật `server/src/routes/generator.ts` và `server/src/prompts/generator.md` để tự động bóc tách URL/ý định từ 1 câu prompt, chạy khám phá đa màn hình và tổng hợp kịch bản chính xác (loại bỏ hoàn toàn dummy fallback `Register.html`) per `FR-011`
- [X] T045 Thiết kế lại `client/src/components/GenerateSpecModal.tsx` về 1 ô nhập Prompt duy nhất, hiển thị tiến trình tự động và nhật ký các màn hình đã khám phá (`ExplorationTrace`) per `FR-011`, `FR-014`
- [X] T046 Kiểm thử thực tế E2E: (1) Kịch bản cuộn trang kiểm tra footer trên `https://vnexpress.net/`, và (2) Kịch bản thao tác chuyển qua nhiều màn hình/bước, đảm bảo sinh đúng selector và chạy đạt (`PASSED`)

---

## Phase 11: Header AI Agent Switcher & 10-Agent Model Discovery

**Purpose**: Hiển thị menu thả xuống (`Select`) trên thanh Header giúp kỹ sư QA biết chính xác đang kết nối với AI Agent CLI nào và sử dụng Model gì trong 10 Agent thông dụng (`agy`, `claude`, `gemini`, `opencode`, `qwen`, `codex`, `aider`, `ollama`, `goose`, `copilot`), tự động vô hiệu hóa (`disabled`) các Agent chưa được cài đặt trên máy (`FR-015`).

- [X] T047 Bổ sung kiểu dữ liệu `AiAgentInfo` vào `client/src/types/index.ts` và `server/src/services/cliRunner.ts`
- [X] T048 Xây dựng bộ quét 10 AI Agent (`getAiAgents`, `selectAiAgent`, `resolveAgentBinary`, `detectAgentModel`) và ưu tiên gọi Agent đang chọn trong `invokeLocalAiCli` tại `server/src/services/cliRunner.ts` per `FR-015`
- [X] T049 Bổ sung API `GET /api/runner/ai-agents` và `POST /api/runner/ai-agents/select` tại `server/src/routes/runner.ts` per `contracts/api.md`
- [X] T050 Tích hợp dropdown chọn AI Agent và hiển thị Model vào `client/src/components/Header.tsx`, `client/src/hooks/useTestRunner.ts`, và `client/src/App.tsx` per `FR-014`, `FR-015`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — blocks all user stories.
- **User Story 1 (Phase 3 - P1 MVP)**: Depends on Foundational (Phase 2).
- **User Story 2 (Phase 4 - P1 Safety & Secrets)**: Depends on Foundational (Phase 2) and integrates with `cliRunner.ts` / `StepEditor.tsx` from US1.
- **User Story 3 (Phase 5 - P2 AI Generator)**: Depends on Foundational (Phase 2).
- **User Story 4 (Phase 6 - P3 Git Sync)**: Depends on Foundational (Phase 2).
- **Polish (Phase 7)**: Depends on Phases 3–6.
