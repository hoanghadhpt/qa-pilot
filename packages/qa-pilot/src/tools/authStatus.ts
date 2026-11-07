import { authManager } from '../engine/authManager.js';

export interface AuthStatusArgs {
  role?: string;
}

export async function handleAuthStatus(args: AuthStatusArgs = {}) {
  const { role } = args;

  if (role) {
    const storageState = await authManager.loadSession(role);
    const result = authManager.inspectStatus(storageState, role);

    const activeRole = authManager.getActiveRole();
    const isActive = activeRole === role ? ' (ĐANG HOẠT ĐỘNG)' : '';

    return {
      content: [
        {
          type: 'text',
          text: `Tình trạng phiên xác thực của vai trò '${role}'${isActive}:
- Trạng thái: ${result.status}
- Thông điệp: ${result.message}
- Thời gian hết hạn: ${result.expiresAt || 'Không có (Session/Opaque)'}
- Số lượng Cookies: ${result.cookieCount}
- Chứa JWT Token: ${result.hasJwt ? 'Có' : 'Không'}
- Domains: ${result.domains.join(', ') || 'None'}`,
        },
      ],
    };
  }

  // Nếu không chỉ định role, liệt kê toàn bộ các profile
  const profiles = await authManager.listProfiles();
  const activeRole = authManager.getActiveRole();

  if (profiles.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'Chưa có auth profile nào được lưu trong tests/fixtures/auth/. Dùng qa_auth_save({ role: "..." }) để tạo profile đầu tiên.',
        },
      ],
    };
  }

  const lines = profiles.map((p) => {
    const activeMarker = p.role === activeRole ? ' [ĐANG DÙNG]' : '';
    return `- [${p.role}]${activeMarker}: ${p.status} | Hạn: ${p.expiresAt || 'Session'} | ${p.cookieCount} cookies | ${p.message}`;
  });

  return {
    content: [
      {
        type: 'text',
        text: `Danh sách các auth profile hiện có (${profiles.length} profiles):\n${lines.join('\n')}`,
      },
    ],
  };
}

