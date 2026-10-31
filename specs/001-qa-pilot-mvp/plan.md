# Implementation Plan: QA Pilot MVP (v0.0.1)

**Branch**: `001-qa-pilot-mvp` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-qa-pilot-mvp/spec.md`

## Summary

Build **QA Pilot (v0.0.1)** — a local-first automated testing dashboard and hybrid execution engine for QA engineers. The system pairs **Chrome DevTools Protocol (CDP)** (`http://127.0.0.1:9222` & `chrome-devtools-mcp`) for deterministic browser step execution, live page exploration & selector discovery, semantic Accessibility (a11y) Tree extraction, DOM bounding-box lookup, and console/network telemetry capture with **Local AI CLI subprocesses** (`claude` / `agy` / `gemini` in `-p` print mode) for Vietnamese Root Cause Analysis (RCA) and test generation from Live Page Explorations + UI wireframes + Acceptance Criteria. The frontend uses **Ant Design (`antd` v5) + minimal CSS variables** (replacing Tailwind CSS) and strictly enforces minimalist copywriting (zero emojis, zero hyperbolic/marketing phrasing, context-aware form fields).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (Backend & Frontend)

**Primary Dependencies**:
- **Backend (`server/`)**: `express`, `cors`, `js-yaml`, `sharp`, `simple-git`, `multer`, `dotenv`, `playwright-core` (for `chromium.connectOverCDP('http://127.0.0.1:9222')` + native CDP session `Accessibility.getFullAXTree`, `DOM.getBoxModel`, `Runtime`, `Network`)
- **Frontend (`client/`)**: `react` 18, `react-dom` 18, `vite`, `antd` v5 (zero PostCSS/Tailwind config), `@ant-design/icons` (minimal structural icons only; no emojis)
- **MCP Configuration (`.mcp.json`)**: `chrome-devtools-mcp` (`--browser-url=http://127.0.0.1:9222`)

**Storage**: File-based YAML/JSON (`tests/projects/<project>/specs/*.yaml`, `envs/*.yaml`, `fixtures/*.json`, `.env.local`, and `tests/runs/<runId>/summary.json` + PNG screenshots). Zero database dependency.

**Testing**: Live end-to-end verification against **`https://demoqa.com/`** via sample specs (`TC-01-login-pass.yaml` and `TC-02-checkout-fail.yaml`) using persistent Chrome CDP session (`--remote-debugging-port=9222`, `--user-data-dir=tests/temp/chrome-profile`), fallback bounding boxes, and suggested selector updates (`suggestedSelector`).

**Target Platform**: Local developer/QA workstation (macOS / Linux / Windows) running Chrome/Chromium with CDP and Node.js.

**Project Type**: Full-stack Monorepo Web Application (`server/` on port `4000` + `client/` SPA on port `3000`).

**Performance Goals**:
- Step progress feedback via SSE in `<100ms` per state change
- `sharp` SVG bounding-box screenshot annotation in `<100ms`
- Full deterministic test run startup overhead `<2s` when attaching to local CDP endpoint (`http://127.0.0.1:9222`)

**Constraints**:
- Never send raw HTML to LLM prompts (only semantic CDP Accessibility Tree + filtered console/network failure deltas)
- Hard-block `destructive`, `financial`, and `data-creation` specs and non-whitelisted domains when `is_production: true`
- 100% redaction of `.env.local` secret values to `[REDACTED]` across logs, SSE events, `summary.json`, and AI prompts
- Strict minimalist UI & copywriting: no Tailwind CSS, no emojis, no hyperbolic phrases ("1-click", "magic", "smart", etc.)

