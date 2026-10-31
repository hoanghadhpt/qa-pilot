import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { config } from '../config/env';
import { TestSpec } from './specAdapter';

export interface EnvironmentConfig {
  name: string;
  is_production: boolean;
  base_url: string;
  allowed_domains: string[];
  variables?: Record<string, string>;
}

export interface ProdSafetyResult {
  allowed: boolean;
  reason: string | null;
}

const FORBIDDEN_PROD_TAGS = ['destructive', 'financial', 'data-creation'];

export class EnvironmentManager {
  public loadEnvConfig(projectId: string, envName: string): EnvironmentConfig {
    const envPath = path.join(config.projectsRoot, projectId, 'envs', `${envName}.yaml`);
    if (!fs.existsSync(envPath)) {
      return {
        name: envName,
        is_production: envName === 'production',
        base_url: 'https://demo.automationtesting.in',
        allowed_domains: ['demo.automationtesting.in'],
        variables: {},
      };
    }
    const raw = yaml.load(fs.readFileSync(envPath, 'utf-8')) as Record<string, unknown>;
    return {
      name: String(raw.name || envName),
      is_production: Boolean(raw.is_production ?? envName === 'production'),
      base_url: String(raw.base_url || 'https://demo.automationtesting.in'),
      allowed_domains: Array.isArray(raw.allowed_domains)
        ? raw.allowed_domains.map(String)
        : ['demo.automationtesting.in'],
      variables: (raw.variables as Record<string, string>) || {},
    };
  }

