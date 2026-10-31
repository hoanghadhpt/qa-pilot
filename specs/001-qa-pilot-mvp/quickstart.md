# Quickstart & Validation Guide: QA Pilot MVP (v0.0.1)

**Feature**: `001-qa-pilot-mvp`
**Date**: 2026-10-31

---

## 1. Prerequisites

- **Node.js**: v20+ and `npm`
- **Google Chrome / Chromium**: Installed locally (for Chrome DevTools Protocol connection on port `9222`)
- **Git**: Installed and available in `PATH`
- **Local AI CLI** *(optional for live AI RCA/Generator; fallback heuristics active if absent)*: `claude`, `agy`, or `gemini` in `PATH`

---

## 2. Installation & Startup

1. **Install root, server, and client dependencies**:
   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```

2. **(Optional) Launch Chrome with Remote Debugging on Port 9222**:
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/qa-pilot-chrome
   ```
   *(If Chrome is not already listening on `127.0.0.1:9222`, the QA Pilot CDP Runner will automatically launch or attach to a local Chrome instance with CDP enabled.)*

3. **Start QA Pilot (Backend on `:4000`, Frontend Dashboard on `:3000`)**:
   ```bash
   npm run dev
   ```

4. **Open Dashboard**:
   Navigate to `http://localhost:3000`.

---

## 3. End-to-End Validation Scenarios

### Scenario A: Execute Passing & Failing Specs on `https://demoqa.com/` with Visual CDP Evidence (US1)
1. Check `CDP: Đã kết nối (9222)` in `Header` (or click `Khởi động trình duyệt` to launch Chrome with persistent profile `tests/temp/chrome-profile` and choose `Hiện trình duyệt` mode).
2. Select **`TC-01` (DemoQA Text Box — Pass)** in Column 1 (`SuiteSidebar`) and click **`Chạy kiểm thử`** in Column 2 (`StepEditor`).
   - **Expected**: Chrome navigates to `https://demoqa.com/text-box`, fills the form fields over CDP, and real-time SSE updates mark `step-1` through `step-5` (including optional `step-5`) as `PASSED`. Clicking `Chạy bước này` on any individual step executes it on the existing live tab.
3. Select **`TC-02` (DemoQA Broken Selector — Fail)** and click **`Chạy kiểm thử`**.
   - **Expected**:
     - Failure occurs at `#btn-pay` on `https://demoqa.com/text-box`.
     - Fallback Bounding Box locates the nearest form container on the page, and Column 3 (`EvidenceViewer`) displays the zoomable screenshot with a dotted red bounding box and error badge (`Hiển thị vùng lỗi` switch toggles between `raw` and `annotated` PNG).
     - Console/Network telemetry appears alongside the Vietnamese AI Root Cause Diagnosis (`aiDiagnosis`) and an **`Áp dụng bộ chọn`** button (`suggestedSelector`) that updates the broken step selector.
     - Clicking **`Sao chép báo cáo`** copies the formatted Markdown report to the clipboard.

### Scenario B: Production Safety Guardrails & Secret Redaction (US2)
1. Switch the top-bar Environment dropdown (`Header`) to **`Production`**.
   - **Expected**: Header border turns red with a warning tag. `TC-02` (tagged `financial`) shows `Bị chặn trên Prod` and its `Chạy kiểm thử` button is disabled.
2. Inspect `tests/runs/<latest_run_id>/summary.json`.
   - **Expected**: All values matching keys in `tests/projects/default/.env.local` appear strictly as `[REDACTED]`.

### Scenario C: Multimodal Spec Generation (US3)
1. Click **`Tạo kịch bản`** in Column 1.
2. Upload a UI wireframe image and enter Acceptance Criteria, then click `Tạo` and `Lưu vào dự án`.
   - **Expected**: New Happy Path and Negative Case YAML specs are created in `tests/projects/default/specs/` and appear immediately in the sidebar.

### Scenario D: Git Sync & Step-Level Conflict Resolution (US4)
1. Edit a step in Column 2, click **`Lưu`**, then click **`Đồng bộ`** in the Header.
   - **Expected**: Changes are committed via `simple-git` and sync status updates.
