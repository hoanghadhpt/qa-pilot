# qa-pilot

> **Agentic AI Web Testing Platform powered by Model Context Protocol (MCP), Midscene.js & Playwright**  
> *Nền tảng kiểm thử web tự động thế hệ mới kết hợp AI Agent, Midscene.js và Playwright thông qua chuẩn MCP.*

[![npm version](https://img.shields.io/npm/v/qa-pilot.svg)](https://www.npmjs.com/package/qa-pilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node: >=18.3.0](https://img.shields.io/badge/Node->=18.3.0-green.svg)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-orange.svg)](https://playwright.dev/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

---

## 🌐 Language Navigation / Chọn ngôn ngữ

- [🇻🇳 Hướng dẫn sử dụng (Tiếng Việt)](#-tiếng-việt)
- [🇬🇧 Usage Guide (English)](#-english)

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

**qa-pilot** là gói công cụ tất-cả-trong-một (All-in-one Toolkit) biến các trợ lý AI (Google Antigravity IDE, Claude Code, Cursor, Windsurf) thành một **Kỹ sư QA Automation cao cấp**.

---

### 1. Khởi tạo Dự án Kiểm thử (`npx qa-pilot init`)

Tại thư mục gốc của bất kỳ dự án web nào (React, Vue, Next.js, Laravel, HTML...), bạn chỉ cần chạy:

```bash
# Khởi tạo toàn bộ: Skill tư duy QA + MCP Server config + Khung Playwright E2E
npx qa-pilot init
```

Lệnh trên sẽ tự động:
1. Cài đặt **Skill tư duy QA** vào `.agents/skills/qa-pilot/` kèm bộ từ điển payloads biên (XSS, SQLi, Tiếng Việt, BVA).
2. Tự động hợp nhất cấu hình MCP vào `.mcp.json` (bảo toàn các server hiện có và tự tạo file backup `.mcp.json.bak`).
3. Khởi tạo khung kiểm thử Playwright tiêu chuẩn enterprise (`playwright.config.ts`, `tests/pages/base.page.ts`, `tests/fixtures/test.fixture.ts`, `tests/suites/`).

#### Các tùy chọn nâng cao:
```bash
# Xem trước các thay đổi dự kiến mà không ghi vào đĩa
npx qa-pilot init --dry-run

# Ghi đè file nếu đã tồn tại
npx qa-pilot init --force

# Chỉ cài đặt Skill tư duy QA (dành cho AI Reviewer không cần mở browser)
npx qa-pilot init --skill-only

# Chỉ cấu hình tệp .mcp.json
npx qa-pilot init --mcp-only

# Khởi tạo Skill và MCP, bỏ qua việc tạo thư mục tests/
npx qa-pilot init --skip-scaffold
```

---

### 2. Cấu hình MCP Client (`.mcp.json`)

Tệp `.mcp.json` tại thư mục gốc dự án của bạn (đã được tạo tự động bởi lệnh `init`):

```json
{
  "mcpServers": {
    "qa-pilot": {
      "command": "npx",
      "args": ["-y", "qa-pilot", "server"],
      "env": {
        "NODE_ENV": "test"
      }
    }
  }
}
```

Antigravity IDE, Claude Code và Cursor sẽ tự động phát hiện và kết nối với máy chủ MCP `qa-pilot`.

---

### 3. Tra cứu Heuristics & Payloads Cục bộ (Offline Search)

Tra cứu chuỗi thử nghiệm biên và phương pháp SFDIPOT tức thì (< 40ms) không cần internet và không tốn token LLM:

```bash
# Tra cứu theo danh mục (xss, sql_injection, unicode_vietnamese, boundary_lengths, whitespace_special, format_validation)
node .agents/skills/qa-pilot/scripts/search-heuristics.js --category bva

# Tra cứu theo từ khóa
node .agents/skills/qa-pilot/scripts/search-heuristics.js --query "boundary"

# Liệt kê tất cả danh mục
node .agents/skills/qa-pilot/scripts/search-heuristics.js --list-categories
```

---

### 4. Kịch bản Prompt Mẫu tương tác với AI qua Chat

- **Khảo sát & Lên kế hoạch kiểm thử**:
  > *"Khảo sát form https://demo.automationtesting.in/Register.html và lập Test Matrix bằng phương pháp SFDIPOT"*
- **Tự động sinh Test Suite**:
  > *"Sinh test suite hoàn chỉnh cho module auth trên trang Register, gắn nhãn @smoke và lưu dưới dạng YAML"*
- **Thực thi Test Suite**:
  > *"Chạy test suite auth-register với nhãn @smoke và mở báo cáo HTML trực quan"*
- **Quản lý Auth Session**:
  > *"Lưu phiên đăng nhập hiện tại cho vai trò admin"*  
  > *"Kiểm tra hạn sử dụng token của vai trò admin"*  
  > *"Nạp phiên xác thực của customer và truy cập vào trang giỏ hàng"*
- **Xuất mã Playwright**:
  > *"Xuất test suite auth-register thành file Playwright TypeScript vào tests/e2e/auth/"*

---

### 5. Bảng Công cụ MCP Cốt lõi

| Công cụ | Tham số chính | Mô tả chức năng |
| :--- | :--- | :--- |
| `qa_navigate` | `url`, `headless` | Điều hướng tới URL mục tiêu và gắn bộ quan sát Triple-Oracle. |
| `qa_act` | `action` | Thực hiện hành động tự nhiên (click, điền form, chọn dropdown) qua Midscene visual engine. |
| `qa_assert` | `assertion` | Khẳng định trạng thái giao diện với kiểm tra đồng thời Console và Network. |
| `qa_auth_save` | `role`, `ttlMinutes` | Lưu cookies và localStorage thành `tests/fixtures/auth/<role>.json`. |
| `qa_auth_load` | `role` | Nạp lại session trong 0.05 giây mà không cần đăng nhập lại qua UI. |
| `qa_auth_status` | `role` | Kiểm tra thời hạn hiệu lực của JWT token (`exp`) hoặc cookie. |
| `qa_auth_clear` | `role` | Xóa session lưu trữ của vai trò tương ứng hoặc toàn bộ. |
| `qa_generate_suite` | `module`, `url`, `tags` | AI khảo sát và tự động sinh kịch bản Test Suite 5 chiều (Happy, Boundary, Security, v.v.). |
| `qa_run_suite` | `suiteId`, `filterTags` | Thực thi Test Suite YAML theo tags, nạp auth role tương ứng từng test case. |
| `qa_list_suites` | `module` | Liệt kê danh mục các Test Suite hiện có trong dự án. |
| `qa_get_suite_report` | `runId` | Lấy đường dẫn file báo cáo HTML dashboard KPI trực quan. |
| `qa_export_suite` | `suiteId`, `format`, `targetPath` | Chuyển đổi kịch bản YAML thành mã nguồn Playwright TypeScript `.spec.ts`. |

---

<br />

---

<a name="-english"></a>
# 🇬🇧 English

**qa-pilot** is the all-in-one toolkit transforming AI coding assistants (Google Antigravity IDE, Claude Code, Cursor, Windsurf) into an elite **Senior QA Automation Architect**.

---

### 1. Initialize a Project (`npx qa-pilot init`)

Run directly at the root of your web project:

```bash
# Full bootstrap: QA Persona Skill + MCP Server config + Enterprise Playwright scaffolding
npx qa-pilot init
```

This command automatically:
1. Installs the **QA Persona Skill** into `.agents/skills/qa-pilot/` with curated boundary payloads (XSS, SQLi, Unicode, BVA).
2. Merges MCP configuration into `.mcp.json` (preserving existing servers and generating a `.mcp.json.bak` backup).
3. Scaffolds a production-grade Playwright E2E framework (`playwright.config.ts`, `tests/pages/base.page.ts`, `tests/fixtures/test.fixture.ts`, `tests/suites/`).

#### Advanced Options:
```bash
# Preview actions without writing to disk
npx qa-pilot init --dry-run

# Overwrite existing files
npx qa-pilot init --force

# Install only QA Skill & Heuristics (for AI reviewers, no browser required)
npx qa-pilot init --skill-only

# Configure only .mcp.json
npx qa-pilot init --mcp-only

# Skip creating tests/ folder
npx qa-pilot init --skip-scaffold
```

---

### 2. MCP Client Configuration (`.mcp.json`)

Your project `.mcp.json` (generated automatically by `qa-pilot init`):

```json
{
  "mcpServers": {
    "qa-pilot": {
      "command": "npx",
      "args": ["-y", "qa-pilot", "server"],
      "env": {
        "NODE_ENV": "test"
      }
    }
  }
}
```

---

### 3. Offline Heuristic & Payload Search

Search curated boundary testing payloads locally in under 40ms without sending requests to external APIs:

```bash
# Search by category (xss, sql_injection, unicode_vietnamese, boundary_lengths, whitespace_special, format_validation)
node .agents/skills/qa-pilot/scripts/search-heuristics.js --category bva

# Search by keyword
node .agents/skills/qa-pilot/scripts/search-heuristics.js --query "boundary"

# List all available payload categories
node .agents/skills/qa-pilot/scripts/search-heuristics.js --list-categories
```

---

### 4. Natural Language Prompting Examples

With Antigravity IDE, Claude Code, or Cursor connected:

- **Explore & Plan Tests**:
  > *"Inspect the form at https://demo.automationtesting.in/Register.html and formulate a Test Matrix using SFDIPOT heuristics."*
- **Generate Test Suite**:
  > *"Generate a comprehensive test suite for the auth module on the Register page, tag it with @smoke, and save as YAML."*
- **Run Test Suite**:
  > *"Run the auth-register suite filtered by @smoke tag and open the visual HTML report."*
- **Auth Session Management**:
  > *"Save the current session state under the admin role."*  
  > *"Check the token expiration status for role admin."*  
  > *"Load customer auth profile and navigate to /cart."*
- **Export to Playwright**:
  > *"Export the auth-register suite into a Playwright TypeScript file in tests/e2e/auth/."*

---

### 5. Core MCP Tools Reference

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `qa_navigate` | `url`, `headless` | Navigates to target URL and attaches Triple-Oracle listeners. |
| `qa_act` | `action` | Performs natural actions (click, type, select) via visual recognition. |
| `qa_assert` | `assertion` | Asserts UI conditions while cross-verifying console & network health. |
| `qa_auth_save` | `role`, `ttlMinutes` | Saves cookies & localStorage to `tests/fixtures/auth/<role>.json`. |
| `qa_auth_load` | `role` | Restores session state in 0.05s without re-executing login steps. |
| `qa_auth_status` | `role` | Inspects JWT expiration (`exp`) and cookie TTL status. |
| `qa_auth_clear` | `role` | Clears stored session state for a specific role or all roles. |
| `qa_generate_suite` | `module`, `url`, `tags` | Surveys page elements and generates a 5-dimension test suite. |
| `qa_run_suite` | `suiteId`, `filterTags` | Runs YAML test cases with tag filtering and auto-auth coordination. |
| `qa_list_suites` | `module` | Discovers and catalogs test suites across project modules. |
| `qa_get_suite_report` | `runId` | Returns the file path to the standalone HTML executive dashboard. |
| `qa_export_suite` | `suiteId`, `format`, `targetPath` | Transpiles YAML test suites into clean Playwright TypeScript spec files. |

---

## 📄 License

Distributed under the **MIT License**.

