# Tasks: Test Suite Management & AI Standardized Suite Generator

**Input**: Design documents from `/specs/006-test-suite-management/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths are specified in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, directory structure, and dependencies

- [X] T001 Create `tests/suites/` directory structure with a `.gitkeep` in `tests/suites/.gitkeep`
- [X] T002 [P] Verify `yaml` dependency in `packages/mcp-server/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data models, state manager, and YAML persistence layer that MUST be complete before ANY user story can proceed

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Define core TypeScript types (`TestSuite`, `TestCase`, `TestStep`, `SuiteExecutionRun`, `TestCaseExecutionResult`, `StepExecutionResult`, `CasePriority`, `CaseType`) in `packages/mcp-server/src/types.ts`
- [X] T004 Implement `SuiteManager` with YAML read/write, path validation regex `^[a-z0-9_-]{3,50}$`, and recursive suite discovery in `packages/mcp-server/src/engine/suiteManager.ts`
- [X] T005 [P] Implement SFDIPOT Heuristic Suite Generator Engine (`SuiteGenerator`) covering Happy Path, Negative Validation, Boundary Value Analysis (BVA), and Security Probes in `packages/mcp-server/src/engine/suiteGenerator.ts`

**Checkpoint**: Core suite storage and heuristic generation foundations ready.

---

## Phase 3: User Story 1 - AI Full-Suite Generation Cho Module/Chức Năng (Priority: P1) 🎯 MVP

**Goal**: Enable end users to generate a complete, standardized BDD Test Suite (6-8 test cases covering 4 heuristic categories) for any URL or business description in under 15 seconds.

**Independent Test**: Call `qa_generate_suite({ module: "auth", url: "https://demo.automationtesting.in/Register.html" })` and verify file `tests/suites/auth/auth-register.yaml` is created with valid BDD test cases.

- [X] T006 [P] [US1] Implement MCP tool handler `handleGenerateSuite` in `packages/mcp-server/src/tools/suiteGenerate.ts`
- [X] T007 [US1] Connect live a11y inspection via `midsceneBridge.inspect()` to `SuiteGenerator` for intelligent form element detection in `packages/mcp-server/src/engine/suiteGenerator.ts`
- [X] T008 [US1] Register `qa_generate_suite` tool in `packages/mcp-server/src/index.ts`

**Checkpoint**: User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 - Quản Lý & Điều Phối Thực Thi Test Suite (Priority: P1)

**Goal**: Catalog existing suites, execute full or tag-filtered test suites (`@smoke`), and automatically coordinate multi-role auth sessions (Feature 005).

**Independent Test**: Call `qa_list_suites()` to inspect catalog, then run `qa_run_suite({ suiteId: "auth-register", filterTags: ["smoke"] })` and confirm only smoke cases execute.

- [X] T009 [P] [US2] Implement MCP tool handler `handleListSuites` in `packages/mcp-server/src/tools/suiteList.ts`
- [X] T010 [P] [US2] Implement `SuiteRunner` engine with tag filtering, step execution, Triple-Oracle delta capture, and auto-auth role loading in `packages/mcp-server/src/engine/suiteRunner.ts`
- [X] T011 [P] [US2] Implement MCP tool handler `handleRunSuite` in `packages/mcp-server/src/tools/suiteRun.ts`
- [X] T012 [US2] Register `qa_list_suites` and `qa_run_suite` tools in `packages/mcp-server/src/index.ts`

**Checkpoint**: User Story 2 execution engine and multi-role coordination operational.

---

## Phase 5: User Story 3 - Báo Cáo Tổng Hợp Cấp Suite (Aggregated Suite Report) (Priority: P2)

**Goal**: Generate standalone executive HTML dashboards for test suites, showing pass/fail rate, execution duration, and drill-down visual evidence per test case.

**Independent Test**: Run a suite, call `qa_get_suite_report()`, and verify the generated `suite-report.html` displays KPI cards and collapsible test step evidence.

- [X] T013 [P] [US3] Implement `SuiteReportManager` to generate standalone HTML dashboard in `packages/mcp-server/src/engine/suiteReportManager.ts`
- [X] T014 [P] [US3] Implement MCP tool handler `handleGetSuiteReport` in `packages/mcp-server/src/tools/suiteReport.ts`
- [X] T015 [US3] Register `qa_get_suite_report` tool in `packages/mcp-server/src/index.ts`

**Checkpoint**: User Story 3 aggregated visual reporting ready.

---

## Phase 6: User Story 4 - Xuất Chuẩn Song Phương (Playwright Spec & YAML) (Priority: P3)

**Goal**: Export any YAML Test Suite into standalone Playwright TypeScript specs (`.spec.ts`) ready for CI/CD execution without external dependencies.

**Independent Test**: Call `qa_export_suite({ suiteId: "auth-register", format: "playwright" })` and verify `tests/e2e/auth/auth-register.spec.ts` passes `npx playwright test --dry-run`.

- [X] T016 [P] [US4] Implement `SuiteExporter` to convert `TestSuite` YAML into standard Playwright TypeScript spec (`.spec.ts`) in `packages/mcp-server/src/engine/suiteExporter.ts`
- [X] T017 [P] [US4] Implement MCP tool handler `handleExportSuite` in `packages/mcp-server/src/tools/suiteExport.ts`
- [X] T018 [US4] Register `qa_export_suite` tool in `packages/mcp-server/src/index.ts`

**Checkpoint**: User Story 4 Playwright export integration complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Build, end-to-end verification, and documentation validation.

- [X] T019 Build MCP server package with TypeScript compiler (`npm run build` in `packages/mcp-server`)
- [X] T020 Create comprehensive E2E test script `packages/mcp-server/src/verify-suite-management.ts` and verify all 5 quickstart scenarios
- [X] T021 Validate secret redaction and clean report rendering across suites

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Independent, start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all User Stories.
- **US1 (Phase 3)**: Depends on Phase 2.
- **US2 (Phase 4)**: Depends on Phase 2 and US1.
- **US3 (Phase 5)**: Depends on US2.
- **US4 (Phase 6)**: Depends on Phase 2.
- **Polish (Phase 7)**: Depends on completion of all stories.

### Parallel Opportunities
- T001 and T002 ran in parallel.
- T004 and T005 ran in parallel once T003 was defined.
- T006, T009, T010, T013, T016 authored in parallel.
