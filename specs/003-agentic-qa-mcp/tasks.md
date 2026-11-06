# Tasks: QA Pilot - Agentic QA Platform (Antigravity MCP & Midscene Engine)

**Input**: Design documents from `/specs/003-agentic-qa-mcp/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Format: `[TaskID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to ([US1], [US2], [US3], [US4])
- Every task includes exact file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Khởi tạo cấu trúc gói `packages/mcp-server` và cài đặt các phụ thuộc cốt lõi

- [x] T001 Initialize package structure in packages/mcp-server/package.json
- [x] T002 Install @modelcontextprotocol/sdk, @midscene/web, playwright, and dotenv in packages/mcp-server/package.json
- [x] T003 [P] Configure TypeScript compiler settings in packages/mcp-server/tsconfig.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Xây dựng hạ tầng dùng chung, quản lý trình duyệt, cầu nối Midscene và mô hình dữ liệu

**⚠️ CRITICAL**: Không thể bắt đầu các user story cho đến khi hoàn thành giai đoạn này

- [x] T004 Implement shared types (QASession, QAStep, EnvironmentConfig, TestExportArtifact) in packages/mcp-server/src/types.ts
- [x] T005 [P] Implement secret redaction utility to replace sensitive values with [REDACTED] in packages/mcp-server/src/security/redactor.ts
- [x] T006 [P] Implement environment loader for tests/envs/*.yaml and .env.local in packages/mcp-server/src/security/envManager.ts
- [x] T007 Implement Playwright browser lifecycle manager supporting headed and headless modes in packages/mcp-server/src/engine/browserManager.ts
- [x] T008 Implement Midscene bridge wrapping @midscene/web for action, assertion, and page inspection in packages/mcp-server/src/engine/midsceneBridge.ts

**Checkpoint**: Nền tảng cốt lõi sẵn sàng - các User Stories có thể bắt đầu triển khai

---

## Phase 3: User Story 1 - Tương tác kiểm thử tự động qua Chat trong Antigravity (Priority: P1) 🎯 MVP

**Goal**: Cho phép kỹ sư QA chat bằng ngôn ngữ tự nhiên trong Antigravity để mở trình duyệt, điều hướng, thực hiện hành động, kiểm tra assertion và xem inspect màn hình

**Independent Test**: Khởi chạy Antigravity, chat yêu cầu `"Mở https://demo.automationtesting.in/Register.html, điền Họ Tên và kiểm tra tiêu đề 'Register' hiển thị"`, xác nhận browser mở và thực thi đúng từng thao tác kèm báo cáo kết quả

- [x] T009 [P] [US1] Implement qa_launch_browser tool in packages/mcp-server/src/tools/launch.ts
- [x] T010 [P] [US1] Implement qa_navigate tool in packages/mcp-server/src/tools/navigate.ts
- [x] T011 [US1] Implement qa_act tool for natural-language browser actions in packages/mcp-server/src/tools/act.ts
- [x] T012 [US1] Implement qa_assert tool for visual and semantic assertions in packages/mcp-server/src/tools/assert.ts
- [x] T013 [P] [US1] Implement qa_inspect tool returning element summaries and screenshot in packages/mcp-server/src/tools/inspect.ts
- [x] T014 [US1] Implement qa_close_browser tool and wire stdio transport server in packages/mcp-server/src/index.ts
- [x] T015 [US1] Create Antigravity custom skill definition in .agents/skills/qa-pilot/SKILL.md
- [x] T016 [US1] Register qa-pilot MCP server with command and stdio args in .mcp.json

**Checkpoint**: Hoàn tất User Story 1 - Đã có MVP hoạt động trực tiếp qua Chat trong Antigravity!

---

## Phase 4: User Story 4 - Bảo vệ an toàn Production và Quản lý Môi trường (Priority: P2)

**Goal**: Tự động chặn các hành động phá hủy/thanh toán trên môi trường Production và che giấu toàn bộ biến mật khỏi log/prompt

**Independent Test**: Chọn môi trường `production`, thực hiện hành động có từ khóa `delete` hoặc `payment`, xác nhận bị chặn với lỗi an toàn; kiểm tra log đảm bảo secret được che thành `[REDACTED]`

- [x] T017 [P] [US4] Implement production safety guardrail rules and domain whitelist in packages/mcp-server/src/security/guardrail.ts
- [x] T018 [US4] Integrate guardrail checks into qa_act and qa_navigate tools in packages/mcp-server/src/tools/act.ts
- [x] T019 [US4] Apply secret redaction across tool output formatting and error reporting in packages/mcp-server/src/index.ts

**Checkpoint**: Toàn bộ thao tác kiểm thử được bảo vệ an toàn trên Production và bảo mật biến môi trường

---

## Phase 5: User Story 2 - Tự phục hồi Selector và Báo cáo Trực quan (Priority: P2)

**Goal**: Tự động phục hồi khi ID/class thay đổi thông qua nhận diện thị giác của Midscene và xuất báo cáo trực quan `report.html`

**Independent Test**: Thực hiện chuỗi hành động trên form động, sau đó gọi `qa_get_report` và mở `report.html` để kiểm tra visual timeline và tọa độ click

- [x] T020 [P] [US2] Implement visual report aggregator and artifact writer in packages/mcp-server/src/engine/reportManager.ts
- [x] T021 [US2] Implement qa_get_report tool returning report file path in packages/mcp-server/src/tools/report.ts
- [x] T022 [US2] Configure session artifact directory tests/runs/<sessionId>/ and generate interactive visual summary in packages/mcp-server/src/engine/reportManager.ts

**Checkpoint**: Hệ thống tự phục hồi selector ổn định và cung cấp báo cáo trực quan có thể xem lại

---

## Phase 6: User Story 3 - Xuất kịch bản tự động thành Test-as-Code (Priority: P3)

**Goal**: Chuyển đổi toàn bộ chuỗi hành động và xác thực trong phiên chat thành mã nguồn Playwright TypeScript (`.spec.ts`) hoặc YAML

**Independent Test**: Chat một flow kiểm thử, gọi `qa_export_test`, sau đó chạy `npx playwright test` để xác nhận kịch bản độc lập pass hoàn toàn trên terminal

- [x] T023 [P] [US3] Implement Playwright TypeScript test generator with auto-waits and locators in packages/mcp-server/src/engine/playwrightExporter.ts
- [x] T024 [P] [US3] Implement YAML test spec generator compatible with CI/CD in packages/mcp-server/src/engine/yamlExporter.ts
- [x] T025 [US3] Implement qa_export_test tool supporting both typescript and yaml formats in packages/mcp-server/src/tools/export.ts

**Checkpoint**: Tất cả các User Stories đã hoàn thiện đầy đủ

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Dọn dẹp mã nguồn, cập nhật scripts, tài liệu hướng dẫn và nghiệm thu

- [x] T026 [P] Update root package.json with build:mcp and test scripts in package.json
- [x] T027 Safely archive or clean up legacy server and client references in package.json
- [x] T028 [P] Update README.md with quickstart guide for chatting with Antigravity using qa-pilot
- [x] T029 Execute full end-to-end validation according to specs/003-agentic-qa-mcp/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Không phụ thuộc - có thể bắt đầu ngay lập tức
- **Foundational (Phase 2)**: Phụ thuộc vào Setup - **BLOCKS** tất cả User Stories
- **User Story 1 (Phase 3 - P1 🎯 MVP)**: Phụ thuộc vào Foundational - Khai thông luồng chat cơ bản
- **User Story 4 (Phase 4 - P2)**: Phụ thuộc vào Foundational & US1 - Bảo vệ an toàn vận hành
- **User Story 2 (Phase 5 - P2)**: Phụ thuộc vào US1 - Tối ưu báo cáo và độ ổn định thị giác
- **User Story 3 (Phase 6 - P3)**: Phụ thuộc vào US1 & US2 - Xuất kịch bản tái sử dụng
- **Polish (Phase 7)**: Thực hiện sau khi các User Stories hoàn tất

---

## Parallel Opportunities

- **Trong Phase 1**: `T003` có thể chạy song song với `T002`
- **Trong Phase 2**: `T005` (redactor) và `T006` (envManager) có thể triển khai song song
- **Trong Phase 3 (US1)**: `T009` (launch), `T010` (navigate), và `T013` (inspect) có thể phát triển song song
- **Trong Phase 6 (US3)**: `T023` (Playwright generator) và `T024` (YAML generator) có thể phát triển song song

---

## Implementation Strategy: MVP First (User Story 1)

1. **Bước 1**: Hoàn thành Phase 1 (Setup) và Phase 2 (Foundational).
2. **Bước 2**: Hoàn thành Phase 3 (User Story 1: MCP Server + Custom Skill).
3. **Bước 3 (Kiểm thử MVP)**: Mở Antigravity, chat câu lệnh kiểm thử trang web mẫu và xác nhận trình duyệt thực thi trực tiếp qua MCP.
4. **Bước 4**: Tiếp tục bổ sung Phase 4 (An toàn & Bảo mật), Phase 5 (Báo cáo trực quan) và Phase 6 (Xuất mã Playwright).