  public listEnvironments(projectId = 'default'): EnvironmentConfig[] {
    const envsDir = path.join(config.projectsRoot, projectId, 'envs');
    if (!fs.existsSync(envsDir)) {
      return [
        this.loadEnvConfig(projectId, 'local'),
        this.loadEnvConfig(projectId, 'staging'),
        this.loadEnvConfig(projectId, 'production'),
      ];
    }
    const order = ['local', 'staging', 'production'];
    const files = fs
      .readdirSync(envsDir)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f) => f.replace(/\.ya?ml$/, ''));

    const uniqueNames = Array.from(new Set([...order, ...files]));
    return uniqueNames.map((name) => this.loadEnvConfig(projectId, name));
  }

  public loadFixtures(projectId = 'default'): Record<string, unknown> {
    const fixturesDir = path.join(config.projectsRoot, projectId, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      return {};
    }
    const result: Record<string, unknown> = {};
    for (const file of fs.readdirSync(fixturesDir)) {
      if (file.endsWith('.json')) {
        const key = file.replace(/\.json$/, '');
        try {
          result[key] = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf-8'));
        } catch {
          // ignore malformed fixture
        }
      }
    }
    return result;
  }

  public loadLocalSecrets(projectId = 'default'): Record<string, string> {
    const envLocalPath = path.join(config.projectsRoot, projectId, '.env.local');
    if (!fs.existsSync(envLocalPath)) {
      return {};
    }
    try {
      return dotenv.parse(fs.readFileSync(envLocalPath, 'utf-8'));
    } catch {
      return {};
    }
  }

  public getAvailableHelperTokens(projectId = 'default'): string[] {
    const secrets = Object.keys(this.loadLocalSecrets(projectId)).map((k) => `\${secret.${k}}`);
    const envVars = ['${env.BASE_URL}'];
    const envs = this.listEnvironments(projectId);
    for (const env of envs) {
      if (env.variables) {
        for (const k of Object.keys(env.variables)) {
          const token = `\${env.${k}}`;
          if (!envVars.includes(token)) envVars.push(token);
        }
      }
    }
    const fakerTokens = ['${faker.email}', '${faker.fullName}', '${faker.uuid}'];
    return [
      ...envVars,
      ...secrets,
      '${fixture.users.standard.username}',
      '${fixture.users.standard.email}',
      '${fixture.users.standard.currentAddress}',
      ...fakerTokens,
    ];
  }

  public evaluateProdSafety(
    projectId: string,
    envName: string,
    spec: TestSpec
  ): ProdSafetyResult {
    const envConfig = this.loadEnvConfig(projectId, envName);

    if (spec.environments.blocked.includes(envName)) {
      return {
        allowed: false,
        reason: `Kịch bản bị cấu hình chặn trên môi trường '${envName}'.`,
      };
    }

    if (
      spec.environments.allowed.length > 0 &&
      !spec.environments.allowed.includes(envName)
    ) {
      return {
        allowed: false,
        reason: `Kịch bản không nằm trong danh sách cho phép của môi trường '${envName}'.`,
      };
    }

    if (!envConfig.is_production) {
      return { allowed: true, reason: null };
    }

    const forbiddenTag = spec.tags.find((t) =>
      FORBIDDEN_PROD_TAGS.includes(t.toLowerCase())
    );
    if (forbiddenTag) {
      return {
        allowed: false,
        reason: `Chặn thực thi trên Production do kịch bản chứa nhãn '${forbiddenTag}'.`,
      };
    }

    for (const step of spec.steps) {
      if (step.action === 'open') {
        const resolvedUrl = this.interpolate(step.target, projectId, envName);
        try {
          const parsedUrl = new URL(resolvedUrl);
          const host = parsedUrl.hostname.toLowerCase();
          const isWhitelisted = envConfig.allowed_domains.some(
            (domain) => host === domain.toLowerCase() || host.endsWith(`.${domain.toLowerCase()}`)
          );
          if (!isWhitelisted) {
            return {
              allowed: false,
              reason: `Tên miền '${host}' không nằm trong danh sách cho phép trên Production.`,
            };
          }
        } catch {
          // relative or template URL
        }
      }
    }

    return { allowed: true, reason: null };
  }

  public interpolate(
    rawValue: string | undefined,
    projectId: string,
    envName: string
  ): string {
    if (!rawValue) return '';
    const envConfig = this.loadEnvConfig(projectId, envName);
    const secrets = this.loadLocalSecrets(projectId);
    const fixtures = this.loadFixtures(projectId);

    return rawValue.replace(/\$\{([^}]+)\}/g, (match, expr: string) => {
      const trimmed = expr.trim();
      if (trimmed === 'env.BASE_URL') {
        return envConfig.base_url.replace(/\/$/, '');
      }
      if (trimmed.startsWith('env.')) {
        const key = trimmed.slice(4);
        return envConfig.variables?.[key] ?? match;
      }
      if (trimmed.startsWith('secret.')) {
        const key = trimmed.slice(7);
        return secrets[key] ?? match;
      }
      if (trimmed.startsWith('fixture.')) {
        const parts = trimmed.slice(8).split('.');
        let cur: unknown = fixtures;
        for (const p of parts) {
          if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
            cur = (cur as Record<string, unknown>)[p];
          } else {
            return match;
          }
        }
        return typeof cur === 'string' || typeof cur === 'number' ? String(cur) : match;
      }
      if (trimmed === 'faker.email') {
        return `qa.user.${Date.now().toString().slice(-4)}@example.com`;
      }
      if (trimmed === 'faker.fullName') {
        return 'Nguyen Van QA';
      }
      if (trimmed === 'faker.uuid') {
        return `uuid-${Date.now()}`;
      }
      return match;
    });
  }

  public redact(
    text: string | undefined,
    projectId: string,
    extraSensitiveValues: string[] = []
  ): string {
    if (!text) return '';
    const secrets = Object.values(this.loadLocalSecrets(projectId)).filter(
      (v) => v && v.trim().length >= 2
    );
    const allSecrets = Array.from(new Set([...secrets, ...extraSensitiveValues.filter(Boolean)]));

    let output = text;
    for (const secretVal of allSecrets) {
      if (secretVal && output.includes(secretVal)) {
        output = output.split(secretVal).join('[REDACTED]');
      }
    }
    return output;
  }
}

export const environmentManager = new EnvironmentManager();

