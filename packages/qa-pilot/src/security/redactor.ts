export class Redactor {
  private sensitiveValues: Set<string> = new Set();

  constructor(secrets?: Record<string, string>) {
    if (secrets) {
      this.addSecrets(secrets);
    }
  }

  public addSecrets(secrets: Record<string, string>): void {
    for (const [key, value] of Object.entries(secrets)) {
      this.addSecret(value);
    }
  }

  public addSecret(value: string): void {
    if (typeof value === 'string' && value.trim().length > 3) {
      this.sensitiveValues.add(value.trim());
    }
  }

  public redact(text: string): string {
    if (!text) {
      return text;
    }

    let result = text;
    if (this.sensitiveValues.size > 0) {
      for (const secret of this.sensitiveValues) {
        if (secret) {
          result = result.split(secret).join('[REDACTED]');
        }
      }
    }

    // Auto redact standard JWT patterns if present
    const jwtPattern = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
    result = result.replace(jwtPattern, '[REDACTED_JWT]');

    return result;
  }

  public redactObject<T>(obj: T): T {
    if (!obj) return obj;
    try {
      const json = JSON.stringify(obj);
      const redactedJson = this.redact(json);
      return JSON.parse(redactedJson) as T;
    } catch {
      return obj;
    }
  }
}

export const globalRedactor = new Redactor();

