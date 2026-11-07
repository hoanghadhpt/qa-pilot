# Tasks: Shared Auth Session Storage

**Input**: Design documents from `/specs/005-shared-auth-session/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths are specified in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, directory structure, and git security

- [X] T001 Ensure root `.gitignore` excludes `tests/fixtures/auth/` and `*.auth.json` in `.gitignore`
- [X] T002 [P] Create `tests/fixtures/auth/` directory with a `.gitkeep` in `tests/fixtures/auth/.gitkeep`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data models, state manager, and security redactor updates that MUST be complete before ANY user story can proceed

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Define core TypeScript types (`AuthSessionProfile`, `PlaywrightStorageState`, `CookieRecord`, `OriginStorageRecord`, `AuthStatusResult`, `AuthStateStatus`) in `packages/mcp-server/src/types.ts`
- [X] T004 Implement `AuthSessionManager` with path sanitization regex `^[a-zA-Z0-9_-]{2,32}$`, JSON profile read/write, and zero-dependency JWT (`exp`) & Cookie expiry parser in `packages/mcp-server/src/engine/authManager.ts`
- [X] T005 [P] Extend `globalRedactor` in `packages/mcp-server/src/security/redactor.ts` to dynamically register extracted session tokens and cookie values for automatic `[REDACTED]` masking

**Checkpoint**: Core auth management foundation and security isolation ready.

---

## Phase 3: User Story 1 - Solo QA One-Time Login & Instant Replay (Priority: P1) 🎯 MVP

**Goal**: Enable human tester to login once in headed browser, extract storageState, and restore session instantly (<0.05s) on subsequent runs.

**Independent Test**: Tester logs in manually, runs `qa_auth_save({ role: 'admin' })`, restarts browser, runs `qa_auth_load({ role: 'admin' })`, and accesses protected page without `/login` redirect.

- [X] T006 [P] [US1] Implement MCP tool handler `handleAuthSave` in `packages/mcp-server/src/tools/authSave.ts`
- [X] T007 [P] [US1] Implement MCP tool handler `handleAuthLoad` in `packages/mcp-server/src/tools/authLoad.ts`
- [X] T008 [US1] Update `BrowserManager` to support initializing context with saved `storageState` and dynamic state loading in `packages/mcp-server/src/engine/browserManager.ts`
- [X] T009 [US1] Register `qa_auth_save` and `qa_auth_load` tools in `packages/mcp-server/src/index.ts`

**Checkpoint**: User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 - Auto Session Validation & Expiry Detection (Priority: P1)

**Goal**: Inspect token validity/TTL and catch 401/403 or `/login` redirects via Triple-Oracle to prevent false-negative test failures.

**Independent Test**: Call `qa_auth_status({ role: 'admin' })` to see remaining minutes; simulate expired session to verify Triple-Oracle flags `auth_session_expired`.

- [X] T010 [P] [US2] Implement MCP tool handler `handleAuthStatus` in `packages/mcp-server/src/tools/authStatus.ts`
- [X] T011 [US2] Extend `OracleWatcher` in `packages/mcp-server/src/engine/oracleWatcher.ts` to detect HTTP 401/403 responses and unexpected login redirects
- [X] T012 [US2] Register `qa_auth_status` tool in `packages/mcp-server/src/index.ts`

**Checkpoint**: User Story 2 validation and proactive expiry detection operational.

---

## Phase 5: User Story 3 - Multi-Role Session Matrix (Priority: P2)

**Goal**: Seamlessly switch between multiple roles (`admin`, `staff`, `customer`) without session crosstalk.

**Independent Test**: Load `admin` profile, verify admin access, load `customer` profile, verify admin session is purged and customer access is active.

- [X] T013 [P] [US3] Implement MCP tool handler `handleAuthClear` in `packages/mcp-server/src/tools/authClear.ts`
- [X] T014 [US3] Add context reset and role switching orchestration in `packages/mcp-server/src/engine/authManager.ts`
- [X] T015 [US3] Register `qa_auth_clear` tool in `packages/mcp-server/src/index.ts`

**Checkpoint**: User Story 3 multi-role switching ready.

---

## Phase 6: User Story 4 - Team Auth Vault & Security Sanitization (Priority: P3)

**Goal**: Support CI/CD zero-disk token injection via `QA_AUTH_STATE_<ROLE>` Base64 env variables and display active role in visual report.

**Independent Test**: Set `QA_AUTH_STATE_CI` environment variable, verify `qa_auth_load({ role: 'ci' })` loads state successfully, and verify report header displays role badge without leaking token.

- [X] T016 [P] [US4] Add Base64 environment variable import/export (`QA_AUTH_STATE_<ROLE>`) in `packages/mcp-server/src/engine/authManager.ts`
- [X] T017 [US4] Add active auth role badge and redaction check in visual report generator `packages/mcp-server/src/engine/reportManager.ts`

**Checkpoint**: User Story 4 Team Vault & Report integration complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Build, end-to-end verification, and documentation validation.

- [X] T018 Build MCP server package with TypeScript compiler (`npm run build` in `packages/mcp-server`)
- [X] T019 Create comprehensive E2E test script `packages/mcp-server/src/verify-auth-session.ts` and verify all 5 quickstart scenarios
- [X] T020 Run full TypeScript compilation and E2E verification test

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Independent, start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all User Stories.
- **US1 (Phase 3)**: Depends on Phase 2.
- **US2 (Phase 4)**: Depends on Phase 2 and US1.
- **US3 (Phase 5)**: Depends on US1.
- **US4 (Phase 6)**: Depends on US1, US2, US3.
- **Polish (Phase 7)**: Depends on completion of all stories.

### Parallel Opportunities
- T001 and T002 ran in parallel.
- T004 and T005 ran in parallel once T003 was defined.
- T006 and T007 authored in parallel.
- T010 and T013 authored in parallel.
