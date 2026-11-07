import { browserManager } from '../engine/browserManager.js';
import { authManager } from '../engine/authManager.js';

export interface AuthLoadArgs {
  role: string;
  targetUrl?: string;
}

export async function handleAuthLoad(args: AuthLoadArgs) {
  const { role, targetUrl } = args;

  if (!role) {
    throw new Error('Tham số role là bắt buộc khi nạp phiên xác thực');
  }

  const storageState = await authManager.loadSession(role);
  const statusResult = authManager.inspectStatus(storageState, role);

  const page = await browserManager.reloadWithStorageState(storageState);

  let navInfo = '';
  if (targetUrl) {
    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
    navInfo = ` và đã điều hướng đến ${targetUrl}`;
  }

  let warningPrefix = '';
  if (statusResult.status === 'expired') {
    warningPrefix = `[CẢNH BÁO] Phiên đăng nhập cho '${role}' đã hết hạn. Các thao tác tiếp theo có thể gặp lỗi 401 hoặc bị chuyển hướng về trang login.\n`;
  } else if (statusResult.status === 'expiring_soon') {
    warningPrefix = `[CHÚ Ý] Phiên đăng nhập cho '${role}' sắp hết hạn (còn ít hơn 5 phút).\n`;
  }

  return {
    content: [
      {
        type: 'text',
        text: `${warningPrefix}Đã nạp thành công auth profile cho vai trò '${role}'${navInfo}.
- Số lượng Cookies đã nạp: ${storageState.cookies.length}
- Trạng thái: ${statusResult.status} (${statusResult.message})`,
      },
    ],
  };
}

