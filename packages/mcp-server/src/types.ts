export type StepType = 'navigate' | 'act' | 'assert' | 'inspect';
export type StepStatus = 'passed' | 'failed' | 'skipped' | 'warning';

export interface QAStep {
  stepIndex: number;
  type: StepType;
  instruction: string;
  status: StepStatus;
  durationMs: number;
  screenshotBefore?: string;
  screenshotAfter?: string;
  errorMessage?: string;
  remedyAttempted?: boolean;
}

export interface EnvironmentConfig {
  name: string;
  baseUrl: string;
  isProduction: boolean;
  allowedDomains: string[];
  blockedActions: string[];
  secrets: Record<string, string>;
}

export interface QASession {
  sessionId: string;
  startedAt: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  browserMode: 'headed' | 'headless';
  currentUrl?: string;
  environment: EnvironmentConfig;
  steps: QAStep[];
  reportDir: string;
}

export interface TestExportArtifact {
  testId: string;
  format: 'playwright' | 'yaml';
  targetPath: string;
  content: string;
  tags: string[];
}

