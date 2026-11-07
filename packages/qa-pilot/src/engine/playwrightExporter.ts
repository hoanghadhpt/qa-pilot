import { QASession } from '../types.js';

export class PlaywrightExporter {
  public exportToTypeScript(session: QASession, testName: string): string {
    const lines: string[] = [
      `import { test, expect } from '@playwright/test';`,
      ``,
      `test.describe('${testName}', () => {`,
      `  test('Thực thi kịch bản kiểm thử tự động', async ({ page }) => {`
    ];

    if (session.currentUrl) {
      lines.push(`    // Điều hướng ban đầu`);
      lines.push(`    await page.goto('${session.currentUrl}');`);
      lines.push(`    await page.waitForLoadState('networkidle');`);
      lines.push(``);
    }

    for (const step of session.steps) {
      lines.push(`    // Bước #${step.stepIndex}: ${step.instruction}`);
      if (step.type === 'navigate') {
        lines.push(`    await page.goto('${step.instruction}');`);
      } else if (step.type === 'act') {
        const lower = step.instruction.toLowerCase();
        if (lower.startsWith('click') || lower.startsWith('bấm') || lower.startsWith('nhấp')) {
          const target = step.instruction.replace(/^(click|bấm|nhấp)\s+(vào\s+)?(nút\s+)?/i, '').trim().replace(/['"]/g, '');
          lines.push(`    await page.getByRole('button', { name: /${target}/i }).or(page.locator('text=${target}')).first().click();`);
        } else if (lower.includes('điền') || lower.includes('nhập') || lower.startsWith('fill')) {
          const match = step.instruction.match(/(?:điền|nhập|fill)\s+['"]?([^'"]+?)['"]?\s+vào\s+(?:ô\s+|trường\s+)?['"]?([^'"]+)['"]?/i);
          if (match) {
            lines.push(`    await page.getByPlaceholder(/${match[2].trim()}/i).or(page.getByLabel(/${match[2].trim()}/i)).first().fill('${match[1].trim()}');`);
          } else {
            lines.push(`    // Hành động: ${step.instruction}`);
          }
        } else {
          lines.push(`    // Tác vụ: ${step.instruction}`);
        }
      } else if (step.type === 'assert') {
        const target = step.instruction.replace(/['"]/g, '').trim();
        lines.push(`    await expect(page.locator('body')).toContainText('${target}');`);
      }
      lines.push(``);
    }

    lines.push(`  });`);
    lines.push(`});`);

    return lines.join('\n');
  }
}

export const playwrightExporter = new PlaywrightExporter();

