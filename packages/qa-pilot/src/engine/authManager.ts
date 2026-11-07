import fs from 'node:fs';
import path from 'node:path';
import { BrowserContext } from 'playwright';
import {
  AuthSessionProfile,
  PlaywrightStorageState,
  AuthStatusResult,
  AuthStateStatus,
  CookieRecord,
  OriginStorageRecord
} from '../types.js';
import { globalRedactor } from '../security/redactor.js';

export class AuthSessionManager {
  private fixturesDir: string;
  private activeRole: string | null = null;

  constructor(fixturesDir?: string) {
    if (fixturesDir) {
      this.fixturesDir = fixturesDir;
    } else {
      // Find repo root or default to tests/fixtures/auth
      const currentDir = process.cwd();
      this.fixturesDir = path.resolve(currentDir, 'tests/fixtures/auth');
    }
  }

  public validateRole(role: string): void {
    if (!role || typeof role !== 'string') {
      throw new Error('Tên vai trò (role) không được để trống');
    }
    const roleRegex = /^[a-zA-Z0-9_-]{2,32}$/;
    if (!roleRegex.test(role)) {
      throw new Error(
        `Tên vai trò '${role}' không hợp lệ. Chỉ chấp nhận chữ cái, số, gạch nối (-), gạch dưới (_) từ 2-32 ký tự.`
      );
    }
  }

  public getProfilePath(role: string): string {
    this.validateRole(role);
    return path.join(this.fixturesDir, `${role}.json`);
  }

  public getActiveRole(): string | null {
    return this.activeRole;
  }

  public setActiveRole(role: string | null): void {
    this.activeRole = role;
  }

  /**
   * Trích xuất và lưu trạng thái phiên từ BrowserContext
   */
  public async saveSession(
    role: string,
    context: BrowserContext,
    description?: string
  ): Promise<AuthSessionProfile> {
    this.validateRole(role);

    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(this.fixturesDir)) {
      fs.mkdirSync(this.fixturesDir, { recursive: true });
    }

