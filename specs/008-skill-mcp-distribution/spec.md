# Feature Specification: 008-skill-mcp-distribution

**Feature Branch**: `008-skill-mcp-distribution`  
**Created**: 2026-11-07  
**Status**: In Planning  
**Input**: User request for 3-tier packaging: Skill layer (.agents/skills/qa-pilot), MCP Engine layer (packages/mcp-server), and CLI Distribution layer (packages/cli with `npx qa-pilot init`).

---

## 1. Executive Summary & Architecture Overview

Dự án áp dụng mô hình phân phối 3 tầng (3-Tier Hybrid Distribution) lấy cảm hứng từ cấu trúc của `ui-ux-pro-max-skill`, kết hợp sức mạnh thực thi của Model Context Protocol (MCP):

1. **Tầng Skill (`.agents/skills/qa-pilot/`)**:
   - Chứa `SKILL.md` định nghĩa mindset Senior QA, quy trình Triple-Oracle và SFDIPOT.
   - Thư mục dữ liệu tham chiếu cục bộ (`data/`): Hướng dẫn SFDIPOT, danh mục payload biên (`naughty-strings.json`), checklist nghiệm thu và template Page Object.
   - Script tìm kiếm tra cứu heuristic nhanh (`scripts/search-heuristics.js`) chạy offline không phụ thuộc mạng.
2. **Tầng Công cụ Thực thi (`packages/mcp-server/`)**:
   - Giữ vai trò Execution Engine: điều khiển Chromium, tương tác DOM, lắng nghe mạng/console CDP, quản lý auth session và xuất test case.
   - Được đóng gói và build độc lập thành `dist/index.js` sẵn sàng kết nối qua stdio.
3. **Tầng Phân phối (`packages/cli/`)**:
   - Cung cấp CLI chạy qua `npx qa-pilot init` (hoặc `qa-pilot init` sau khi cài đặt).
   - Tự động cài đặt đồng bộ: sao chép Skill vào `.agents/skills/qa-pilot/`, cấu hình `.mcp.json`, khởi tạo khung thư mục test chuẩn `tests/` và `playwright.config.ts`.

---

## 2. User Scenarios & Testing

### User Story 1 - Khởi tạo dự án kiểm thử 1 lệnh qua CLI (Priority: P1)

Là một Developer hoặc QA Automation Engineer, tôi muốn chạy lệnh `npx qa-pilot init` tại thư mục gốc của dự án web bất kỳ để tự động cài đặt cả Skill và MCP Server mà không phải sao chép thủ công file cấu hình.

**Why this priority**: Đây là điểm chạm đầu tiên (onboarding DX) quyết định sự tiện lợi của công cụ.

**Acceptance Scenarios**:
1. **Given** một project trắng hoặc project web có sẵn, **When** chạy `npx qa-pilot init`, **Then** CLI tạo `.agents/skills/qa-pilot/` đầy đủ `SKILL.md` và `data/`, đồng thời thêm mục cấu hình `qa-pilot` vào `.mcp.json`.
2. **Given** file `.mcp.json` đã tồn tại với các mcp server khác, **When** chạy `npx qa-pilot init`, **Then** CLI chỉ thêm/cập nhật key `qa-pilot` mà không làm mất các cấu hình server hiện có.
3. **Given** người dùng truyền cờ `--dry-run`, **When** chạy `npx qa-pilot init --dry-run`, **Then** CLI in ra danh sách các file và thay đổi dự kiến mà không ghi vào đĩa.

---

### User Story 2 - Tra cứu tri thức kiểm thử cục bộ không cần mạng (Priority: P2)

Là một AI Agent (hoặc Tester), tôi muốn tra cứu nhanh các payload kiểm thử biên (BVA, XSS, Unicode, Boundary lengths) và quy tắc SFDIPOT từ thư mục dữ liệu nội bộ của Skill mà không cần gửi request ra internet hay tốn nhiều token context.

**Why this priority**: Đảm bảo AI luôn sinh ra các ca kiểm thử đạt chuẩn chất lượng cao, có cơ sở dữ liệu kiểm thử biên phong phú ngay cả trong môi trường offline/air-gapped.

