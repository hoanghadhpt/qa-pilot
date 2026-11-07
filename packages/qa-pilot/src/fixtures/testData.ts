/**
 * Thư viện dữ liệu kiểm thử thực tế và dữ liệu ranh giới (Edge Cases / Naughty Strings)
 * Lấy cảm hứng từ Big List of Naughty Strings, Faker và Heuristic Testing Cheatsheets.
 */

export interface TestDataSet {
  valid: {
    firstName: string;
    lastName: string;
    address: string;
    email: string;
    phone: string;
    password: string;
    hobbies: string[];
    gender: 'Male' | 'Female';
  };
  negative: {
    emptyStrings: Record<string, string>;
    invalidEmails: string[];
    invalidPhones: string[];
    weakPasswords: string[];
  };
  boundaryAndAttacks: {
    xssPayloads: string[];
    sqlInjectionPayloads: string[];
    longStrings: string[];
    unicodeAndEmoji: string[];
    specialChars: string[];
  };
}

export const QA_FIXTURES: TestDataSet = {
  valid: {
    firstName: 'Hoang',
    lastName: 'Ha',
    address: '123 Nguyen Van Linh, Da Nang, Vietnam',
    email: 'hoangha.qa@example.com',
    phone: '0905123456',
    password: 'SecurePassword@2026',
    hobbies: ['Cricket', 'Movies'],
    gender: 'Male'
  },
  negative: {
    emptyStrings: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: ''
    },
    invalidEmails: [
      'plainaddress',
      '#@%^%#$@#$@#.com',
      '@example.com',
      'email.example.com',
      'email@example@example.com',
      'email@example..com',
      'spaces in email@domain.com'
    ],
    invalidPhones: [
      'abcdefghij',
      '123',
      '000-000-0000-999999999999',
      '++84905123456'
    ],
    weakPasswords: [
      '123',
      'password',
      'admin',
      ' '
    ]
  },
  boundaryAndAttacks: {
    xssPayloads: [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg onload=alert(1)>'
    ],
    sqlInjectionPayloads: [
      "' OR '1'='1",
      "admin' --",
      "1; DROP TABLE users--"
    ],
    longStrings: [
      'A'.repeat(256), // Ranh giới chuẩn 255/256 ký tự
      'TextWithOverflow'.repeat(50) // 800 ký tự tràn bộ đệm giao diện
    ],
    unicodeAndEmoji: [
      'Nguyễn Văn Hoàng Hà', // Tiếng Việt có dấu đầy đủ
      '🚀🔥🤖🎯🏆💡', // Emojis
      'اللغة العربية', // Right-to-Left (RTL) Arabic
      '中文测试', // Double-byte characters (CJK)
      'ñ, é, ö, ø, å, ç' // Ký tự Latin mở rộng
    ],
    specialChars: [
      '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
      '   Khoảng trắng đầu và cuối   '
    ]
  }
};

