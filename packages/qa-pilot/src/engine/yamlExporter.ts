import { QASession } from '../types.js';

export class YamlExporter {
  public exportToYaml(session: QASession, testName: string): string {
    const lines: string[] = [
      `id: "${testName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}"`,
      `title: "${testName}"`,
      `environment: "${session.environment.name}"`,
      `created_at: "${new Date().toISOString()}"`,
      `steps:`
    ];

    if (session.currentUrl) {
      lines.push(`  - type: "navigate"`);
      lines.push(`    target: "${session.currentUrl}"`);
    }

    for (const step of session.steps) {
      lines.push(`  - step: ${step.stepIndex}`);
      lines.push(`    type: "${step.type}"`);
      lines.push(`    instruction: "${step.instruction.replace(/"/g, '\\"')}"`);
      lines.push(`    status_in_session: "${step.status}"`);
    }

    return lines.join('\n');
  }
}

export const yamlExporter = new YamlExporter();

