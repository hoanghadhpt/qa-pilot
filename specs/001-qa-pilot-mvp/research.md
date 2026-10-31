# Phase 0 Research: QA Pilot MVP (v0.0.1)

**Feature**: `001-qa-pilot-mvp`
**Date**: 2026-10-31

## 1. Browser Execution & Telemetry Protocol: Chrome DevTools Protocol (CDP)

- **Decision**: Use **Chrome DevTools Protocol (CDP)** (`http://127.0.0.1:9222`) as the primary browser automation and telemetry layer, combining direct CDP connection (`playwright-core` `chromium.connectOverCDP` / raw CDP session `page.context().newCDPSession(page)`) for deterministic step execution with `chrome-devtools-mcp` (`--browser-url=http://127.0.0.1:9222`) for AI CLI inspection.
- **Rationale**:
  1. **Zero-Friction Session Reuse**: QA testers can attach directly to an already-open local Chrome window (`--remote-debugging-port=9222`) or let the backend auto-spawn a local Chrome instance with port `9222` enabled.
  2. **Native Semantic & Telemetry Extraction**: CDP domains (`Accessibility.getFullAXTree`, `DOM.getBoxModel`, `Runtime.consoleAPICalled`, `Runtime.exceptionThrown`, `Network.responseReceived`, `Network.loadingFailed`, `Page.captureScreenshot`) provide low-overhead access to the exact telemetry required by Principle I (no raw HTML to LLM) and Principle IV (visual bounding-box evidence).
  3. **Seamless MCP Sharing**: Both the deterministic step runner and `chrome-devtools-mcp` can inspect the same live browser endpoint (`http://127.0.0.1:9222`) when a step fails and AI Root Cause Analysis (RCA) is triggered.
- **Alternatives Considered**:
  - *Standalone Playwright MCP for every step*: Rejected because spawning an LLM agent loop for every `open`/`input`/`click` step introduces 3–10s latency per step and high token cost.
  - *Raw WebDriver / Selenium*: Rejected due to lack of native Accessibility Tree snapshots and heavier setup compared to CDP.

## 2. Local AI CLI Orchestration (`cliRunner.ts`)

- **Decision**: Orchestrate Local AI CLI tools (`claude`, `agy`, or `gemini`) in non-interactive print mode (`-p`) via Node.js `child_process.spawn` with clean-slate isolation per invocation.
- **Rationale**:
  1. **Local-First Architecture**: Reuses the QA engineer's existing authenticated CLI (`claude -p --dangerously-skip-permissions`, `agy`, or `gemini -p`) without requiring separate API billing management inside the dashboard.
  2. **Deterministic Triage & Generation**: The backend constructs a structured prompt using `server/src/prompts/triage.md` (containing only redacted step context, CDP Accessibility Tree snapshot, console errors, and network failures) or `server/src/prompts/generator.md` (with uploaded Figma image paths + Acceptance Criteria) and parses the structured JSON response.
  3. **Graceful Fallback**: If no Local AI CLI binary is found in `PATH` or the subprocess times out, the runner still completes evidence capture and returns a deterministic heuristic diagnosis in Vietnamese so the UI never hangs.
- **Alternatives Considered**:
  - *Cloud-only LLM SDK*: Rejected as primary mechanism to honor the user's Local-first CLI preference.

## 3. Visual Error Annotation (`imageAnnotator.ts`)

- **Decision**: Use `sharp` to composite a dynamically generated SVG overlay onto the raw PNG screenshot captured via CDP (`Page.captureScreenshot`).
- **Rationale**:
  1. **High Performance & Native Node Integration**: `sharp` composites SVG buffers over PNGs in `<50ms` without requiring headless canvas or ImageMagick binaries.
  2. **Clear Visual Evidence**: Renders a dotted red rectangle (`stroke="#EF4444"`, `stroke-width="3"`, `stroke-dasharray="6"`) around the target/fallback bounding box (`{ x, y, width, height }`) and a high-contrast red pill label above the box showing the error message.
- **Alternatives Considered**:
  - *Client-side CSS overlay only*: Rejected because QA engineers need a portable, self-contained `step-<n>-annotated.png` file saved in `tests/runs/<run_id>/` for sharing and attaching to bug trackers.

## 4. Cascading Environment & Secret Redaction (`environmentManager.ts`)

- **Decision**: Resolve variables in ascending precedence (`tests/projects/<project>/fixtures/*.json` → `tests/projects/<project>/envs/<env>.yaml` → `tests/projects/<project>/.env.local`), and build an in-memory redaction dictionary from all `.env.local` values and `sensitive: true` step values.
- **Rationale**:
  1. **Strict Secret Hygiene (Principle III)**: A centralized `redactText(input: string)` sanitizer strips secret literals from SSE payloads, `summary.json`, console logs, and AI prompts before they leave memory.
  2. **Production Guardrails**: Evaluates `is_production: true` against forbidden tags (`destructive`, `financial`, `data-creation`), `environments.blocked`, and `allowed_domains` whitelist prior to executing any step.
- **Alternatives Considered**:
  - *Regex-only secret masking*: Rejected because arbitrary passwords may not match fixed patterns; exact value tracking from `.env.local` + `sensitive: true` steps guarantees 100% redaction of configured secrets.

## 5. Multi-Contributor Git Workflow & Step-Level Conflict Resolution (`gitService.ts`)

- **Decision**: Wrap `simple-git` to provide status checks (`ahead`/`behind`), `pull --rebase`, atomic spec commits, and a structured YAML-parsed step diff when rebase conflicts occur on `tests/projects/<project>/specs/*.yaml`.
- **Rationale**:
  1. **QA-Friendly Collaboration**: QA engineers shouldn't have to resolve `<<<<<<< HEAD` markers in raw YAML files.
  2. **Semantic Step Diff**: Parsing `ours` vs `theirs` YAML versions allows the backend to return a step-by-step comparison (`ConflictModal.tsx`) where the user can pick Local vs Remote steps visually.
- **Alternatives Considered**:
  - *Force push or raw text merge editor*: Rejected because force-pushing loses teammate work and raw conflict markers break YAML syntax easily.

