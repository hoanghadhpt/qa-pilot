import { browserManager } from '../engine/browserManager.js';
import { authManager } from '../engine/authManager.js';

export interface AuthClearArgs {
  role?: string;
}

export async function handleAuthClear(args: AuthClearArgs = {}) {
  const { role } = args;
  const context = browserManager.getContext();

  const result = await authManager.clearSession(role, context);

  return {
    content: [
      {
        type: 'text',
        text: result.message,
      },
    ],
  };
}

