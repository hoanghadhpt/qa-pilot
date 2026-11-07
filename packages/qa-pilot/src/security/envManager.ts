import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { EnvironmentConfig } from '../types.js';
import { globalRedactor } from './redactor.js';

export class EnvironmentManager {
  private workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || process.cwd();
  }

  public loadEnvironment(envName = 'local'): EnvironmentConfig {
    const isProd = envName.toLowerCase() === 'production' || envName.toLowerCase() === 'prod';
    
    // Load local secrets from .env.local
    const secrets: Record<string, string> = {};
    const envLocalPaths = [
      path.join(this.workspaceRoot, '.env.local'),
      path.join(this.workspaceRoot, 'tests', 'projects', 'default', '.env.local'),
      path.join(this.workspaceRoot, '.env')
    ];

    for (const p of envLocalPaths) {
      if (fs.existsSync(p)) {
        try {
          const parsed = dotenv.parse(fs.readFileSync(p));
          Object.assign(secrets, parsed);
        } catch {
          // ignore read error
        }
      }
    }

    // Register sensitive values with redactor
    globalRedactor.addSecrets(secrets);

    // Default environment configuration
    const config: EnvironmentConfig = {
      name: envName,
      baseUrl: process.env.BASE_URL || 'https://demo.automationtesting.in/Register.html',
      isProduction: isProd,
      allowedDomains: isProd ? ['mycompany.com'] : ['*'],
      blockedActions: isProd ? ['delete', 'destroy', 'drop', 'remove', 'truncate', 'payment', 'checkout', 'pay'] : [],
      secrets
    };

    return config;
  }
}

export const envManager = new EnvironmentManager();

