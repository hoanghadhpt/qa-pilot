import { browserManager } from '../engine/browserManager.js';
import { midsceneBridge } from '../engine/midsceneBridge.js';
import { reportManager } from '../engine/reportManager.js';
import { envManager } from '../security/envManager.js';
import { guardrail } from '../security/guardrail.js';

export async function handleNavigate(args: { url: string }) {
  let session = reportManager.getCurrentSession();
  if (!session) {
    const env = envManager.loadEnvironment('local');
    session = reportManager.createSession(env, 'headed');
  }

  // Guardrail check
  const check = guardrail.checkUrl(args.url, session.environment);
  if (!check.allowed) {
    return {
      isError: true,
      content: [{ type: 'text', text: `[LỖI AN TOÀN] ${check.reason}` }]
    };
  }

  let page = browserManager.getPage();
  if (!page) {
    page = await browserManager.launch({ headless: false });
    midsceneBridge.attach(page);
  }

  const startTime = Date.now();
  await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  const title = await page.title();
  const durationMs = Date.now() - startTime;

  const stepIndex = session.steps.length + 1;
  const screenshotPath = `${session.reportDir}/step-${stepIndex}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});

  session.currentUrl = args.url;
  reportManager.addStep({
    stepIndex,
    type: 'navigate',
    instruction: `Mở URL: ${args.url}`,
    status: 'passed',
    durationMs,
    screenshotAfter: screenshotPath
  });

  return {
    content: [
      {
        type: 'text',
        text: `Đã điều hướng thành công đến: ${args.url}\nTiêu đề trang: "${title}" (${durationMs}ms)`
      }
    ]
  };
}

