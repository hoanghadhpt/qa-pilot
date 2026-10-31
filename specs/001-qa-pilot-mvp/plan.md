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
