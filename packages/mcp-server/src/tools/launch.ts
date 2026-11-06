import { browserManager } from '../engine/browserManager.js';
import { midsceneBridge } from '../engine/midsceneBridge.js';
import { reportManager } from '../engine/reportManager.js';
import { envManager } from '../security/envManager.js';

export async function handleLaunchBrowser(args: { headless?: boolean; environment?: string }) {
  const envName = args.environment || 'local';
  const headless = args.headless ?? false;

  const env = envManager.loadEnvironment(envName);
  reportManager.createSession(env, headless ? 'headless' : 'headed');

  const page = await browserManager.launch({ headless });
  midsceneBridge.attach(page);

  return {
    content: [
      {
        type: 'text',
        text: `Đã khởi động trình duyệt thành công ở chế độ ${headless ? 'Headless (chạy ngầm)' : 'Headed (cửa sổ trực quan)'}. Môi trường: ${env.name}.`
      }
    ]
  };
}

