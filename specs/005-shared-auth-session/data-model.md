# Data Model: Shared Auth Session Storage

**Feature ID**: `005-shared-auth-session`  
**Status**: Ready  
**Date**: 2026-11-06  

---

## 1. Entity Overview

```text
+-----------------------------------------------------------+
|                   AuthSessionProfile                      |
+-----------------------------------------------------------+
| - role: string (e.g. "admin", "customer")                 |
| - filePath: string                                        |
| - createdAt: string (ISO 8601)                            |
| - updatedAt: string (ISO 8601)                            |
| - storageState: PlaywrightStorageState                    |
| - metadata: AuthSessionMetadata                           |
+-----------------------------------------------------------+
                               |
            +------------------+------------------+
            |                                     |
+-----------------------+             +-----------------------+
|     CookieRecord      |             |   OriginStorageRecord |
+-----------------------+             +-----------------------+
| - name: string        |             | - origin: string      |
| - value: string       |             | - localStorage: item[]|
| - domain: string      |             +-----------------------+
| - path: string        |                         |
| - expires: number     |             +-----------------------+
| - httpOnly: boolean   |             |  LocalStorageRecord   |
| - secure: boolean     |             +-----------------------+
| - sameSite: string    |             | - name: string        |
+-----------------------+             | - value: string       |
                                      +-----------------------+
```

---

## 2. Entity Specifications

### 2.1 `AuthSessionProfile`
Represents the persistent authentication state for a specific user role.

| Field | Type | Required | Description |
|---|---|---|---|
| `role` | `string` | Yes | Unique role identifier (alphanumeric, lowercase, hyphen-friendly: `admin`, `staff-sg`, `buyer-vip`). |
| `filePath` | `string` | Yes | Absolute path on disk: `<rootDir>/tests/fixtures/auth/<role>.json`. |
| `createdAt` | `string` | Yes | ISO timestamp when the session was first captured. |
| `updatedAt` | `string` | Yes | ISO timestamp when the session was last refreshed. |
| `storageState` | `PlaywrightStorageState` | Yes | Full Playwright-compatible cookie and local storage state. |
| `metadata` | `AuthSessionMetadata` | Yes | Summary of tokens, domains, and expiry. |

### 2.2 `PlaywrightStorageState`
Strictly adheres to Playwright's `BrowserContext.storageState()` schema.

```typescript
export interface PlaywrightStorageState {
  cookies: CookieRecord[];
  origins: OriginStorageRecord[];
}

export interface CookieRecord {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number; // Unix timestamp in seconds (-1 for session cookies)
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

export interface OriginStorageRecord {
  origin: string; // e.g., "https://dashboard.example.com"
  localStorage: LocalStorageRecord[];
}

export interface LocalStorageRecord {
  name: string;
  value: string;
}
```

### 2.3 `AuthSessionMetadata` & `AuthStatusResult`
Used by `qa_auth_status` and visual reports to indicate session health.

```typescript
export type AuthStateStatus = 'valid' | 'expiring_soon' | 'expired' | 'unknown';

export interface AuthStatusResult {
  role: string;
  status: AuthStateStatus;
  remainingSeconds: number | null;
  expiresAt: string | null; // ISO timestamp
  domains: string[];
  cookieCount: number;
  hasJwt: boolean;
  message: string;
}

export interface AuthSessionMetadata {
  domains: string[];
  hasJwt: boolean;
  detectedExp?: number;
  summary: string;
}
```

### 2.4 `AuthImportExportPayload`
Used for secure CI/CD and Team QA token sharing without file commits.

```typescript
export interface AuthImportExportPayload {
  role: string;
  version: '1.0';
  exportedAt: string;
  storageStateBase64: string; // Encrypted or base64 encoded storageState
  checksum: string; // SHA-256 hash for integrity validation
}
```

---

## 3. Validation Rules

1. **Role Naming Rule**:
   - Must match regex: `^[a-zA-Z0-9_-]{2,32}$`.
   - Cannot be empty, cannot contain path traversal characters (`..`, `/`, `\`).
2. **File Placement Rule**:
   - Always stored within `tests/fixtures/auth/<role>.json`.
   - Target directory is automatically created if not existing (`mkdir -p`).
3. **Secret Redaction Rule**:
   - Values of `CookieRecord.value` and `LocalStorageRecord.value` MUST be registered in `globalRedactor` upon load and save.
   - Any serialization of `AuthStatusResult` or `AuthSessionProfile` destined for stdout/SSE/Report MUST NOT expose raw token signatures or cookie values.
4. **Git Exclude Enforcement**:
   - `tests/fixtures/auth/` and `*.auth.json` MUST be present in root `.gitignore`.