    const rawState = await context.storageState();
    const storageState: PlaywrightStorageState = {
      cookies: (rawState.cookies || []).map((c: any) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite || 'Lax',
      })),
      origins: (rawState.origins || []).map((o: any) => ({
        origin: o.origin,
        localStorage: (o.localStorage || []).map((ls: any) => ({
          name: ls.name,
          value: ls.value,
        })),
      })),
    };

    // Đăng ký secrets vào Redactor để che giấu trong logs / reports
    this.registerSecrets(storageState);

    const statusResult = this.inspectStatus(storageState, role);
    const filePath = this.getProfilePath(role);
    const now = new Date().toISOString();

    const profile: AuthSessionProfile = {
      role,
      filePath,
      createdAt: now,
      updatedAt: now,
      storageState,
      metadata: {
        domains: statusResult.domains,
        hasJwt: statusResult.hasJwt,
        detectedExp: statusResult.remainingSeconds
          ? Math.floor(Date.now() / 1000) + statusResult.remainingSeconds
          : undefined,
        summary: description || `Auth profile cho ${role} (${statusResult.cookieCount} cookies)`,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf8');
    this.activeRole = role;

    return profile;
  }

  /**
   * Nạp trạng thái phiên cho vai trò từ ổ đĩa hoặc biến môi trường
   */
  public async loadSession(role: string): Promise<PlaywrightStorageState> {
    this.validateRole(role);

    let storageState: PlaywrightStorageState | null = null;

    // 1. Kiểm tra biến môi trường CI/CD (QA_AUTH_STATE_<ROLE>)
    const envVarKey = `QA_AUTH_STATE_${role.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    const envPayload = process.env[envVarKey];
    if (envPayload) {
      try {
        const decoded = Buffer.from(envPayload, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded);
        storageState = parsed.storageState || parsed;
      } catch (err: any) {
        console.warn(`[AuthManager] Không thể giải mã biến môi trường ${envVarKey}: ${err.message}`);
      }
    }

    // 2. Nếu không có biến môi trường, đọc từ file local
    if (!storageState) {
      const filePath = this.getProfilePath(role);
      if (!fs.existsSync(filePath)) {
        throw new Error(
          `Không tìm thấy auth profile cho vai trò '${role}'. Vui lòng dùng 'qa_auth_save' trước hoặc cung cấp biến ${envVarKey}.`
        );
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      storageState = parsed.storageState || parsed;
    }

    if (!storageState) {
      throw new Error(`Định dạng auth profile của '${role}' không hợp lệ.`);
    }

    // Đăng ký secrets vào Redactor
    this.registerSecrets(storageState);
    this.activeRole = role;

    return storageState;
  }

  /**
   * Kiểm tra hạn dùng của token (JWT exp hoặc Cookie expires)
   */
  public inspectStatus(storageState: PlaywrightStorageState, role: string): AuthStatusResult {
    const domainsSet = new Set<string>();
    let minExp: number | null = null;
    let hasJwt = false;

    // 1. Phân tích Cookies
    for (const cookie of storageState.cookies || []) {
      if (cookie.domain) {
        domainsSet.add(cookie.domain);
      }
      if (typeof cookie.expires === 'number' && cookie.expires > 0) {
        if (minExp === null || cookie.expires < minExp) {
          minExp = cookie.expires;
        }
      }
      // Kiểm tra giá trị cookie có phải JWT không
      const jwtExp = this.extractJwtExp(cookie.value);
      if (jwtExp !== null) {
        hasJwt = true;
        if (minExp === null || jwtExp < minExp) {
          minExp = jwtExp;
        }
      }
    }

    // 2. Phân tích LocalStorage
    for (const origin of storageState.origins || []) {
      if (origin.origin) {
        domainsSet.add(origin.origin);
      }
      for (const item of origin.localStorage || []) {
        const jwtExp = this.extractJwtExp(item.value);
        if (jwtExp !== null) {
          hasJwt = true;
          if (minExp === null || jwtExp < minExp) {
            minExp = jwtExp;
          }
        }
      }
    }

    const nowSec = Math.floor(Date.now() / 1000);
    let status: AuthStateStatus = 'unknown';
    let remainingSeconds: number | null = null;
    let expiresAt: string | null = null;
    let message = `Profile '${role}' có ${storageState.cookies?.length || 0} cookies.`;

    if (minExp !== null) {
      remainingSeconds = minExp - nowSec;
      expiresAt = new Date(minExp * 1000).toISOString();

      if (remainingSeconds <= 0) {
        status = 'expired';
        message = `Phiên xác thực cho '${role}' đã hết hạn vào ${expiresAt}. Vui lòng đăng nhập lại.`;
      } else if (remainingSeconds < 300) {
        status = 'expiring_soon';
        const mins = Math.ceil(remainingSeconds / 60);
        message = `Phiên xác thực cho '${role}' sắp hết hạn (còn khoảng ${mins} phút).`;
      } else {
        status = 'valid';
        const mins = Math.floor(remainingSeconds / 60);
        message = `Phiên xác thực cho '${role}' còn hiệu lực (${mins} phút).`;
      }
    } else {
      status = 'valid';
      message = `Phiên xác thực cho '${role}' là phiên phiên vĩnh viễn/session cookie.`;
    }

    return {
      role,
      status,
      remainingSeconds,
      expiresAt,
      domains: Array.from(domainsSet),
      cookieCount: storageState.cookies?.length || 0,
      hasJwt,
      message,
    };
  }

  /**
   * Quét và liệt kê tình trạng của tất cả các profile đã lưu
   */
  public async listProfiles(): Promise<AuthStatusResult[]> {
    if (!fs.existsSync(this.fixturesDir)) {
      return [];
    }

    const files = fs.readdirSync(this.fixturesDir).filter((f) => f.endsWith('.json'));
    const results: AuthStatusResult[] = [];

    for (const file of files) {
      const role = path.basename(file, '.json');
      try {
        const filePath = path.join(this.fixturesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        const state = parsed.storageState || parsed;
        results.push(this.inspectStatus(state, role));
      } catch (err: any) {
        results.push({
          role,
          status: 'unknown',
          remainingSeconds: null,
          expiresAt: null,
          domains: [],
          cookieCount: 0,
          hasJwt: false,
          message: `Lỗi đọc file profile: ${err.message}`,
        });
      }
    }

    return results;
  }

  /**
   * Xóa profile trên đĩa hoặc làm sạch session trên context hiện tại
   */
  public async clearSession(
    role?: string,
    context?: BrowserContext | null
  ): Promise<{ cleared: boolean; target: string; message: string }> {
    if (role) {
      this.validateRole(role);
      const filePath = this.getProfilePath(role);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (this.activeRole === role) {
        this.activeRole = null;
      }
      return {
        cleared: true,
        target: `profile:${role}`,
        message: `Đã xóa file auth profile của vai trò '${role}'.`,
      };
    }

    // Làm sạch session trên browser context hiện tại nếu có
    if (context) {
      await context.clearCookies().catch(() => {});
      for (const page of context.pages()) {
        await page
          .evaluate(() => {
            try {
              localStorage.clear();
              sessionStorage.clear();
            } catch {}
          })
          .catch(() => {});
      }
    }

    const prevRole = this.activeRole;
    this.activeRole = null;
    return {
      cleared: true,
      target: 'browser_context',
      message: `Đã làm sạch cookies và localStorage trên trình duyệt (vai trò trước đó: ${prevRole || 'none'}).`,
    };
  }

  /**
   * Xuất session profile dạng Base64 để nhúng vào CI/CD environment variable
   */
  public exportBase64(role: string): string {
    const filePath = this.getProfilePath(role);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Profile '${role}' không tồn tại trên ổ đĩa.`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return Buffer.from(content).toString('base64');
  }

  /**
   * Nhập session profile từ Base64 string
   */
  public importBase64(role: string, base64Payload: string): AuthSessionProfile {
    this.validateRole(role);
    if (!fs.existsSync(this.fixturesDir)) {
      fs.mkdirSync(this.fixturesDir, { recursive: true });
    }
    const jsonStr = Buffer.from(base64Payload, 'base64').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    const storageState: PlaywrightStorageState = parsed.storageState || parsed;

    const statusResult = this.inspectStatus(storageState, role);
    const filePath = this.getProfilePath(role);
    const now = new Date().toISOString();

    const profile: AuthSessionProfile = {
      role,
      filePath,
      createdAt: parsed.createdAt || now,
      updatedAt: now,
      storageState,
      metadata: {
        domains: statusResult.domains,
        hasJwt: statusResult.hasJwt,
        summary: `Imported profile cho ${role}`,
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf8');
    this.registerSecrets(storageState);
    return profile;
  }

  /**
   * Đăng ký các token/cookie nhạy cảm vào Redactor
   */
  private registerSecrets(storageState: PlaywrightStorageState): void {
    for (const cookie of storageState.cookies || []) {
      if (cookie.value && cookie.value.length > 5) {
        globalRedactor.addSecret(cookie.value);
      }
    }
    for (const origin of storageState.origins || []) {
      for (const item of origin.localStorage || []) {
        if (item.value && item.value.length > 5) {
          globalRedactor.addSecret(item.value);
        }
      }
    }
  }

  /**
   * Trích xuất exp từ JWT token nếu chuỗi thỏa mãn định dạng JWT
   */
  private extractJwtExp(val: string): number | null {
    if (!val || typeof val !== 'string') return null;

    // Remove "Bearer " prefix if present
    const token = val.startsWith('Bearer ') ? val.substring(7).trim() : val.trim();
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    try {
      const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadStr);
      if (typeof payload.exp === 'number') {
        return payload.exp;
      }
    } catch {
      return null;
    }
    return null;
  }
}

export const authManager = new AuthSessionManager();

