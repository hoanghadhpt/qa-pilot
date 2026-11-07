# Tasks: Standard Playwright E2E Framework Architecture

**Input**: Design documents from `/specs/007-standard-playwright-project/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths are specified in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish standard folder hierarchy and module paths

- [X] T001 Create standard directories `tests/pages/components/`, `tests/fixtures/`, `tests/data/`, `tests/e2e/auth/`, `tests/e2e/dashboard/`
- [X] T002 [P] Verify `@playwright/test` dependency and TypeScript compilation settings in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core BasePage and reusable cross-page components that MUST be complete before page objects can be built

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Implement `BasePage` abstract class with navigation, wait, and component composition in `tests/pages/base.page.ts`
- [X] T004 [P] Implement `NavbarComponent` with brand, links, and user menu in `tests/pages/components/navbar.component.ts`
- [X] T005 [P] Implement `ToastComponent` with success/error toast expectations in `tests/pages/components/toast.component.ts`
- [X] T006 [P] Implement `ConfirmModalComponent` for modal dialogs in `tests/pages/components/modal.component.ts`

**Checkpoint**: Foundation ready - base classes and component architecture operational.

---

## Phase 3: User Story 1 & 2 - Page Objects & Fixtures Dependency Injection (Priority: P1) 🎯 MVP

**Goal**: Enable any tester to write clean, expressive test cases in under 10 lines of code without `beforeEach` or `new PageObject()` boilerplate.

**Independent Test**: Run `tests/e2e/auth/login.spec.ts` using `test.fixture.ts` and confirm page objects are automatically injected and executed.

- [X] T007 [P] [US1] Implement `LoginPage` using semantic user-facing locators (`getByRole`, `getByLabel`) in `tests/pages/login.page.ts`
- [X] T008 [P] [US1] Implement `RegisterPage` with form filling helpers in `tests/pages/register.page.ts`
- [X] T009 [P] [US1] Implement `DashboardPage` with stats and greeting getters in `tests/pages/dashboard.page.ts`
- [X] T010 [US1] Implement custom test fixture `test.fixture.ts` extending `@playwright/test` to auto-inject all page objects in `tests/fixtures/test.fixture.ts`
- [X] T011 [US1] Author clean, boilerplate-free E2E test spec (< 10 lines) in `tests/e2e/auth/login.spec.ts`

**Checkpoint**: User Story 1 & 2 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 3 - Tự Động Hóa Dữ Liệu Kiểm Thử & An Toàn Bảo Mật (Priority: P2)

**Goal**: Eliminate test data collisions with dynamic data generation and provide static test role accounts with secret masking.

**Independent Test**: Run registration test multiple times and confirm zero duplicate email errors.

- [X] T012 [P] [US3] Implement `DataFactory` with unique email, username, BVA, and special characters generator in `tests/data/data-factory.ts`
- [X] T013 [P] [US3] Define static test users and roles in `tests/data/users.data.ts`
- [X] T014 [US3] Author dynamic registration test spec in `tests/e2e/auth/register.spec.ts` demonstrating zero-collision data generation

**Checkpoint**: User Story 3 test data factory and security masking operational.

---

## Phase 5: User Story 4 - Cấu Hình Chạy Đa Môi Trường & CI/CD Sẵn Sàng (Priority: P2)

**Goal**: Provide centralized production configuration (`playwright.config.ts`) and GitHub Actions CI matrix sharding workflow.

**Independent Test**: Run `npx playwright test --dry-run` and verify config parses projects and reporters without warnings.

- [X] T015 [US4] Author production-ready `playwright.config.ts` at repository root with environment switching, storageState reuse, and trace/screenshot artifacts
- [X] T016 [P] [US4] Author GitHub Actions CI matrix sharding workflow in `.github/workflows/e2e-playwright.yml`

**Checkpoint**: User Story 4 CI/CD and multi-environment configuration complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build, end-to-end verification, and documentation validation.

- [X] T017 Run Playwright test suite verification across all newly created spec files
- [X] T018 Verify all 5 quickstart scenarios and documentation links

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Independent, start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all User Stories.
- **US1 & US2 (Phase 3)**: Depends on Phase 2.
- **US3 (Phase 4)**: Depends on Phase 3.
- **US4 (Phase 5)**: Depends on Phase 1 & 3.
- **Polish (Phase 6)**: Depends on completion of all stories.

### Parallel Opportunities
- T001 and T002 ran in parallel.
- T004, T005, T006 ran in parallel once T003 was defined.
- T007, T008, T009 authored in parallel.
- T012 and T013 ran in parallel.
- T015 and T016 ran in parallel.
