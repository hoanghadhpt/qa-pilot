# Quickstart Validation Guide: Shared Auth Session Storage

**Feature ID**: `005-shared-auth-session`  
**Status**: Ready for Verification  
**Date**: 2026-11-06  

---

## 1. Prerequisites

1. Node.js >= 18 installed.
2. Dependencies built in `packages/mcp-server/`.
3. An active browser target with authentication (e.g. testing website, local auth server, or mock login page).

---

## 2. Validation Scenarios

### Scenario 1: Solo QA Interactive Login & Profile Save (P1)
**Goal**: Verify that a human tester can manually log in once and save the session profile.

1. **Launch Browser in Headed Mode**:
   ```bash
   # Via MCP tool:
   qa_launch_browser({ headless: false })
   ```
2. **Navigate to Target Login Screen**:
   ```bash
   qa_navigate({ url: "https://example.com/login" })
   ```
3. **Manual Interactive Step (Human-in-the-loop)**:
   - Tester fills credentials, completes CAPTCHA/OTP if needed, and reaches the dashboard (`https://example.com/dashboard`).
4. **Save Auth Profile**:
   ```bash
   qa_auth_save({ role: "admin" })
   ```
5. **Expected Outcome**:
   - MCP returns status `valid`.
   - File created at `tests/fixtures/auth/admin.json`.
   - All session cookie values and JWT strings are registered in `globalRedactor`.

---

### Scenario 2: Zero-Latency Session Replay (P1)
**Goal**: Verify instant session restoration without visiting `/login`.

1. **Close and Reset Browser Context**:
   ```bash
   qa_close_browser()
   ```
2. **Launch Fresh Browser and Load Session**:
   ```bash
   qa_launch_browser({ headless: true })
   qa_auth_load({ role: "admin", targetUrl: "https://example.com/dashboard" })
   ```
3. **Verify Auth Assertion**:
   ```bash
   qa_assert({ assertion: "Bảng điều khiển người dùng hiển thị" })
   ```
4. **Expected Outcome**:
   - Navigation directly reaches `https://example.com/dashboard` in < 1 second.
   - Page remains authenticated; no redirect to `/login`.
   - Test execution logs show `Role: admin` loaded successfully.

---

### Scenario 3: Expiry Inspection & Warning (P1)
**Goal**: Verify proactive detection of expired or expiring tokens.

1. **Inspect Saved Profile Status**:
   ```bash
   qa_auth_status({ role: "admin" })
   ```
2. **Expected Outcome**:
   - Returns JSON payload with `status`: `valid` (with remaining minutes), `expiring_soon`, or `expired`.
   - If expired, `qa_auth_load` outputs an explicit warning: `Phiên đăng nhập cho admin đã hết hạn`.

---

### Scenario 4: Multi-Role Fast Context Switching (P2)
**Goal**: Verify clean isolation when switching between roles in the same test suite.

1. **Load Admin Role**:
   ```bash
   qa_auth_load({ role: "admin", targetUrl: "https://example.com/admin/settings" })
   qa_assert({ assertion: "Trang cấu hình hệ thống hiển thị" })
   ```
2. **Switch to Customer Role**:
   ```bash
   qa_auth_load({ role: "customer", targetUrl: "https://example.com/cart" })
   qa_assert({ assertion: "Giỏ hàng hiển thị" })
   ```
3. **Expected Outcome**:
   - Previous admin cookies and local storage are purged.
   - Customer credentials take effect immediately without context contamination.

---

### Scenario 5: Secret Redaction & Git Leak Prevention (P3)
**Goal**: Guarantee zero leaks of sensitive session cookies or JWT tokens.

1. **Inspect `.gitignore`**:
   ```bash
   git status --ignored tests/fixtures/auth/
   ```
   *Expected*: The auth folder must appear under "Ignored files".
2. **Generate Visual Report**:
   ```bash
   qa_get_report()
   ```
   *Expected*: Opening the HTML report verifies that no raw JWT strings or authentication cookie values appear in plain text in the report DOM or step logs; all are masked as `[REDACTED]`.

