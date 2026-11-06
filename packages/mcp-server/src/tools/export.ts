import fs from 'node:fs';
import path from 'node:path';
import { reportManager } from '../engine/reportManager.js';
import { playwrightExporter } from '../engine/playwrightExporter.js';
import { yamlExporter } from '../engine/yamlExporter.js';

export async function handleExportTest(args: {
  testName: string;
  format?: 'playwright' | 'yaml';
  targetPath: string;
}) {
  const session = reportManager.getCurrentSession();
  if (!session) {
    return {
      isError: true,
      content: [{ type: 'text', text: 'Chưa có phiên kiểm thử nào để xuất kịch bản.' }]
    };
  }

  const format = args.format || 'playwright';
  const fullPath = path.isAbsolute(args.targetPath)
    ? args.targetPath
    : path.join(process.cwd(), args.targetPath);

  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let content = '';
  if (format === 'playwright') {
    content = playwrightExporter.exportToTypeScript(session, args.testName);
  } else {
    content = yamlExporter.exportToYaml(session, args.testName);
  }

  fs.writeFileSync(fullPath, content, 'utf8');

  return {
    content: [
      {
        type: 'text',
        text: `Đã xuất kịch bản ${format.toUpperCase()} thành công vào:\n${args.targetPath}\n\nTổng số bước: ${session.steps.length}`
      }
    ]
  };
}

