/**
 * End-to-End MCP Test Runner
 * Communicates with QA-Pilot MCP Server directly over JSON-RPC Stdio transport.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';

async function runTestViaMcp() {
  console.log('🔌 [MCP Client] Đang kết nối tới QA Pilot MCP Server qua stdio...');

  const serverPath = path.resolve(process.cwd(), 'packages/qa-pilot/dist/index.js');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: {
      ...process.env,
      QA_ENV: 'local'
    }
  });

  const client = new Client(
    { name: 'qa-pilot-runner', version: '0.1.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ [MCP Client] Đã bắt tay thành công với QA Pilot MCP Server!');

  // List available tools
  const tools = await client.listTools();
  console.log(`📋 Các công cụ MCP sẵn sàng: ${tools.tools.map(t => t.name).join(', ')}`);

  async function callMcpTool(name: string, args: Record<string, any> = {}) {
    console.log(`\n▶️ [MCP Tool Call] ${name}(${JSON.stringify(args)})`);
    const start = Date.now();
    const res = await client.callTool({ name, arguments: args });
    const duration = Date.now() - start;
    const textOutput = (res.content as any[])?.map(c => c.text).join('\n') || '';
    if (res.isError) {
      console.warn(`⚠️ [MCP Tool Return - Error in ${duration}ms]:\n${textOutput}`);
    } else {
      console.log(`✔️ [MCP Tool Return - OK in ${duration}ms]:\n${textOutput}`);
    }
    return res;
  }

  try {
    // 1. Launch Browser
    await callMcpTool('qa_launch_browser', { headless: false, environment: 'local' });

    // 2. Navigate to VnExpress
    await callMcpTool('qa_navigate', { url: 'https://vnexpress.net' });

    // 3. Category: Thời sự
    await callMcpTool('qa_act', { action: 'Click vào chuyên mục Thời sự' });
    await callMcpTool('qa_assert', { assertion: 'Trang hiển thị bài viết thuộc Thời sự' });

    // 4. Category: Kinh doanh
    await callMcpTool('qa_act', { action: 'Click vào chuyên mục Kinh doanh' });
    await callMcpTool('qa_assert', { assertion: 'Trang hiển thị bài viết thuộc Kinh doanh' });

    // 5. Category: Thể thao
    await callMcpTool('qa_act', { action: 'Click vào chuyên mục Thể thao' });
    await callMcpTool('qa_assert', { assertion: 'Trang hiển thị bài viết thuộc Thể thao' });

    // 6. Category: Giải trí
    await callMcpTool('qa_act', { action: 'Click vào chuyên mục Giải trí' });
    await callMcpTool('qa_assert', { assertion: 'Trang hiển thị bài viết thuộc Giải trí' });

    // 7. Category: Thế giới
    await callMcpTool('qa_act', { action: 'Click vào chuyên mục Thế giới' });
    await callMcpTool('qa_assert', { assertion: 'Trang hiển thị bài viết thuộc Thế giới' });

    // 8. Drill-down article & Inspect
    await callMcpTool('qa_act', { action: 'Click vào bài báo đầu tiên' });
    await callMcpTool('qa_inspect', {});

    // 9. Export test & Generate Report
    await callMcpTool('qa_export_test', {
      testName: 'vnexpress-5-categories',
      format: 'playwright',
      targetPath: 'tests/e2e/vnexpress-5-categories.spec.ts'
    });

    await callMcpTool('qa_get_report', {});

    // 10. Close browser
    await callMcpTool('qa_close_browser', {});

    console.log('\n🎉 [MCP Client] Toàn bộ quy trình kiểm thử qua MCP Server hoàn tất mỹ mãn!');
  } finally {
    await client.close();
  }
}

runTestViaMcp().catch(err => {
  console.error('Lỗi khi chạy qua MCP:', err);
  process.exit(1);
});

