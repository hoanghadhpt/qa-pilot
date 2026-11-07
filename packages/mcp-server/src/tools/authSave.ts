import { browserManager } from '../engine/browserManager.js';
import { authManager } from '../engine/authManager.js';

export interface AuthSaveArgs {
  role: string;
  description?: string;
}

export async function handleAuthSave(args: AuthSaveArgs) {
  const { role, description } = args;

  if (!role) {
    throw new Error('Tham số role là bắt buộc khi lưu phiên xác thực');
  }

  const context = browserManager.getContext();
  if (!context) {
    throw new Error(
      'Không có phiên trình duyệt nào đang mở. Vui lòng khởi động trình duyệt và đăng nhập trước khi gọi qa_auth_save.'
    );
  }

  const profile = await authManager.saveSession(role, context, description);
  const statusResult = authManager.inspectStatus(profile.storageState, role);

  return {
    content: [
      {
        type: 'text',
        text: `Đã lưu thành công auth profile cho vai trò '${role}'.
- Đường dẫn file: ${profile.filePath}
- Số lượng Cookies: ${profile.storageState.cookies.length}
- Số lượng LocalStorage origins: ${profile.storageState.origins.length}
- Trạng thái phiên: ${statusResult.status} (${statusResult.message})`,
      },
    ],
  };
}

