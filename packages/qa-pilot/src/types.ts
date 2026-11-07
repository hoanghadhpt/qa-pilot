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

// Auth Session Types
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

export interface LocalStorageRecord {
  name: string;
  value: string;
}

export interface OriginStorageRecord {
  origin: string;
  localStorage: LocalStorageRecord[];
}

export interface PlaywrightStorageState {
  cookies: CookieRecord[];
  origins: OriginStorageRecord[];
}

export type AuthStateStatus = 'valid' | 'expiring_soon' | 'expired' | 'unknown';

export interface AuthStatusResult {
  role: string;
  status: AuthStateStatus;
  remainingSeconds: number | null;
  expiresAt: string | null;
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

export interface AuthSessionProfile {
  role: string;
  filePath: string;
  createdAt: string;
  updatedAt: string;
  storageState: PlaywrightStorageState;
  metadata: AuthSessionMetadata;
}

// Test Suite Management Types
export type CasePriority = 'P1' | 'P2' | 'P3' | 'P4';
export type CaseType =
  | 'happy_path'
  | 'negative_validation'
  | 'boundary_value'
  | 'security_probe'
  | 'idempotency';

export interface TestStep {
  step: number;
  action: string;
  data?: string;
  expected: string;
  optional?: boolean;
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  priority: CasePriority;
  type: CaseType;
  tags: string[];
  auth_role?: string;
  preconditions: string[];
  steps: TestStep[];
  assertions: string[];
  postconditions?: string[];
}

export interface TestSuite {
  id: string;
  module: string;
  name: string;
  description?: string;
  target_url?: string;
  environment?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  cases: TestCase[];
}

export interface StepExecutionResult {
  stepIndex: number;
  action: string;
  data?: string;
  expected: string;
  status: 'passed' | 'failed' | 'skipped' | 'warning';
  durationMs: number;
  screenshotBefore?: string;
  screenshotAfter?: string;
  errorMessage?: string;
}

export interface TestCaseExecutionResult {
  caseId: string;
  title: string;
  priority: CasePriority;
  type: CaseType;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  steps: StepExecutionResult[];
  oracleIssues: any[];
  errorMessage?: string;
}

export interface SuiteExecutionRun {
  runId: string;
  suiteId: string;
  suiteName: string;
  module: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  skippedCases: number;
  filterTags?: string[];
  results: TestCaseExecutionResult[];
  reportPath: string;
}



