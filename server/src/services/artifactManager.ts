import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

export interface StepRunResult {
  stepId: string;
  action: string;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  error?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FailureEvidence {
  rawScreenshot: string;
  annotatedScreenshot: string;
  boundingBox: BoundingBox;
  errorLabel: string;
  consoleErrors: string[];
  networkFailures: Array<{ url: string; method?: string; status: number }>;
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

export class ArtifactManager {
  constructor() {
    fs.mkdirSync(config.runsRoot, { recursive: true });
    fs.mkdirSync(config.tempRoot, { recursive: true });
  }

  public generateRunId(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `run-${datePart}-${timePart}`;
  }

  public ensureRunDir(runId: string): string {
    const dir = path.join(config.runsRoot, runId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  public writeSummary(runId: string, summary: TestRunSummary): void {
    const dir = this.ensureRunDir(runId);
    const filePath = path.join(dir, 'summary.json');
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf-8');
  }

  public writeA11yTree(runId: string, a11yData: unknown): void {
    const dir = this.ensureRunDir(runId);
    const filePath = path.join(dir, 'a11y-tree.json');
    fs.writeFileSync(filePath, JSON.stringify(a11yData, null, 2), 'utf-8');
  }

  public readSummary(runId: string): TestRunSummary | null {
    const filePath = path.join(config.runsRoot, runId, 'summary.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TestRunSummary;
    } catch {
      return null;
    }
  }

  public getLatestRunForTest(projectId: string, testId: string): TestRunSummary | null {
    if (!fs.existsSync(config.runsRoot)) {
      return null;
    }
    const dirs = fs
      .readdirSync(config.runsRoot)
      .filter((d) => d.startsWith('run-'))
      .sort()
      .reverse();

    for (const dir of dirs) {
      const summary = this.readSummary(dir);
      if (summary && summary.projectId === projectId && summary.testId === testId) {
        return summary;
      }
    }
    return null;
  }

  public getArtifactPath(runId: string, fileName: string): string | null {
    const safeRunId = path.basename(runId);
    const safeFile = path.basename(fileName);
    const fullPath = path.join(config.runsRoot, safeRunId, safeFile);
    return fs.existsSync(fullPath) ? fullPath : null;
  }
}

export const artifactManager = new ArtifactManager();

