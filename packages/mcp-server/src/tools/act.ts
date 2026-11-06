import { midsceneBridge } from '../engine/midsceneBridge.js';
import { reportManager } from '../engine/reportManager.js';
import { guardrail } from '../security/guardrail.js';
import { globalRedactor } from '../security/redactor.js';

export async function handleAct(args: { action: string; optional?: boolean }) {
  const session = reportManager.getCurrentSession();
  if (session) {
    const check = guardrail.checkAction(args.action, session.environment);
    if (!check.allowed) {
      return {
        isError: true,
        content: [{ type: 'text', text: `[LỖI AN TOÀN] ${check.reason}` }]
      };
    }
  }

  const result = await midsceneBridge.aiAction(args.action, { optional: args.optional });
  const redactedMessage = globalRedactor.redact(result.message);

  return {
    isError: !result.success,
    content: [
      {
        type: 'text',
        text: redactedMessage
      }
    ]
  };
}