**Scale/Scope**: Single-repo monorepo supporting multiple test projects (`tests/projects/<projectId>/`), dozens to hundreds of YAML test cases per project, and real-time local execution.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Enforcement in Design |
|-----------|--------|-----------------------|
| **I. Semantic Context Only (No Raw HTML to LLM)** | PASS | CDP session queries `Accessibility.getFullAXTree` + filtered `Runtime.consoleAPICalled` / `Network.responseReceived` (`status >= 400`); raw DOM HTML is never serialized to AI prompts. |
| **II. Test-as-Code & Zero-Database Persistence** | PASS | `specAdapter.ts` and `artifactManager.ts` read/write YAML and JSON directly under `tests/projects/` and `tests/runs/`. |
| **III. Production Safety & Secret Redaction (NON-NEGOTIABLE)** | PASS | `environmentManager.ts` enforces pre-flight tag/domain blocks on `is_production: true` and provides `redact(text)` applied to all SSE, file, and prompt outputs. |
| **IV. Hybrid CDP Execution & Actionable Visual Evidence** | PASS | `cliRunner.ts` executes steps over CDP (`http://127.0.0.1:9222`), annotates failure screenshots via `imageAnnotator.ts` (`sharp`), and invokes Local AI CLI (`-p`) for Vietnamese RCA. |
| **V. Safe Multi-Contributor Git Synchronization** | PASS | `gitService.ts` wraps `simple-git` for status, `pull --rebase`, commit/push, and parses YAML step diffs for `ConflictModal.tsx`. |
| **VI. Minimalist Interface & Plain Functional Language** | PASS | Built with `antd` v5 + clean CSS variables; all labels are plain Vietnamese functional text with zero emojis and zero marketing hyperbole; step cards hide unused fields automatically. |

## Project Structure

### Documentation (this feature)

```text
specs/001-qa-pilot-mvp/
├── plan.md              # This implementation plan (/speckit-plan output)
├── research.md          # Phase 0 architectural decisions & CDP research
├── data-model.md        # Phase 1 YAML/JSON schemas and entity models
├── quickstart.md        # Phase 1 startup & end-to-end validation guide
├── contracts/
│   └── api.md           # Phase 1 REST & SSE endpoint contracts
└── tasks.md             # Phase 2 actionable task list (/speckit-tasks output)
```

### Source Code (repository root)

```text
qa-pilot/
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
│   └── src/
│       ├── index.ts
│       ├── config/
│       │   └── env.ts
│       ├── services/
│       │   ├── cliRunner.ts          # Hybrid CDP runner + Local AI CLI (-p) subprocess orchestrator
│       │   ├── specAdapter.ts        # YAML <-> JSON conversion and schema validation
│       │   ├── environmentManager.ts # Cascading variables, secret redaction & prod guardrails
│       │   ├── imageAnnotator.ts     # Sharp-based SVG red-box overlay on CDP screenshots
│       │   ├── gitService.ts         # simple-git wrapper & step-level YAML conflict diffing
│       │   └── artifactManager.ts    # Reads/writes tests/runs/<run_id> summaries & images
│       ├── routes/
│       │   ├── specs.ts
│       │   ├── runner.ts             # SSE stream & CDP lifecycle endpoints
│       │   ├── generator.ts          # Multimodal spec generator endpoint (image + AC)
│       │   ├── git.ts
│       │   └── envs.ts
│       └── prompts/
│           ├── triage.md
│           └── generator.md
│
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── styles.css                # Minimalist layout & CSS variables (no Tailwind/PostCSS)
        ├── types/
        │   └── index.ts
        ├── components/
        │   ├── Header.tsx            # QA Pilot header, Project/Env switcher, CDP status, Git sync
        │   ├── SuiteSidebar.tsx      # Column 1: Search, cases list, status & Prod badges, Create button
        │   ├── StepEditor.tsx        # Column 2: Minimalist step cards (context-aware fields), Variable picker
        │   ├── EvidenceViewer.tsx    # Column 3: Timeline, zoomable screenshot inspector, logs, RCA
        │   ├── GenerateSpecModal.tsx # Dialog to upload design image & enter Acceptance Criteria
        │   └── ConflictModal.tsx     # Step-by-step Git conflict resolver
        └── hooks/
            └── useTestRunner.ts      # EventSource SSE hook for real-time step & triage updates
```

