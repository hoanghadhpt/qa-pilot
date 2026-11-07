# Tasks: 008-skill-mcp-distribution

**Input**: Design documents from `/specs/008-skill-mcp-distribution/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/cli-contract.json`, `contracts/skill-metadata.json`

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize packages/cli and template assets structure

- [X] T001 Initialize packages/cli package.json and tsconfig.json in packages/cli/package.json
- [X] T002 [P] Create CLI executable entrypoint with shebang in packages/cli/bin/qa-pilot.js
- [X] T003 [P] Create file system copy and template utilities in packages/cli/src/utils/fileSystem.ts
- [X] T004 [P] Create safe JSON merger utility for .mcp.json in packages/cli/src/utils/mergeMcp.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ensure Skill reference data and offline heuristics search script are ready before bundling

- [X] T005 [P] Implement SFDIPOT heuristic reference guide in .agents/skills/qa-pilot/data/heuristics/sfdipot.md
- [X] T006 [P] Create comprehensive adversarial boundary payload database in .agents/skills/qa-pilot/data/payloads/naughty-strings.json
- [X] T007 [P] Create test evaluation quality checklist in .agents/skills/qa-pilot/data/checklists/evaluation-checklist.md
- [X] T008 Implement zero-dependency local search script in .agents/skills/qa-pilot/scripts/search-heuristics.js
- [X] T009 Update master skill instructions to integrate local data and search tools in .agents/skills/qa-pilot/SKILL.md

---

## Phase 3: User Story 1 - Khởi tạo dự án kiểm thử 1 lệnh qua CLI (Priority: P1) 🎯 MVP

**Goal**: Cung cấp lệnh `qa-pilot init` tự động cài đặt Skill, merge `.mcp.json` và tạo khung kiểm thử chuẩn với hỗ trợ `--dry-run` và `--force`.

**Independent Test**: Chạy `node packages/cli/bin/qa-pilot.js init <target-dir>` vào một thư mục tạm, xác nhận sinh đủ `.agents/skills/qa-pilot/`, cập nhật `.mcp.json`, và sinh `playwright.config.ts`.

- [X] T010 [P] [US1] Create seed template files for skill and playwright scaffolding in packages/cli/src/templates/seedAssets.ts
- [X] T011 [US1] Implement init command handler with argument parsing and dry-run preview in packages/cli/src/commands/init.ts
- [X] T012 [US1] Wire CLI entrypoint to init command in packages/cli/bin/qa-pilot.js
- [X] T013 [US1] Implement end-to-end integration test runner in packages/cli/src/verify-cli.ts

---

## Phase 4: User Story 2 - Tra cứu tri thức kiểm thử cục bộ không cần mạng (Priority: P2)

**Goal**: Đảm bảo AI Agent và Tester có thể tra cứu nhanh payloads, BVA và SFDIPOT qua dòng lệnh độc lập < 50ms không cần internet.

**Independent Test**: Chạy `node .agents/skills/qa-pilot/scripts/search-heuristics.js --category xss` và `node .agents/skills/qa-pilot/scripts/search-heuristics.js --query "boundary"` xác nhận trả về kết quả chính xác không phát sinh lỗi.

- [X] T014 [US2] Enhance search-heuristics.js with query token matching and category filtering in .agents/skills/qa-pilot/scripts/search-heuristics.js
- [X] T015 [US2] Add unit test validation for search-heuristics script in packages/cli/src/verify-search.ts

---

## Phase 5: User Story 3 - Tùy biến phạm vi cài đặt linh hoạt (Priority: P3)

**Goal**: Hỗ trợ các cờ cài đặt chọn lọc: `--skill-only`, `--mcp-only`, `--skip-scaffold`.

**Independent Test**: Chạy `init` với cờ `--skill-only` xác nhận chỉ tạo `.agents/skills/qa-pilot/`, không tạo `.mcp.json`. Chạy với `--mcp-only` xác nhận chỉ tạo/merge `.mcp.json`.

- [X] T016 [US3] Add flag handlers for --skill-only, --mcp-only, and --skip-scaffold in packages/cli/src/commands/init.ts
- [X] T017 [US3] Add selective flag test assertions in packages/cli/src/verify-cli.ts

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build, documentation, and monorepo workspace integration

- [X] T018 [P] Update root package.json to register packages/cli and npm scripts in package.json
- [X] T019 [P] Document 3-tier hybrid packaging and npx usage in README.md
- [X] T020 Run complete verification suite for CLI, search, and MCP server
