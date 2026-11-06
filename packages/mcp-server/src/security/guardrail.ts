import { EnvironmentConfig } from '../types.js';

export interface GuardrailCheckResult {
  allowed: boolean;
  reason?: string;
}

export class Guardrail {
  public checkAction(action: string, env: EnvironmentConfig): GuardrailCheckResult {
    if (!env.isProduction) {
      return { allowed: true };
    }

    const lower = action.toLowerCase();
    for (const keyword of env.blockedActions) {
      if (lower.includes(keyword.toLowerCase())) {
        return {
          allowed: false,
          reason: `Hành động bị chặn trên môi trường Production: phát hiện từ khóa nguy hiểm '${keyword}' trong lệnh '${action}'`
        };
      }
    }

    return { allowed: true };
  }

  public checkUrl(url: string, env: EnvironmentConfig): GuardrailCheckResult {
    if (!env.isProduction) {
      return { allowed: true };
    }

    try {
      const parsed = new URL(url);
      const isAllowed = env.allowedDomains.some(domain => {
        if (domain === '*') return true;
        return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
      });

      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Địa chỉ URL '${url}' không nằm trong danh sách tên miền được phép (${env.allowedDomains.join(', ')}) trên môi trường Production`
        };
      }
    } catch {
      return {
        allowed: false,
        reason: `Địa chỉ URL không hợp lệ: '${url}'`
      };
    }

    return { allowed: true };
  }
}

export const guardrail = new Guardrail();

