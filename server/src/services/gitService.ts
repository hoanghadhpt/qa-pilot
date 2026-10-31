import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import simpleGit, { SimpleGit } from 'simple-git';
import { config } from '../config/env';
import { specAdapter, TestSpec, TestStep } from './specAdapter';

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

export interface GitStatusResult {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  hasConflicts: boolean;
  conflicts: SpecConflict[];
}

export class GitService {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit(config.repoRoot);
  }

  public async getStatus(): Promise<GitStatusResult> {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        await this.git.init();
      }
      const status = await this.git.status();
      const conflicts = this.parseConflictedSpecs(status.conflicted || []);
      return {
        branch: status.current || 'main',
        ahead: status.ahead || 0,
        behind: status.behind || 0,
        modified: [...status.modified, ...status.not_added, ...status.created].filter((f) =>
          f.startsWith('tests/projects/')
        ),
        hasConflicts: conflicts.length > 0,
        conflicts,
      };
    } catch {
      return {
        branch: 'main',
        ahead: 0,
        behind: 0,
        modified: [],
        hasConflicts: false,
        conflicts: [],
      };
    }
  }

  private parseConflictedSpecs(conflictedPaths: string[]): SpecConflict[] {
    const results: SpecConflict[] = [];
    for (const relPath of conflictedPaths) {
      if (!relPath.endsWith('.yaml') && !relPath.endsWith('.yml')) continue;
      const fullPath = path.join(config.repoRoot, relPath);
      if (!fs.existsSync(fullPath)) continue;

      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { oursText, theirsText } = this.splitGitConflictMarkers(raw);
      try {
        const localSpec = yaml.load(oursText) as TestSpec;
        const remoteSpec = yaml.load(theirsText) as TestSpec;
        const localSteps = Array.isArray(localSpec?.steps) ? localSpec.steps : [];
        const remoteSteps = Array.isArray(remoteSpec?.steps) ? remoteSpec.steps : [];
        const maxLen = Math.max(localSteps.length, remoteSteps.length);
        const stepDiffs: StepDiffItem[] = [];
        for (let i = 0; i < maxLen; i++) {
          const l = localSteps[i];
          const r = remoteSteps[i];
          const hasConflict = JSON.stringify(l) !== JSON.stringify(r);
          stepDiffs.push({ index: i, local: l, remote: r, hasConflict });
        }
        results.push({
          specPath: relPath,
          testId: localSpec?.id || remoteSpec?.id || path.basename(relPath),
          localSteps,
          remoteSteps,
          stepDiffs,
        });
      } catch {
        // Fallback if YAML inside conflict markers cannot be parsed cleanly
      }
    }
    return results;
  }

  private splitGitConflictMarkers(content: string): { oursText: string; theirsText: string } {
    const lines = content.split('\n');
    const ours: string[] = [];
    const theirs: string[] = [];
    let state: 'normal' | 'ours' | 'theirs' = 'normal';

    for (const line of lines) {
      if (line.startsWith('<<<<<<<')) {
        state = 'ours';
      } else if (line.startsWith('=======')) {
        state = 'theirs';
      } else if (line.startsWith('>>>>>>>')) {
        state = 'normal';
      } else {
        if (state === 'normal') {
          ours.push(line);
          theirs.push(line);
        } else if (state === 'ours') {
          ours.push(line);
        } else if (state === 'theirs') {
          theirs.push(line);
        }
      }
    }
    return { oursText: ours.join('\n'), theirsText: theirs.join('\n') };
  }

  public async syncSpecs(author = 'QA Pilot User'): Promise<{
    synced: boolean;
    message: string;
    status: GitStatusResult;
  }> {
    const currentStatus = await this.getStatus();
    if (currentStatus.hasConflicts) {
      return {
        synced: false,
        message: 'Phát hiện xung đột kịch bản cần giải quyết trước khi đồng bộ.',
        status: currentStatus,
      };
    }

    try {
      await this.git.add('tests/projects/');
      const postAdd = await this.git.status();
      if (postAdd.staged.length > 0) {
        await this.git.commit(`chore(specs): cap nhat kich ban kiem thu (${author})`);
      }

      const remotes = await this.git.getRemotes(true);
      if (remotes.length > 0) {
        try {
          await this.git.pull('origin', postAdd.current || 'main', { '--rebase': 'true' });
          await this.git.push('origin', postAdd.current || 'main');
        } catch {
          const afterPullStatus = await this.getStatus();
          if (afterPullStatus.hasConflicts) {
            return {
              synced: false,
              message: 'Xảy ra xung đột khi đồng bộ từ kho chung.',
              status: afterPullStatus,
            };
          }
        }
      }

      const finalStatus = await this.getStatus();
      return {
        synced: true,
        message: 'Đã lưu và đồng bộ kịch bản kiểm thử.',
        status: finalStatus,
      };
    } catch (err) {
      const fallbackStatus = await this.getStatus();
      return {
        synced: false,
        message: err instanceof Error ? err.message : 'Lỗi khi đồng bộ Git.',
        status: fallbackStatus,
      };
    }
  }

  public async resolveConflict(
    projectId: string,
    specPath: string,
    testId: string,
    resolvedSteps: TestStep[]
  ): Promise<GitStatusResult> {
    const existing = specAdapter.getSpecById(projectId, testId);
    const fullPath = path.join(config.repoRoot, specPath);
    let baseSpec: TestSpec = existing?.spec || {
      id: testId,
      title: `Kịch bản ${testId}`,
      tags: ['smoke'],
      environments: { allowed: ['local', 'staging'], blocked: ['production'] },
      steps: resolvedSteps,
      assertions: [],
    };
    baseSpec = { ...baseSpec, steps: resolvedSteps };
    specAdapter.saveSpec(projectId, baseSpec, path.basename(fullPath));

    try {
      await this.git.add(specPath);
      await this.git.commit(`chore(specs): giai quyet xung dot kich ban ${testId}`);
    } catch {
      // ignore commit error if not in rebase state
    }
    return this.getStatus();
  }
}

export const gitService = new GitService();

