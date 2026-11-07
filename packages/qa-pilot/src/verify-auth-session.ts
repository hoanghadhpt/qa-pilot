import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { authManager } from './engine/authManager.js';
import { browserManager } from './engine/browserManager.js';
import { globalRedactor } from './security/redactor.js';
import { handleAuthSave } from './tools/authSave.js';
import { handleAuthLoad } from './tools/authLoad.js';
import { handleAuthStatus } from './tools/authStatus.js';
import { handleAuthClear } from './tools/authClear.js';
import { oracleWatcher } from './engine/oracleWatcher.js';

async function runAuthSessionVerification() {
  console.log('=== QA Pilot Feature 005: Shared Auth Session Verification ===\n');

  // Scenario 1: Validate Role Naming & Storage Creation
  console.log('[Scenario 1] Validating role constraint & saving session...');
  assert.throws(() => authManager.validateRole('../invalid-path'), /không hợp lệ/);
  assert.throws(() => authManager.validateRole(''), /không được để trống/);

  // Launch browser in headless mode to simulate login
  const page = await browserManager.launch({ headless: true });
  await page.setContent(`
    <html>
      <head><title>Mock Dashboard</title></head>
      <body>
        <h1>Admin Control Panel</h1>
        <div id="user-info">Logged in as admin@company.org</div>
        <script>
          localStorage.setItem('auth_token', 'mock_jwt_token_admin_super_secret_xyz123');
          localStorage.setItem('user_role', 'admin');
        </script>
      </body>
    </html>
  `);

  // Inject a mock session cookie
  const context = browserManager.getContext()!;
  await context.addCookies([
    {
      name: 'session_id',
      value: 'secret_session_cookie_admin_987654321',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
    },
  ]);

  // Execute qa_auth_save
  const saveRes = await handleAuthSave({ role: 'admin', description: 'Admin profile for testing' });
  console.log('Save result:\n', saveRes.content[0].text);

  const profilePath = authManager.getProfilePath('admin');
  assert.ok(fs.existsSync(profilePath), 'File profile admin.json phải tồn tại');

  // Verify secret redaction
  const redactedText = globalRedactor.redact('User with session secret_session_cookie_admin_987654321 logged in');
  assert.ok(!redactedText.includes('secret_session_cookie_admin_987654321'), 'Cookie phải bị che giấu thành [REDACTED]');
  assert.ok(redactedText.includes('[REDACTED]'), 'Text phải chứa [REDACTED]');
  console.log('✓ Secret Redaction verified: cookie is securely masked');

  // Scenario 2: Zero-Latency Session Replay
  console.log('\n[Scenario 2] Zero-latency auth reload without re-login...');
  await handleAuthClear(); // clear browser context
  const loadRes = await handleAuthLoad({ role: 'admin' });
  console.log('Load result:\n', loadRes.content[0].text);
  assert.strictEqual(authManager.getActiveRole(), 'admin', 'Active role phải là admin');

  // Scenario 3: Expiry Inspection & Warning
  console.log('\n[Scenario 3] Token expiry & TTL inspection...');
  const statusRes = await handleAuthStatus({ role: 'admin' });
  console.log('Status result:\n', statusRes.content[0].text);

  // Test expired JWT simulation
  const expiredExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify({ sub: '123', exp: expiredExp })).toString('base64url');
  const expiredJwt = `${headerB64}.${payloadB64}.fakesig1234567890`;

  const expiredProfile = {
    cookies: [],
    origins: [
      {
        origin: 'https://example.com',
        localStorage: [{ name: 'access_token', value: expiredJwt }],
      },
    ],
  };

  const expiredStatus = authManager.inspectStatus(expiredProfile as any, 'expired-test');
  assert.strictEqual(expiredStatus.status, 'expired', 'Phải phát hiện trạng thái expired');
  console.log('✓ Expired token detection verified:', expiredStatus.message);

  // Scenario 4: Multi-role matrix & Clear
  console.log('\n[Scenario 4] Multi-role matrix switching...');
  // Save customer role using active context
  const activeContext = browserManager.getContext()!;
  await activeContext.addCookies([
    {
      name: 'customer_sid',
      value: 'customer_session_val_555',
      domain: 'localhost',
      path: '/',
    },
  ]);
  await handleAuthSave({ role: 'customer' });

  // List all profiles
  const listRes = await handleAuthStatus({});
  console.log(listRes.content[0].text);

  // Switch back to admin
  await handleAuthLoad({ role: 'admin' });
  assert.strictEqual(authManager.getActiveRole(), 'admin');

  // Switch to customer
  await handleAuthLoad({ role: 'customer' });
  assert.strictEqual(authManager.getActiveRole(), 'customer');

  // Scenario 5: CI/CD Base64 Import/Export
  console.log('\n[Scenario 5] CI/CD Base64 Import/Export...');
  const b64 = authManager.exportBase64('customer');
  assert.ok(b64.length > 20, 'Base64 export phải sinh ra chuỗi hợp lệ');
  const importedProfile = authManager.importBase64('customer-ci', b64);
  assert.strictEqual(importedProfile.role, 'customer-ci');
  console.log('✓ Base64 CI/CD import/export verified');

  // Clean up
  await handleAuthClear({ role: 'admin' });
  await handleAuthClear({ role: 'customer' });
  await handleAuthClear({ role: 'customer-ci' });
  await browserManager.close();

  console.log('\n=== ALL 5 AUTH SESSION VERIFICATION SCENARIOS PASSED SUCCESSFULLY ===');
}

runAuthSessionVerification().catch((err) => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});
