import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { TestSuite } from '../types.js';

function findWorkspaceRoot(startDir: string): string {
  let cur = startDir;
  while (cur !== path.dirname(cur)) {
    if (
      fs.existsSync(path.join(cur, 'specs')) ||
      fs.existsSync(path.join(cur, '.agents')) ||
      fs.existsSync(path.join(cur, 'package.json'))
    ) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return startDir;
}

export interface SuiteSummary {
  id: string;
  module: string;
  name: string;
  description?: string;
  caseCount: number;
  tags: string[];
  filePath: string;
  updatedAt: string;
}

export class SuiteManager {
  private suitesDir: string;

  constructor(customSuitesDir?: string) {
    if (customSuitesDir) {
      this.suitesDir = customSuitesDir;
    } else {
      const root = findWorkspaceRoot(process.cwd());
      this.suitesDir = path.resolve(root, 'tests', 'suites');
    }

    if (!fs.existsSync(this.suitesDir)) {
      fs.mkdirSync(this.suitesDir, { recursive: true });
    }
  }

  public validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Mã suite (suiteId) không được để trống');
    }
    const slugRegex = /^[a-z0-9_-]{3,50}$/;
    if (!slugRegex.test(id)) {
      throw new Error(
        `Mã suite '${id}' không hợp lệ. Chỉ chấp nhận chữ cái thường (a-z), chữ số (0-9), gạch nối (-) và gạch dưới (_) từ 3-50 ký tự.`
      );
    }
  }

  public validateModule(mod: string): void {
    if (!mod || typeof mod !== 'string') {
      throw new Error('Tên phân hệ (module) không được để trống');
    }
    const modRegex = /^[a-z0-9_-]{2,30}$/;
    if (!modRegex.test(mod)) {
      throw new Error(
        `Tên phân hệ '${mod}' không hợp lệ. Chỉ chấp nhận chữ cái thường (a-z), chữ số (0-9), gạch nối (-) từ 2-30 ký tự.`
      );
    }
  }

  public getSuitePath(moduleName: string, suiteId: string): string {
    this.validateModule(moduleName);
    this.validateId(suiteId);
    return path.join(this.suitesDir, moduleName, `${suiteId}.yaml`);
  }

  public async saveSuite(suite: TestSuite): Promise<string> {
    this.validateModule(suite.module);
    this.validateId(suite.id);

    const modDir = path.join(this.suitesDir, suite.module);
    if (!fs.existsSync(modDir)) {
      fs.mkdirSync(modDir, { recursive: true });
    }

    const filePath = this.getSuitePath(suite.module, suite.id);
    suite.updated_at = new Date().toISOString();
    if (!suite.created_at) {
      suite.created_at = suite.updated_at;
    }

    const yamlStr = YAML.stringify(suite);
    fs.writeFileSync(filePath, yamlStr, 'utf8');

    return filePath;
  }

  public async loadSuite(suiteId: string, moduleName?: string): Promise<TestSuite> {
    this.validateId(suiteId);

    let filePath: string | null = null;
    if (moduleName) {
      this.validateModule(moduleName);
      const candidate = this.getSuitePath(moduleName, suiteId);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
      }
    }

    if (!filePath) {
      // Find recursively across all module directories
      const allFiles = this.getAllYamlFiles(this.suitesDir);
      for (const file of allFiles) {
        if (path.basename(file, '.yaml') === suiteId || path.basename(file, '.yml') === suiteId) {
          filePath = file;
          break;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`Không tìm thấy Test Suite với mã '${suiteId}' trong thư mục tests/suites/.`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = YAML.parse(content) as TestSuite;

    if (!parsed || !parsed.cases || !Array.isArray(parsed.cases)) {
      throw new Error(`Tệp '${filePath}' không đúng định dạng Test Suite hợp lệ.`);
    }

    return parsed;
  }

  public async listSuites(filterModule?: string): Promise<SuiteSummary[]> {
    if (!fs.existsSync(this.suitesDir)) {
      return [];
    }

    const allFiles = this.getAllYamlFiles(this.suitesDir);
    const summaries: SuiteSummary[] = [];

    for (const filePath of allFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = YAML.parse(content) as TestSuite;
        if (parsed && parsed.id && parsed.cases) {
          if (!filterModule || parsed.module === filterModule) {
            summaries.push({
              id: parsed.id,
              module: parsed.module,
              name: parsed.name || parsed.id,
              description: parsed.description,
              caseCount: parsed.cases.length,
              tags: parsed.tags || [],
              filePath,
              updatedAt: parsed.updated_at || parsed.created_at || '',
            });
          }
        }
      } catch (err: any) {
        console.warn(`[SuiteManager] Bỏ qua file lỗi ${filePath}: ${err.message}`);
      }
    }

    return summaries;
  }

  public async deleteSuite(suiteId: string, moduleName?: string): Promise<boolean> {
    this.validateId(suiteId);
    let filePath: string | null = null;

    if (moduleName) {
      filePath = this.getSuitePath(moduleName, suiteId);
    } else {
      const allFiles = this.getAllYamlFiles(this.suitesDir);
      for (const file of allFiles) {
        if (path.basename(file, '.yaml') === suiteId) {
          filePath = file;
          break;
        }
      }
    }

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  private getAllYamlFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(this.getAllYamlFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
        files.push(fullPath);
      }
    }

    return files;
  }
}

export const suiteManager = new SuiteManager();

