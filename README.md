# QA Pilot 🛸

> **Agentic AI Web Testing Platform powered by Model Context Protocol (MCP), Midscene.js & Playwright**  
> *Nền tảng kiểm thử web tự động thế hệ mới kết hợp AI Agent, Midscene.js và Playwright thông qua chuẩn MCP.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: >=18.3.0](https://img.shields.io/badge/Node->=18.3.0-green.svg)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-orange.svg)](https://playwright.dev/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)

---

## 🌐 Choose Language / Chọn ngôn ngữ

- [🇻🇳 Tiếng Việt](#-tiếng-việt)
- [🇬🇧 English](#-english)

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

**QA Pilot** biến trợ lý AI của bạn (Google Antigravity IDE, Claude Code, Cursor) thành một **Kỹ sư QA Automation cao cấp (Senior QA Automation Architect)**. Thay vì click chuột mù quáng, QA Pilot trang bị cho AI tư duy thử nghiệm đối kháng (SFDIPOT, BVA, Naughty Strings), cơ chế quan sát toàn diện **Triple-Oracle** (Giao diện + Console log + Network traffic) và khả năng lưu trữ **Test-as-Code** trực tiếp vào Git repository.

---

### 🌟 Tính năng Cốt lõi

1. **Khởi tạo & Khởi động 1 Lệnh (`npx qa-pilot`)**:
   - Tự động thiết lập cấu hình `.mcp.json`, cài đặt Skill tư duy và khởi tạo khung kiểm thử Playwright tiêu chuẩn chỉ trong 2 giây qua `npx qa-pilot init`.
   - Khởi động máy chủ MCP đa năng cho Antigravity / Claude / Cursor qua `npx -y qa-pilot server`.
2. **Gói Thống nhất Đa năng (All-in-One Package `qa-pilot`)**:
   - Tích hợp trọn gói cả bộ điều khiển trình duyệt Playwright, Midscene visual engine, cơ chế Triple-Oracle và cẩm nang Heuristics vào duy nhất 1 package `qa-pilot`.
3. **Quan sát Triple-Oracle (UI + Console + Network)**:
   - Không chỉ nhìn giao diện mà còn bắt lỗi JavaScript ngầm (`TypeError`, `Unhandled Exception`) và lỗi mã HTTP mạng (4xx, 5xx, 401/403 session expired).
4. **Chia sẻ Phiên Đăng nhập (Zero-Latency Auth Session)**:
   - Lưu và nạp `storageState` trong 0.05 giây, tự động giải mã JWT `exp` và cookie `expires` để kiểm tra hạn dùng, bỏ qua hoàn toàn bước đăng nhập UI tốn thời gian.
5. **AI Sinh Test Suite Chuẩn Doanh nghiệp**:
   - Tự động phân tích DOM và sinh bộ kịch bản kiểm thử toàn diện: Happy Path, Negative Validation, Boundary Value, Security Probing, Idempotency.
6. **Báo cáo Trực quan & Xuất Mã Playwright**:
   - Tự động xuất dashboard HTML KPI trực quan cấp Suite và xuất mã Playwright TypeScript `.spec.ts` chuẩn Page Object Model.

---

### 🚀 Bắt đầu Nhanh (Quickstart)

#### Cách 1: Khởi tạo vào bất kỳ dự án nào qua `npx` (Khuyến nghị)

Tại thư mục gốc dự án web của bạn, chạy:

```bash
# Khởi tạo trọn gói Skill + MCP Server + Khung Playwright
npx qa-pilot init

# Xem trước thay đổi mà không ghi file (Dry run)
npx qa-pilot init --dry-run

# Chỉ cài đặt Skill tư duy QA (không cần trình duyệt)
npx qa-pilot init --skill-only

# Chỉ cấu hình .mcp.json
npx qa-pilot init --mcp-only
```

#### Cách 2: Chạy trực tiếp từ mã nguồn Repo

```bash
# 1. Clone repository
git clone https://github.com/hoangha1991/qa-pilot.git
cd qa-pilot

# 2. Cài đặt dependencies và build
npm install
npm run build

# 3. Chạy kiểm thử xác thực toàn bộ hệ thống
npm run test:cli
```

---

### ⚙️ Cấu hình MCP Client

File `.mcp.json` tại thư mục gốc dự án của bạn (được tạo tự động qua `npx qa-pilot init`):

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

*Nếu chạy trực tiếp từ source code của repo này trong quá trình phát triển:*
```json
{
  "mcpServers": {
    "qa-pilot": {
      "command": "node",
      "args": ["packages/qa-pilot/dist/index.js"]
    }
  }
}
```

---

### 🔍 Tra cứu Heuristics & Payloads Cục bộ (Offline Search)

QA Pilot đính kèm bộ từ điển payloads biên và hướng dẫn SFDIPOT, có thể tra cứu tức thì qua dòng lệnh không tốn token LLM:

```bash
# Tra cứu theo danh mục (xss, sql_injection, unicode_vietnamese, boundary_lengths, whitespace_special, format_validation)
node .agents/skills/qa-pilot/scripts/search-heuristics.js --category bva

# Tra cứu theo từ khóa
node .agents/skills/qa-pilot/scripts/search-heuristics.js --query "boundary"

# Liệt kê tất cả danh mục payload có sẵn
node .agents/skills/qa-pilot/scripts/search-heuristics.js --list-categories
```

---

### 💬 Kịch bản Mẫu Tương tác qua Chat với AI

Khi kết nối với Antigravity IDE, Claude Code hoặc Cursor, bạn có thể ra lệnh bằng tiếng Việt tự nhiên:

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

### 🛠️ Danh mục Công cụ MCP Cốt lõi

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

**QA Pilot** transforms your AI coding assistant (Google Antigravity IDE, Claude Code, Cursor) into an elite **Senior QA Automation Architect**. Rather than clicking blindly on elements, QA Pilot equips AI agents with professional testing heuristics (SFDIPOT, BVA, Naughty Strings), **Triple-Oracle observation** (UI + Console + Network), zero-latency session handling, and native **Test-as-Code** persistence stored directly in your Git repository.

---

### 🌟 Key Highlights

1. **Unified All-in-One Package (`qa-pilot`)**:
   - Single package combining CLI scaffolding (`npx qa-pilot init`), the Playwright + Midscene MCP server (`npx -y qa-pilot server`), and local SFDIPOT heuristic knowledge.
2. **One-Command Setup & Launch**:
   - Run `npx qa-pilot init` to scaffold your project with full test architecture in 2 seconds.
   - Run `npx -y qa-pilot server` to immediately serve MCP capabilities to Antigravity, Claude, or Cursor.
3. **Triple-Oracle Observation (UI + Console + Network)**:
   - Validates UI layout while continuously monitoring background JavaScript exceptions (`TypeError`, `Unhandled Promise Rejections`) and HTTP failures (4xx, 5xx, 401/403 expired sessions).
4. **Shared Auth Sessions (Zero-Latency Login)**:
   - Save and restore browser `storageState` in 0.05 seconds with automatic base64url JWT `exp` and cookie `expires` inspection—skipping repetitive UI logins.
5. **AI Heuristic Test Suite Generator**:
   - Synthesizes full multi-dimensional test suites from DOM analysis: Happy Path, Boundary Value Analysis, Negative Validation, Security Probing, and Idempotency.
6. **Executive HTML Reports & Code Export**:
   - Generates dark-mode visual dashboards with step-by-step screenshots and exports YAML suites into clean Playwright TypeScript `.spec.ts` files.

---

### 🚀 Quickstart

#### Option 1: Bootstrap into any web project via `npx` (Recommended)

Run directly at the root of your web project:

```bash
# Full bootstrap: Skill + MCP Server config + Playwright scaffolding
npx qa-pilot init

# Preview changes without modifying files (Dry run)
npx qa-pilot init --dry-run

# Install only QA Skill & Heuristics (no browser engine)
npx qa-pilot init --skill-only

# Configure only .mcp.json
npx qa-pilot init --mcp-only
```

#### Option 2: Clone & Run from Repository Source

```bash
# 1. Clone repository
git clone https://github.com/hoangha1991/qa-pilot.git
cd qa-pilot

# 2. Install dependencies & build packages
npm install
npm run build

# 3. Execute test verification suite
npm run test:cli
```

---

### ⚙️ MCP Client Configuration

Standard `.mcp.json` placed in your project root (created automatically by `npx qa-pilot init`):

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

*When developing from local repository source:*
```json
{
  "mcpServers": {
    "qa-pilot": {
      "command": "node",
      "args": ["packages/qa-pilot/dist/index.js"]
    }
  }
}
```

---

### 🔍 Offline Heuristics & Payload Search

Search curated adversarial payloads and SFDIPOT guidelines locally without LLM token costs:

```bash
# Search by category (xss, sql_injection, unicode_vietnamese, boundary_lengths, whitespace_special, format_validation)
node .agents/skills/qa-pilot/scripts/search-heuristics.js --category bva

# Search by keyword
node .agents/skills/qa-pilot/scripts/search-heuristics.js --query "boundary"

# List all available payload categories
node .agents/skills/qa-pilot/scripts/search-heuristics.js --list-categories
```

---

### 💬 Natural Language Prompt Examples

With Antigravity IDE, Claude Code, or Cursor connected, converse naturally:

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

### 🛠️ Core MCP Tools Reference

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

## 📂 Project Structure

```text
qa-pilot/
├── .agents/skills/qa-pilot/        # Skill Layer: Persona, SFDIPOT, Naughty Strings, Offline search
│   ├── SKILL.md
│   ├── data/
│   │   ├── heuristics/sfdipot.md
│   │   ├── payloads/naughty-strings.json
│   │   └── checklists/evaluation-checklist.md
│   └── scripts/search-heuristics.js
│
├── packages/
│   └── qa-pilot/                   # Unified NPM Package: CLI Init + MCP Server Engine
│       ├── bin/qa-pilot.js         # Single binary for 'init' and 'server'
│       ├── assets/                 # Embedded skill templates
│       ├── src/
│       │   ├── cli/                # Project initialization & scaffolding logic
│       │   ├── engine/             # Playwright, Midscene, Suite & Auth engines
│       │   ├── tools/              # MCP stdio tool handlers
│       │   └── index.ts            # MCP Server stdio entrypoint
│       └── dist/
│
├── tests/                          # Enterprise Playwright E2E Architecture
│   ├── fixtures/test.fixture.ts    # Dependency Injection fixtures
│   ├── pages/base.page.ts          # BasePage with Component Composition
│   ├── suites/                     # Test-as-Code YAML suites
│   ├── data/                       # DataFactory & test datasets
│   └── e2e/                        # Playwright .spec.ts files
│
└── playwright.config.ts            # Root multi-browser configuration
```

---

## 🛡️ Security & Privacy Guardrails

- **Zero Database Persistence**: All test suites, auth sessions, and reports are stored locally as files in your workspace—no external database required.
- **Production Safety Gate**: Destructive actions (`delete`, `remove`, `payment`) are blocked on environments marked `is_production: true`.
- **Dynamic Secret Redaction**: Passwords, tokens, and authorization headers are masked as `[REDACTED]` in all logs, outputs, and HTML reports.
- **Git Protection**: `tests/runs/`, `tests/fixtures/auth/`, and `.env` files are automatically excluded by `.gitignore`.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository and create a feature branch (`git checkout -b feature/my-feature`).
2. Verify all tests pass (`npm run build && npm run test:cli`).
3. Commit with conventional commit messages (`feat: add new capability`).
4. Push to your branch and submit a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
