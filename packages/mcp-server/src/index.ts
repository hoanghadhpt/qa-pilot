#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { browserManager } from './engine/browserManager.js';
import { handleLaunchBrowser } from './tools/launch.js';
import { handleNavigate } from './tools/navigate.js';
import { handleAct } from './tools/act.js';
import { handleAssert } from './tools/assert.js';
import { handleInspect } from './tools/inspect.js';
import { handleGetReport } from './tools/report.js';
import { handleExportTest } from './tools/export.js';
import { handlePlanTestMatrix } from './tools/planMatrix.js';
import { globalRedactor } from './security/redactor.js';

const server = new Server(
  {
    name: 'qa-pilot',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'qa_launch_browser',
        description: 'Khởi động phiên trình duyệt Chromium để kiểm thử tự động',
        inputSchema: {
          type: 'object',
          properties: {
            headless: {
              type: 'boolean',
              description: 'Chạy ngầm (true) hoặc hiển thị cửa sổ trực quan cho người dùng (false). Mặc định là false.',
              default: false,
            },
            environment: {
              type: 'string',
              description: 'Tên môi trường mục tiêu (local, staging, production)',
              default: 'local',
            },
          },
        },
      },
      {
        name: 'qa_navigate',
        description: 'Điều hướng trình duyệt đến một địa chỉ URL và chờ tải trang',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Địa chỉ URL đầy đủ cần truy cập',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'qa_act',
        description: 'Thực thi hành động trên trang bằng ngôn ngữ tự nhiên (click, nhập liệu, chọn menu)',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'Mô tả hành động cần làm (VD: "Click vào nút Đăng ký", "Điền Nguyen vào ô First Name")',
            },
            optional: {
              type: 'boolean',
              description: 'Nếu là true, bước này gặp lỗi sẽ không làm hỏng kịch bản',
              default: false,
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'qa_assert',
        description: 'Xác thực trạng thái hoặc nội dung thị giác trên trang web bằng ngôn ngữ tự nhiên',
        inputSchema: {
          type: 'object',
          properties: {
            assertion: {
              type: 'string',
              description: 'Khẳng định cần kiểm tra (VD: "Tiêu đề Register xuất hiện", "Nút Submit hiển thị")',
            },
          },
          required: ['assertion'],
        },
      },
      {
        name: 'qa_inspect',
        description: 'Chụp màn hình trạng thái hiện tại và liệt kê các phần tử tương tác chính',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'qa_plan_test_matrix',
        description: 'Quét và phân tích trang web theo tư duy Senior QA để tự động lập Ma trận kiểm thử (Test Matrix) gồm Happy Path, Negative Validation, Boundary/Security, và State Idempotency trước khi thực thi',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Địa chỉ URL cần khảo sát (tùy chọn nếu trang đã được mở sẵn)',
            },
          },
        },
      },
      {
        name: 'qa_get_report',
        description: 'Sinh và lấy đường dẫn tệp báo cáo trực quan HTML (Visual Report)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'qa_export_test',
        description: 'Xuất toàn bộ chuỗi hành động và xác thực trong phiên thành file mã nguồn kiểm thử',
        inputSchema: {
          type: 'object',
          properties: {
            testName: {
              type: 'string',
              description: 'Tên kịch bản (VD: "TC-01-register")',
            },
            format: {
              type: 'string',
              enum: ['playwright', 'yaml'],
              default: 'playwright',
              description: 'Định dạng xuất (playwright hoặc yaml)',
            },
            targetPath: {
              type: 'string',
              description: 'Đường dẫn lưu file (VD: "tests/e2e/register.spec.ts")',
            },
          },
          required: ['testName', 'targetPath'],
        },
      },
      {
        name: 'qa_close_browser',
        description: 'Đóng trình duyệt và dọn dẹp phiên kiểm thử',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case 'qa_launch_browser':
        result = await handleLaunchBrowser((args as any) || {});
        break;
      case 'qa_navigate':
        result = await handleNavigate(args as any);
        break;
      case 'qa_act':
        result = await handleAct(args as any);
        break;
      case 'qa_assert':
        result = await handleAssert(args as any);
        break;
      case 'qa_inspect':
        result = await handleInspect();
        break;
      case 'qa_plan_test_matrix':
        result = await handlePlanTestMatrix((args as any) || {});
        break;
      case 'qa_get_report':
        result = await handleGetReport();
        break;
      case 'qa_export_test':
        result = await handleExportTest(args as any);
        break;
      case 'qa_close_browser':
        await browserManager.close();
        result = {
          content: [{ type: 'text', text: 'Đã đóng trình duyệt và giải phóng tài nguyên.' }],
        };
        break;
      default:
        throw new Error(`Công cụ không xác định: ${name}`);
    }

    return globalRedactor.redactObject(result);
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: globalRedactor.redact(`Lỗi khi thực thi ${name}: ${err.message}`),
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[QA-Pilot MCP] Server đang chạy qua stdio');
}

// Clean shutdown
process.on('SIGINT', async () => {
  await browserManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await browserManager.close();
  process.exit(0);
});

main().catch((err) => {
  console.error('[QA-Pilot MCP] Lỗi khởi động:', err);
  process.exit(1);
});