**Structure Decision**: Monorepo with `server/` (Express + TypeScript + CDP + Sharp + Simple-Git), `client/` (React 18 + Vite + Ant Design v5 + minimal `styles.css` 3-column dashboard), and `tests/` (Git-backed YAML specs, environment configs, and ignored run artifacts).

## Complexity Tracking

No Constitution violations exist. All 6 Core Principles pass without exception.

---

## Phase 9: Live Page Exploration & Exact Selector Discovery (Explore Test)

### Objective
Giải quyết khoảng trống lớn nhất giữa lý thuyết và thực tiễn: Khi tạo kịch bản mới, thay vì AI phải "đoán mò" selector từ tài liệu văn bản hoặc sinh fallback mặc định, hệ thống mở trang qua CDP (`http://127.0.0.1:9222`), thực hiện bước **Khám phá trang (Explore)** để đọc các phần tử tương tác thực tế (`buttons`, `inputs`, `forms`, `links`) và cây Accessibility Tree, từ đó sinh kịch bản với selector chính xác 100%.

### Technical Design:
1. **Backend (`server/src/routes/generator.ts` & `cliRunner.ts`)**:
   - Thêm phương thức `explorePage(url: string)` trong `cliRunner`:
     - Kết nối CDP, mở URL đích trên tab persistent.
     - Chờ trang tải (`domcontentloaded` / `networkidle`).
     - Trích xuất danh sách Interactive Elements: thẻ `<input>`, `<button>`, `<select>`, `<textarea>`, `<a>` kèm thuộc tính định danh (`id`, `name`, `ng-model`, `placeholder`, `aria-label`, text).
     - Rút gọn cây Accessibility Tree (chỉ giữ lại các nút tương tác).
   - Thêm endpoint `POST /api/generator/explore`: trả về danh sách elements và a11y summary.
   - Cập nhật `POST /api/generator/generate`: nhận `targetUrl` và `discoveredElements`, chèn trực tiếp vào prompt `generator.md` để AI sinh ra các bước với selector thật.

2. **Frontend (`client/src/components/GenerateSpecModal.tsx`)**:
   - Thêm ô nhập: **Đường dẫn URL trang web (Live URL)** (ví dụ: `https://demo.automationtesting.in/Register.html` hoặc `https://vnexpress.net/`).
   - Nút bấm: **Khám phá trang (Explore)**.
   - Hiển thị danh sách tóm tắt các phần tử đã phát hiện (ví dụ: 12 ô nhập liệu, 3 nút bấm) trước khi bấm **Tạo danh sách đề xuất**.
   - Giao diện Ant Design tối giản, phản hồi nhanh, không dùng emoji.

---

## Phase 10: One-Prompt Multi-Screen Autonomous Exploration & Spec Generation

### Objective
Tối ưu hóa toàn diện luồng tạo kịch bản theo triết lý **"1-Prompt Duy Nhất — Hệ thống Tự Động Hóa Toàn Bộ"**:
1. Người dùng chỉ cần nhập một câu prompt tự nhiên duy nhất (không cần tách URL hay bấm khám phá thủ công).
2. Hệ thống hỗ trợ các thao tác `scroll` (cuộn trang), `wait` (chờ tải trang/phần tử) và **Vòng lặp Khám phá Đa màn hình (Multi-Screen Iterative Exploration)** qua CDP.
3. Giải quyết triệt để lỗi AI CLI timeout do xung đột `.mcp.json` và loại bỏ hoàn toàn kịch bản giả (`Register.html` dummy fallback).

