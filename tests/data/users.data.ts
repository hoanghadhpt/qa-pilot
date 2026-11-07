export const TEST_USERS = {
  admin: {
    username: 'admin@company.org',
    email: 'admin@company.org',
    password: process.env.QA_ADMIN_PASSWORD || 'AdminMasterPass@2026',
    role: 'admin',
  },
  staff: {
    username: 'staff@company.org',
    email: 'staff@company.org',
    password: process.env.QA_STAFF_PASSWORD || 'StaffPass@2026',
    role: 'staff',
  },
  customer: {
    username: 'customer.vip@example.com',
    email: 'customer.vip@example.com',
    password: process.env.QA_CUSTOMER_PASSWORD || 'CustomerPass@2026',
    role: 'customer',
  },
} as const;

