# Implementation Plan: QA Pilot - Agentic QA Platform (Antigravity MCP & Midscene Engine)

**Branch**: `003-agentic-qa-mcp` | **Date**: 2026-11-06 | **Spec**: [specs/003-agentic-qa-mcp/spec.md](file:///Users/hoangha/proj/qa-pilot/specs/003-agentic-qa-mcp/spec.md)

**Input**: Feature specification from `/specs/003-agentic-qa-mcp/spec.md`

## Summary

Tái cấu trúc toàn bộ dự án QA Pilot từ mô hình ứng dụng web truyền thống (React + Express) sang kiến trúc **Agent-First Native Platform**:
1. Đóng gói lõi kiểm thử thành **QA-Pilot MCP Server** (`@modelcontextprotocol/sdk`) và **Antigravity Custom Skill** (`.agents/skills/qa-pilot/SKILL.md`).
2. Tích hợp engine **`@midscene/web`** kết hợp **Playwright** để thao tác giao diện bằng ngôn ngữ tự nhiên, tự phục hồi selector, tự động sinh assertion và xuất báo cáo visual tương tác.
3. Cung cấp tính năng xuất kịch bản thành **Playwright TypeScript** hoặc **YAML** (Test-as-Code) để chạy độc lập trong CI/CD pipeline.
4. Bảo đảm nguyên tắc Production Safety & Secret Redaction (Constitution III) trực tiếp tại tầng MCP middleware.

---

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 18+  
**Primary Dependencies**:
- `@modelcontextprotocol/sdk`: Triển khai MCP Server chuẩn giao tiếp qua stdio với Antigravity.
- `@midscene/web` (v1.17+): Lõi nhận diện thị giác, hành động và xác thực bằng ngôn ngữ tự nhiên (`aiAction`, `aiAssert`, visual report).
- `playwright` / `playwright-core`: Điều khiển trình duyệt Chromium/Chrome và quản lý phiên kiểm thử.
- `dotenv`: Quản lý biến môi trường an toàn từ `.env.local`.

**Storage**: File-based (Test-as-Code) lưu tại `tests/specs/` (YAML) và `tests/e2e/` (Playwright `.spec.ts`). Không dùng cơ sở dữ liệu ngoài.  
**Testing**: Unit tests với Jest / Vitest, E2E validation scenarios với Playwright.  
**Target Platform**: macOS và Windows (môi trường chạy Antigravity IDE / CLI).  
**Project Type**: Agentic MCP Server & Custom Skill.  
**Performance Goals**:
- Khởi động MCP Server trong < 500ms.
- Phản hồi mỗi action tự nhiên (`qa_act`) và trả kết quả thị giác trong < 3-5 giây.
- Tiêu thụ RAM khi chạy ngầm < 150MB (ngoài RAM của Chrome).

**Constraints**:
- Tuân thủ Constitution: Không gửi raw HTML dump vào ngữ cảnh LLM, che giấu toàn bộ secrets, chặn các thao tác phá hủy trên môi trường Production.
- Hoạt động mượt mà cả ở chế độ có đầu (Headed mode - để QA quan sát) và không đầu (Headless mode).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá Tuân thủ | Giải pháp Thiết kế |
|---|---|---|
| **I. Semantic Context Only** | **ĐẠT** | `@midscene/web` chỉ bóc tách tọa độ visual, a11y hierarchy và text tokens sạch; không bao giờ gửi raw HTML vào context. |
| **II. Test-as-Code & Zero-DB** | **ĐẠT** | Tất cả kịch bản được xuất ra `.spec.ts` hoặc `.yaml` lưu trong Git repo. Hoàn toàn không cần database. |
| **III. Production Safety & Secret Redaction** | **ĐẠT** | Middleware trong MCP Server tự động chặn hành động phá hủy trên domain Production và che giấu secret thành `[REDACTED]`. |
| **IV. Hybrid Execution & Visual Evidence** | **ĐẠT** | Kết hợp Playwright CDP + Midscene sinh báo cáo visual timeline `report.html` chi tiết cho từng bước kiểm thử. |
| **V. Safe Multi-Contributor Git** | **ĐẠT** | Tệp kịch bản là code sạch tiêu chuẩn, dễ dàng commit, rebase và giải quyết merge conflict trên Git. |
| **VI. Minimalist & Functional Language** | **ĐẠT** | Toàn bộ log, công cụ MCP và mô tả đều dùng văn phong kỹ thuật chính xác, không emoji, không từ ngữ khoa trương. |

---

## Project Structure

```text
qa-pilot/
├── .mcp.json                         # Cấu hình đăng ký qa-pilot MCP Server
├── .agents/
│   └── skills/
│       └── qa-pilot/
│           └── SKILL.md              # Antigravity Custom Skill cho QA Engineer
├── packages/
│   └── mcp-server/                   # Mã nguồn MCP Server của QA Pilot
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts              # MCP Server entry point (stdio transport)
│           ├── engine/
│           │   ├── browserManager.ts # Quản lý vòng đời Chromium/Playwright
│           │   ├── midsceneBridge.ts # Kết nối @midscene/web (act, assert, inspect)
│           │   └── testExporter.ts   # Chuyển đổi session thành Playwright/YAML
│           ├── security/
│           │   ├── guardrail.ts      # Kiểm tra quy tắc an toàn Production
│           │   └── redactor.ts       # Che giấu biến mật [REDACTED]
│           └── tools/
│               ├── launch.ts
│               ├── navigate.ts
│               ├── act.ts
│               ├── assert.ts
│               ├── inspect.ts
│               └── export.ts
├── tests/
│   ├── envs/                         # Cấu hình môi trường (local, staging, prod)
│   ├── e2e/                          # Các kịch bản Playwright được xuất ra
│   └── runs/                         # Thư mục chứa visual reports (gitignored)
└── specs/
    └── 003-agentic-qa-mcp/
        ├── spec.md
        ├── plan.md
        ├── research.md
        ├── data-model.md
        ├── quickstart.md
        └── contracts/
            ├── mcp-tools.json
            └── skill-contract.md
```

---

## Implementation Phases & Quality Gates

### Phase 0: Research & Tech Stack Selection (Đã hoàn thành)
- Hoàn thành khảo sát 20 repo hàng đầu và lựa chọn `@midscene/web` + `@modelcontextprotocol/sdk`.
- Tài liệu hóa các quyết định kỹ thuật trong `research.md`.

### Phase 1: Design & Interface Contracts (Đã hoàn thành)
- Xây dựng mô hình dữ liệu (`data-model.md`).
- Chuẩn hóa đặc tả công cụ MCP (`contracts/mcp-tools.json`) và Skill (`contracts/skill-contract.md`).
- Thiết lập kịch bản nghiệm thu trong `quickstart.md`.

### Phase 2: Implementation (Sẽ thực thi sau khi duyệt Plan)
- **Tác vụ 1**: Dựng package `packages/mcp-server` với `@modelcontextprotocol/sdk` và `@midscene/web`.
- **Tác vụ 2**: Cài đặt `browserManager` và `midsceneBridge` hỗ trợ chế độ Headed và Headless.
- **Tác vụ 3**: Cài đặt các MCP tools (`launch`, `navigate`, `act`, `assert`, `inspect`, `export`).
- **Tác vụ 4**: Triển khai `guardrail` (chặn destructive actions trên Prod) và `redactor` (che biến mật).
- **Tác vụ 5**: Cấu hình tệp `.mcp.json` và tạo Antigravity Skill trong `.agents/skills/qa-pilot/SKILL.md`.
- **Tác vụ 6**: Chạy kịch bản nghiệm thu kiểm thử thực tế theo `quickstart.md`.