### Technical Design:
1. **Mở rộng Tập lệnh Engine (`StepAction` trong `types/index.ts`, `specAdapter.ts`, `cliRunner.ts`, `StepEditor.tsx`)**:
   - Thêm action `scroll`: hỗ trợ `target: "bottom"` (cuộn xuống cuối trang), `"top"` (cuộn lên đầu trang), hoặc bộ chọn CSS cụ thể (ví dụ: `"footer"`, `"#section-id"`).
   - Thêm action `wait`: hỗ trợ chờ một khoảng thời gian (`value: "1000"`) hoặc chờ một phần tử/URL xuất hiện khi chuyển màn hình.

2. **Vòng lặp Khám phá Đa màn hình (`exploreMultiStageFlow(prompt, baseUrl)` trong `cliRunner.ts`)**:
   - **Tự động bóc tách URL & Từ khóa**: Trích xuất danh sách URL từ prompt (hoặc lấy `BASE_URL` của môi trường đang chọn nếu không có URL tuyệt đối) và các cụm từ khóa quan trọng (nội dung trong dấu nháy, email, tên nút/menu, chuyên mục).
   - **Khám phá Chặng 1 (Màn hình khởi đầu)**:
     - Mở URL trên CDP, tự động cuộn trang từ trên xuống dưới để kích hoạt toàn bộ phần tử lazy-load (như `footer`), sau đó thu thập:
       - Danh sách Interactive Elements (`input`, `button`, `select`, `a`).
       - Danh sách `matchedTexts`: các phần tử DOM chứa văn bản khớp với từ khóa trong prompt (kèm bộ chọn chính xác như `footer`, `p:has-text("...")`).
   - **Khám phá Chặng 2..N (Chuyển tiếp Đa màn hình / Đa bước)**:
     - Phân tích xem prompt có yêu cầu chuyển tiếp qua màn hình khác không (ví dụ: bấm vào một chuyên mục/menu/nút bấm hoặc nhập tìm kiếm rồi chuyển trang).
     - Tự động thực thi thao tác chuyển màn hình ngay trên trình duyệt CDP (ví dụ: click vào link/button khớp với từ khóa bước trung gian trong prompt hoặc mở URL thứ 2), đợi màn hình mới tải xong rồi quét tiếp cấu trúc DOM/A11y của màn hình mới.
     - Ghi nhận toàn bộ chuỗi `ExplorationScreenTrace[]` qua các màn hình.

3. **Tối ưu hóa Gọi AI CLI (`invokeLocalAiCli` trong `cliRunner.ts`) & Tổng hợp Kịch bản (`generator.ts`)**:
   - Truyền toàn bộ prompt qua luồng `stdin` thay vì đối số dòng lệnh (`args`).
   - Khi gọi `claude -p`, truyền cờ `--strict-mcp-config` (không khởi tạo lại MCP server từ `.mcp.json` vì dữ liệu CDP Đa màn hình đã được thu thập sẵn), nâng ngưỡng timeout lên `45000ms` và lọc bỏ biến môi trường gây xung đột nested session.
   - Nếu AI CLI không phản hồi, bộ tổng hợp thông minh (`synthesizeSpecsFromExploration`) sẽ tự động dựng kịch bản dựa trực tiếp trên chuỗi `ExplorationScreenTrace` thực tế vừa đi qua (mở URL thật $\rightarrow$ điền/bấm/cuộn theo đúng từ khóa trong prompt $\rightarrow$ kiểm chứng `assert` phần tử/văn bản thật), tuyệt đối không bao giờ trả về kịch bản mẫu của trang khác.

4. **Giao diện 1-Prompt Duy Nhất (`GenerateSpecModal.tsx`)**:
   - Loại bỏ ô nhập URL rời và nút "Khám phá trang" thủ công.
   - Chỉ hiển thị một ô nhập Prompt tự nhiên (kèm khung tải ảnh thiết kế tùy chọn).
   - Hiển thị nhật ký khám phá các màn hình (`ExplorationTrace`) ngay sau khi hệ thống xử lý xong để người dùng thấy rõ app đã tự động đi qua những màn hình nào và phát hiện những selector nào.

