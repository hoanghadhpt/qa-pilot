export type StepAction = 'open' | 'input' | 'click' | 'assert';

export interface TestStep {
  id: string;
  action: StepAction;
  target: string;
  value?: string;
  expected?: string;
  description: string;
  optional: boolean;
  sensitive?: boolean;
  timeout_ms?: number;
}

export type AssertionType =
  | 'element_visible'
  | 'no_console_errors'
  | 'url_contains'
  | 'text_visible';

export interface TestAssertion {
  type: AssertionType;
  target?: string;
  severity?: 'error' | 'warning';
}

export interface EnvironmentRule {
  allowed: string[];
  blocked: string[];
}

export interface TestSpec {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  environments: EnvironmentRule;
  steps: TestStep[];
  assertions?: TestAssertion[];
}

export interface SpecListItem {
  fileName: string;
  spec: TestSpec;
  lastRun?: {
    runId: string;
    status: 'RUNNING' | 'PASSED' | 'FAILED' | 'BLOCKED';
    durationMs: number;
    startedAt: string;
  } | null;
  prodSafety: {
    allowed: boolean;
    reason: string | null;
  };
}

export interface EnvironmentConfig {
  name: 'local' | 'staging' | 'production' | string;
  is_production: boolean;
  base_url: string;
  allowed_domains: string[];
  variables?: Record<string, string>;
}

export type StepRunStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';

export interface StepRunResult {
  stepId: string;
  action: string;
  description: string;
  status: StepRunStatus;
  durationMs: number;
  error?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NetworkFailure {
  url: string;
  method?: string;
  status: number;
}

export interface FailureEvidence {
  rawScreenshot: string;
  annotatedScreenshot: string;
  boundingBox: BoundingBox;
  errorLabel: string;
  consoleErrors: string[];
  networkFailures: NetworkFailure[];
}

export interface AiDiagnosis {
  rootCause: string;
  recommendation: string;
  suggestedSelector?: string;
}

export interface TestRunSummary {
  runId: string;
  testId: string;
  projectId: string;
  environment: string;
  status: 'RUNNING' | 'PASSED' | 'FAILED' | 'BLOCKED';
  startedAt: string;
  durationMs: number;
  failedStepIndex: number | null;
  steps: StepRunResult[];
  evidence: FailureEvidence | null;
  aiDiagnosis: AiDiagnosis | null;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  hasConflicts: boolean;
  conflicts?: SpecConflict[];
}

export interface StepDiffItem {
  index: number;
  local?: TestStep;
  remote?: TestStep;
  hasConflict: boolean;
}

export interface SpecConflict {
  specPath: string;
  testId: string;
  localSteps: TestStep[];
  remoteSteps: TestStep[];
  stepDiffs: StepDiffItem[];
}

export interface CdpStatus {
  connected: boolean;
  browser?: string;
  cdpUrl: string;
  headless: boolean;
}

