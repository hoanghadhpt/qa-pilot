import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { config } from '../config/env';

export interface TestStep {
  id: string;
  action: 'open' | 'input' | 'click' | 'scroll' | 'wait' | 'assert';
  target: string;
  value?: string;
  expected?: string;
  description: string;
  optional: boolean;
  sensitive?: boolean;
  timeout_ms?: number;
}

export interface TestAssertion {
  type: 'element_visible' | 'no_console_errors' | 'url_contains' | 'text_visible';
  target?: string;
  severity?: 'error' | 'warning';
}

export interface TestSpec {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  environments: {
    allowed: string[];
    blocked: string[];
  };
  steps: TestStep[];
  assertions?: TestAssertion[];
}

export interface LoadedSpecFile {
  fileName: string;
  filePath: string;
  spec: TestSpec;
}

export class SpecAdapter {
  public getSpecsDir(projectId = 'default'): string {
    const dir = path.join(config.projectsRoot, projectId, 'specs');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  public validateSpec(spec: unknown): TestSpec {
    if (!spec || typeof spec !== 'object') {
      throw new Error('Kịch bản không hợp lệ: dữ liệu rỗng.');
    }
    const raw = spec as Record<string, unknown>;
    if (!raw.id || typeof raw.id !== 'string' || !raw.id.trim()) {
      throw new Error('Kịch bản thiếu trường định danh (id).');
    }
    if (!raw.title || typeof raw.title !== 'string' || !raw.title.trim()) {
      throw new Error(`Kịch bản ${raw.id} thiếu tiêu đề (title).`);
    }
    const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : [];
    const envRaw = (raw.environments as Record<string, unknown>) || {};
    const environments = {
      allowed: Array.isArray(envRaw.allowed)
        ? envRaw.allowed.map(String)
        : ['local', 'staging', 'production'],
      blocked: Array.isArray(envRaw.blocked) ? envRaw.blocked.map(String) : [],
    };

    if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
      throw new Error(`Kịch bản ${raw.id} phải có ít nhất 1 bước thực hiện (steps).`);
    }

    const steps: TestStep[] = raw.steps.map((stepItem, idx) => {
      const s = stepItem as Record<string, unknown>;
      const action = String(s.action || 'click') as TestStep['action'];
      if (!['open', 'input', 'click', 'scroll', 'wait', 'assert'].includes(action)) {
        throw new Error(`Bước ${idx + 1} trong ${raw.id} có hành động không hợp lệ: ${action}`);
      }
      return {
        id: String(s.id || `step-${idx + 1}`),
        action,
        target: String(s.target || ''),
        ...(s.value !== undefined && s.value !== '' ? { value: String(s.value) } : {}),
        ...(s.expected !== undefined && s.expected !== '' ? { expected: String(s.expected) } : {}),
        description: String(s.description || `Bước ${idx + 1}`),
        optional: Boolean(s.optional),
        ...(s.sensitive ? { sensitive: true } : {}),
        ...(typeof s.timeout_ms === 'number' ? { timeout_ms: s.timeout_ms } : {}),
      };
    });

    const assertions: TestAssertion[] = Array.isArray(raw.assertions)
      ? raw.assertions.map((aItem) => {
          const a = aItem as Record<string, unknown>;
          return {
            type: (String(a.type || 'element_visible') as TestAssertion['type']),
            ...(a.target ? { target: String(a.target) } : {}),
            ...(a.severity ? { severity: String(a.severity) as 'error' | 'warning' } : {}),
          };
        })
      : [];

    return {
      id: raw.id.trim(),
      title: raw.title.trim(),
      description: raw.description ? String(raw.description) : '',
      tags,
      environments,
      steps,
      assertions,
    };
  }

  public listSpecs(projectId = 'default'): LoadedSpecFile[] {
    const specsDir = this.getSpecsDir(projectId);
    const files = fs
      .readdirSync(specsDir)
      .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .sort();

    const results: LoadedSpecFile[] = [];
    for (const fileName of files) {
      const filePath = path.join(specsDir, fileName);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = yaml.load(content);
        const validated = this.validateSpec(parsed);
        results.push({ fileName, filePath, spec: validated });
      } catch (err) {
        console.warn(`Bỏ qua tệp kịch bản lỗi ${fileName}:`, err);
      }
    }
    return results;
  }

  public getSpecById(projectId: string, testId: string): LoadedSpecFile | null {
    const all = this.listSpecs(projectId);
    return all.find((item) => item.spec.id === testId) || null;
  }

  public saveSpec(projectId: string, specInput: unknown, existingFileName?: string): LoadedSpecFile {
    const validated = this.validateSpec(specInput);
    const specsDir = this.getSpecsDir(projectId);

    const slug = validated.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);

    const fileName = existingFileName || `${validated.id}-${slug || 'spec'}.yaml`;
    const filePath = path.join(specsDir, fileName);

    const yamlContent = yaml.dump(validated, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      quotingType: '"',
    });

    fs.writeFileSync(filePath, yamlContent, 'utf-8');
    return { fileName, filePath, spec: validated };
  }
}

export const specAdapter = new SpecAdapter();

