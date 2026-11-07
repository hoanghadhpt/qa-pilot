# Research & Architectural Decisions: Shared Auth Session Storage

**Feature ID**: `005-shared-auth-session`  
**Status**: Completed  
**Date**: 2026-11-06  

---

## 1. Storage State Specification & Compatibility

### Context
In automated E2E testing (Playwright, Puppeteer, Cypress), re-authenticating through the UI for every test case wastes 60-80% of execution time, exposes test suites to flaky UI timing, and risks rate-limits or bot protection (CAPTCHA/Cloudflare). We need a unified, portable format for preserving and restoring authentication state across sessions.

### Decision
Adopt the **standard Playwright `storageState` format** directly for storing session state:
```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "xyz...",
      "domain": "example.com",
      "path": "/",
      "expires": 1793990000,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://example.com",
      "localStorage": [
        {
          "name": "auth_token",
          "value": "eyJhbGciOi..."
        }
      ]
    }
  ]
}
```

### Rationale
1. **Native Interoperability**: Compatible out-of-the-box with `browser.newContext({ storageState: '...' })` and exported test suites (`packages/mcp-server/src/engine/playwrightExporter.ts`).
2. **Deterministic Coverage**: Captures both HTTP-only Cookies and Single Page Application (SPA) JWTs in `localStorage`.
3. **File-based & Zero-Database**: Conforms strictly to Constitution Principle II (Zero-Database Persistence).

### Alternatives Evaluated
- *Cookie-only sync (e.g. CookieCloud)*: Insufficient for modern React/Vue SPAs that store bearer tokens in `localStorage`.
- *Raw Chrome Profile clone*: High disk usage (>100MB per profile), contains cache locks, non-portable across machines/CI runners.

---

## 2. JWT & Cookie Expiry Inspection Algorithm

### Context
When test runners use stale or expired session tokens, tests fail unpredictably (e.g. elements not found because the app redirected to `/login`, or API calls returned 401). We need a lightweight, deterministic inspection algorithm to evaluate session health before and during test runs without adding heavy external dependencies.

### Decision
Implement `AuthSessionManager.inspectStatus(storageState)`:
1. **JWT Expiry Check**: Scan all `localStorage` values and cookie values for strings matching the JWT 3-part pattern (`header.payload.signature`). Base64url-decode the payload and check the `exp` claim against current Unix timestamp (`Math.floor(Date.now() / 1000)`).
2. **Cookie Expiry Check**: Inspect the `expires` attribute of all stored cookies (excluding session cookies with `-1` or missing expiration).
3. **Session Status Classification**:
   - `valid`: Token and critical cookies have > 5 minutes of remaining TTL.
   - `expiring_soon`: Token has < 5 minutes remaining.
   - `expired`: Token or critical cookies have already expired.
   - `unknown`: No explicit timestamp found (session cookie or opaque token).

### Rationale
- Zero-dependency: Uses built-in Node.js `Buffer.from(payload, 'base64url').toString('utf8')`.
- Fast: Executes in < 2ms without requiring network roundtrips.

---

## 3. Solo QA vs Team QA Lifecycle Workflow

### Context
Solo QA engineers need rapid, interactive login with zero configuration. Team QA and CI/CD pipelines need automated, multi-role credential matrices without checking credentials into Git.

### Decision
Provide two complementary operational workflows:

#### Workflow A: Solo QA Interactive One-Time Login
1. Tester starts browser in headed mode: `qa_launch_browser({ headless: false })`.
2. Tester navigates to target app and manually logs in (solving any 2FA/OTP/CAPTCHA once).
3. Tester invokes tool: `qa_auth_save({ role: 'admin' })`.
4. System extracts cookies + localStorage, validates expiry, and saves to `tests/fixtures/auth/admin.json`.
5. Future test runs simply call: `qa_auth_load({ role: 'admin' })` (takes ~0.05s).

#### Workflow B: Team QA & CI/CD Vault
1. Profiles are saved locally to `tests/fixtures/auth/<role>.json`.
2. `tests/fixtures/auth/` and `*.auth.json` are strictly added to `.gitignore`.
3. For CI runners, allow importing from environment variables:
   - `QA_AUTH_STATE_ADMIN`: Base64-encoded JSON of `admin.json`.
   - `QA_AUTH_VAULT_KEY`: Optional AES-256-GCM decryption key if the vault string is encrypted.

---

## 4. Triple-Oracle Auth Failure Interception

### Context
When a session expires mid-test, tests currently fail with cryptic locator timeouts (e.g. "Waiting for #dashboard-table... timed out after 5000ms") rather than pinpointing the root cause.

### Decision
Extend `OracleWatcher` (`packages/mcp-server/src/engine/oracleWatcher.ts`):
1. Listen for HTTP response status `401 Unauthorized` or `403 Forbidden` on API endpoints.
2. Monitor navigation events: if the URL unexpectedly changes to a path containing `/login`, `/signin`, or `auth`, flag an `auth_session_expired` issue.
3. In visual reports, clearly annotate: `Xác thực không hợp lệ hoặc phiên đăng nhập đã hết hạn. Vui lòng làm mới session cho vai trò '${activeRole}'`.

---

## 5. Security & Redaction Strategy

### Context
Per Constitution Principle III (Production Safety & Secret Redaction), all tokens and secrets MUST be redacted in logs, visual reports, and AI prompts.

### Decision
1. Update `packages/mcp-server/src/security/redactor.ts`:
   - Auto-register any extracted JWT or session cookie value into `globalRedactor` when `qa_auth_save` or `qa_auth_load` is called.
   - Ensure `storageState` file contents are NEVER printed in raw form in tool responses or SSE streams.
2. Ensure `tests/fixtures/auth/` is strictly added to root `.gitignore`.