---

## Phase 11: Header AI Agent Switcher & 10-Agent Model Discovery

### Objective
Giúp kỹ sư QA biết chính xác hệ thống đang kết nối với **AI Agent CLI** nào và sử dụng **Model** gì ngay trên thanh `Header.tsx`, đồng thời cho phép chuyển đổi linh hoạt giữa các AI Agent đã cài đặt trên máy và vô hiệu hóa (`disabled`) các Agent chưa cài đặt.

### Technical Design:
1. **Danh mục 10 AI Agent CLI thông dụng (`cliRunner.ts`)**:
   - Hỗ trợ kiểm tra 10 công cụ AI CLI phổ biến nhất:
     1. **Antigravity CLI (`agy`)** — Model mặc định/cấu hình: `gemini-2.5-pro`
     2. **Claude Code (`claude`)** — Đọc `~/.claude/settings.json` (`model` / `ANTHROPIC_MODEL`) hoặc `claude-sonnet-4-6`
     3. **Gemini CLI (`gemini`)** — Đọc `~/.gemini/settings.json` (`model` / `GEMINI_MODEL`) hoặc `gemini-2.5-pro`
     4. **OpenCode (`opencode`)** — Đọc `~/.config/opencode/opencode.json` / state hoặc `nemotron-3-ultra-free`
     5. **Qwen Code (`qwen`)** — Đọc `~/.qwen/settings.json` (`model`) hoặc `qwen3-coder-plus`
     6. **OpenAI Codex (`codex`)** — Đọc `~/.codex/config.json` / `OPENAI_MODEL` hoặc `gpt-5-codex`
     7. **Aider (`aider`)** — Đọc `~/.aider.conf.yml` hoặc `claude-3-7-sonnet`
     8. **Ollama (`ollama`)** — Đọc model từ `ollama list` hoặc `qwen2.5-coder`
     9. **Block Goose (`goose`)** — Đọc `~/.config/goose/config.yaml` hoặc `gpt-4o`
     10. **GitHub Copilot CLI (`copilot`)** — Model mặc định `claude-sonnet-4`
   - **Cơ chế phát hiện chính xác**: Quét trực tiếp các thư mục thực thi (`~/.local/bin`, `~/.opencode/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin` và toàn bộ `$PATH`) bằng `fs.statSync` + `fs.accessSync(..., X_OK)` để tránh nhận nhầm lệnh nội建 (shell builtin như `continue`), đồng thời đọc phiên bản và tệp cấu hình cục bộ để lấy tên Model chính xác.

2. **API Quản lý & Chuyển đổi AI Agent (`server/src/routes/runner.ts`)**:
   - `GET /api/runner/ai-agents`: Trả về `activeAgentId` và danh sách 10 phần tử `AiAgentInfo` (gồm `id`, `name`, `command`, `installed`, `version`, `model`, `active`).
   - `POST /api/runner/ai-agents/select`: Cập nhật `activeAgentId` (chỉ cho phép chọn Agent có `installed: true`). Khi `invokeLocalAiCli` chạy, hệ thống ưu tiên thực thi đúng Agent đang được người dùng chọn trước tiên.

3. **Menu thả xuống nhỏ trên Header (`client/src/components/Header.tsx`)**:
   - Thêm cụm điều khiển `AI Agent:` với `<Select size="small">` ngay trên thanh Header.
   - Hiển thị rõ trên nhãn đang chọn: `<Tên Agent> (<Model>)` (ví dụ: `Antigravity CLI · gemini-2.5-pro`).
   - Trong danh sách thả xuống hiển thị đủ 10 Agent:
     - Các Agent đã cài đặt: hiển thị tên, phiên bản và tên Model đang dùng.
     - Các Agent chưa cài đặt trên máy: đặt `disabled: true` kèm chú thích `(Chưa cài đặt)`.
