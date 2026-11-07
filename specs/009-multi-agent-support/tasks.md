# Tasks: 009 Multi-Coding-Agent Support

**Input**: Design documents from `/specs/009-multi-agent-support/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli-contract.md, quickstart.md
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to user stories [US1], [US2], [US3] from spec.md

---

## Phase 1: Setup & Data Structures

**Purpose**: Create adapter directory layout and define core interfaces.

- [x] T001 Create adapters directory structure in `packages/qa-pilot/src/cli/adapters/`
- [x] T002 [P] Implement delimiter merge utility with `<!-- QA-PILOT-START -->` and `<!-- QA-PILOT-END -->` in `packages/qa-pilot/src/cli/adapters/mergeUtil.ts`
- [x] T003 [P] Implement agent adapter interfaces and data types in `packages/qa-pilot/src/cli/adapters/types.ts`

---

## Phase 2: Foundational (Adapter Registry & Templates)

**Purpose**: Define prompt templates and registry for all 10 coding agents.

- [x] T004 Implement prompt templates and adapter definitions for all 10 agents (Antigravity, Cursor, Claude Code, Windsurf, Copilot, Cline, Continue, Aider, OpenHands, Gemini) in `packages/qa-pilot/src/cli/adapters/definitions.ts`
- [x] T005 Implement adapter registry and execution dispatcher in `packages/qa-pilot/src/cli/adapters/index.ts`

**Checkpoint**: Core adapter framework and templates ready.

---

## Phase 3: User Story 1 - Multi-Agent Scaffolding via CLI Flags (Priority: P1) 🎯 MVP

**Goal**: Support `--agent all` and `--agent <list>` in `qa-pilot init` to generate native adapters for specified assistants.
**Independent Test**: Run `node packages/qa-pilot/bin/qa-pilot.js init /tmp/test-agents --agent cursor,claude` and verify `.cursor/rules/qa-pilot.mdc` and `.claude/commands/qa-pilot.md` are created.

- [x] T006 [US1] Update CLI arguments parser to support `--agent <agents>` (single, comma-separated, and `all`) in `packages/qa-pilot/src/cli/commands/init.ts`
- [x] T007 [US1] Integrate adapter execution runner into `runCli` workflow in `packages/qa-pilot/src/cli/commands/init.ts`
- [x] T008 [US1] Update binary entrypoint `packages/qa-pilot/bin/qa-pilot.js` to expose `--agent` in `--help` usage documentation
- [x] T009 [US1] Implement automated verification test suite for adapter generation in `packages/qa-pilot/src/cli/verify-adapters.ts`

**Checkpoint**: User Story 1 functional and independently testable via CLI flags.

---

## Phase 4: User Story 2 - Smart Auto-Detection of Project Coding Agents (Priority: P2)

**Goal**: Automatically detect `.cursor/`, `.claude/`, `.github/`, `.continue/`, etc., and provision matching adapters when `--agent` is omitted.
**Independent Test**: In a directory with `.cursor/`, run `qa-pilot init` without flags and verify Cursor adapter is generated alongside Antigravity.

- [x] T010 [US2] Implement filesystem directory & file presence detectors for all 10 agents in `packages/qa-pilot/src/cli/adapters/definitions.ts`
- [x] T011 [US2] Wire auto-detection into default initialization flow when `--agent` is not provided in `packages/qa-pilot/src/cli/commands/init.ts`
- [x] T012 [US2] Add auto-detection test scenarios in `packages/qa-pilot/src/cli/verify-adapters.ts`

**Checkpoint**: User Story 2 functional; project workspaces automatically receive relevant agent adapters.

---

## Phase 5: User Story 3 - List Supported Agents & Adapter Discovery (Priority: P3)

**Goal**: Provide `--list-agents` flag to display supported agents, target file paths, strategies, and detection status.
**Independent Test**: Run `qa-pilot init --list-agents` and check stdout contains the 10 agents table.

- [x] T013 [US3] Implement `listSupportedAgents(targetDir)` formatted table output in `packages/qa-pilot/src/cli/adapters/index.ts`
- [x] T014 [US3] Connect `--list-agents` flag in `packages/qa-pilot/src/cli/commands/init.ts` to output list and exit immediately
- [x] T015 [US3] Add unit test verification for `--list-agents` output in `packages/qa-pilot/src/cli/verify-adapters.ts`

**Checkpoint**: All 3 user stories fully operational and verifiable.

---

## Phase 6: Polish, Integration & Release Preparation

**Purpose**: Build, package assets, update README, and prepare package release.

- [x] T016 [P] Update root `README.md` and `packages/qa-pilot/README.md` with multi-agent setup instructions and `--agent` documentation
- [x] T017 [P] Add npm script `"test:adapters"` in `packages/qa-pilot/package.json` and compile TypeScript build via `npm run build`
- [x] T018 Execute full verification suite (`verify-cli.ts` + `verify-adapters.ts`) to validate zero regressions
- [x] T019 Bump version to `0.0.3` across `packages/qa-pilot/package.json`, `packages/qa-pilot/bin/qa-pilot.js`, and root `package.json`

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001-T003). Blocks all User Stories.
- **Phase 3 (User Story 1 - P1)**: Depends on Phase 2 (T004-T005). Delivers working MVP.
- **Phase 4 (User Story 2 - P2)**: Depends on Phase 3 (T006-T008).
- **Phase 5 (User Story 3 - P3)**: Depends on Phase 2 & 3.
- **Phase 6 (Polish & Release)**: Depends on all user stories being verified.

---

## Parallel Execution Opportunities

- T002 (`mergeUtil.ts`) and T003 (`types.ts`) can be authored in parallel.
- T016 (Documentation) and T017 (Build scripts) can run in parallel.
- Verification tests in T009, T012, T015 run as unified suite in `verify-adapters.ts`.