**Acceptance Scenarios**:
1. **Given** Agent đọc `SKILL.md`, **When** cần kiểm thử biên cho trường email hoặc mật khẩu, **Then** Agent có thể đọc hoặc chạy script tra cứu `scripts/search-heuristics.js --category bva` để lấy đúng payload.
2. **Given** hệ thống chạy trong mạng nội bộ không có kết nối internet bên ngoài, **When** tra cứu `data/payloads/naughty-strings.json`, **Then** dữ liệu trả về 100% cục bộ và tức thì (< 50ms).

---

### User Story 3 - Tùy biến phạm vi cài đặt linh hoạt (Priority: P3)

Là một lập trình viên chỉ muốn dùng bộ quy tắc tư duy QA của Skill (không cần mở browser/MCP), hoặc ngược lại chỉ muốn cài MCP server, tôi muốn CLI hỗ trợ các cờ chọn lọc.

**Why this priority**: Phục vụ các tình huống dự án chỉ cần AI review code/test case hoặc dự án đã có sẵn cấu hình skill riêng.

**Acceptance Scenarios**:
1. **Given** dự án chỉ cần hướng dẫn tư duy cho Agent, **When** chạy `npx qa-pilot init --skill-only`, **Then** chỉ có `.agents/skills/qa-pilot/` được tạo, không sửa `.mcp.json`.
2. **Given** dự án chỉ muốn cấu hình công cụ, **When** chạy `npx qa-pilot init --mcp-only`, **Then** chỉ có `.mcp.json` được cập nhật.

---

## 3. Requirements

### Functional Requirements

- **FR-001**: Hệ thống Skill MUST cung cấp `SKILL.md` tuân thủ đặc tả Agent Skills (YAML frontmatter chuẩn: `name`, `description`, `compatibility`).
- **FR-002**: Hệ thống Skill MUST đóng gói các tệp dữ liệu tĩnh trong `.agents/skills/qa-pilot/data/`:
  - `heuristics/sfdipot.md`: Hướng dẫn áp dụng 7 chiều SFDIPOT.
  - `payloads/naughty-strings.json`: Danh mục chuỗi tấn công/biên được phân loại (`xss`, `sql`, `unicode_vietnamese`, `boundary_lengths`, `whitespace`).
  - `checklists/test-quality.md`: 10 tiêu chí kiểm duyệt test case chất lượng cao.
- **FR-003**: Hệ thống Skill MUST cung cấp script tiện ích `scripts/search-heuristics.js` sử dụng thư viện chuẩn Node.js (zero external dependencies) để lọc payload theo từ khóa hoặc danh mục.
- **FR-004**: `packages/cli` MUST cung cấp lệnh binary `qa-pilot` với các lệnh con:
  - `init`: Khởi tạo môi trường kiểm thử (Skill, MCP config, test scaffolding).
  - `--dry-run`: Chạy thử nghiệm và xem trước thay đổi.
  - `--force`: Ghi đè file nếu đã tồn tại.
  - `--skill-only`: Chỉ cài đặt tầng Skill.
  - `--mcp-only`: Chỉ cấu hình tầng MCP server.
- **FR-005**: CLI `init` MUST hợp nhất (merge) file cấu hình `.mcp.json` an toàn theo định dạng JSON hợp lệ, không ghi đè mất cấu hình của server khác.
- **FR-006**: CLI MUST tạo cấu trúc khung Playwright enterprise chuẩn (`tests/pages/`, `tests/fixtures/`, `tests/suites/`, `playwright.config.ts`) nếu trong thư mục đích chưa có.
- **FR-007**: Tầng `packages/mcp-server` MUST giữ nguyên tính tương thích 100% với các công cụ hiện hữu (`qa_act`, `qa_assert`, `qa_auth_save`, `qa_run_suite`, v.v.).

---

## 4. Success Criteria

- **SC-001**: Lệnh `npx qa-pilot init` hoàn thành thiết lập toàn bộ môi trường trong thời gian dưới 2 giây.
- **SC-002**: Tệp `.mcp.json` sau khi merge qua CLI có cú pháp JSON chuẩn 100%, tích hợp ngay lập tức với Antigravity và Claude Desktop mà không cần chỉnh sửa thủ công.
- **SC-003**: Bộ payload `naughty-strings.json` chứa tối thiểu 50 trường hợp kiểm thử biên phổ biến phục vụ web testing.
- **SC-004**: Script tra cứu `search-heuristics.js` chạy độc lập với `node` không cần `npm install` thêm bất kỳ package nào.
