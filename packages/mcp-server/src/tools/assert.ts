import { midsceneBridge } from '../engine/midsceneBridge.js';
import { globalRedactor } from '../security/redactor.js';

export async function handleAssert(args: { assertion: string }) {
  const result = await midsceneBridge.aiAssert(args.assertion);
  const redactedMessage = globalRedactor.redact(result.message);

  return {
    isError: !result.passed,
    content: [
      {
        type: 'text',
        text: redactedMessage
      }
    ]
  };
}

