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
import { handleAuthSave } from './tools/authSave.js';
import { handleAuthLoad } from './tools/authLoad.js';
import { handleAuthStatus } from './tools/authStatus.js';
import { handleAuthClear } from './tools/authClear.js';
import { handleGenerateSuite } from './tools/suiteGenerate.js';
import { handleRunSuite } from './tools/suiteRun.js';
import { handleListSuites } from './tools/suiteList.js';
import { handleGetSuiteReport } from './tools/suiteReport.js';
import { handleExportSuite } from './tools/suiteExport.js';
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
        name: 'qa_auth_save',
        description: 'Lưu trạng thái xác thực hiện tại của trình duyệt (Cookies + LocalStorage) thành profile tái sử dụng',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Tên vai trò hoặc tài khoản (VD: "admin", "staff", "customer-vip")',
            },
            description: {
              type: 'string',
              description: 'Ghi chú mô tả ngắn về profile này',
            },
          },
          required: ['role'],
        },
      },
      {
        name: 'qa_auth_load',
        description: 'Nạp trạng thái phiên xác thực đã lưu vào trình duyệt, tức thì bỏ qua bước đăng nhập (0.05s)',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Tên vai trò cần nạp (VD: "admin", "customer")',
            },
            targetUrl: {
              type: 'string',
              description: 'URL cần điều hướng đến ngay sau khi nạp session',
            },
          },
          required: ['role'],
        },
      },
      {
        name: 'qa_auth_status',
        description: 'Kiểm tra hạn sử dụng và tình trạng hợp lệ của token trong profile xác thực đã lưu',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Tên vai trò cần kiểm tra. Nếu bỏ trống, liệt kê tất cả các profile.',
            },
          },
        },
      },
      {
        name: 'qa_auth_clear',
        description: 'Làm sạch cookies và localStorage trên trình duyệt hiện tại hoặc xóa profile lưu trên ổ đĩa',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Tên vai trò cần xóa file profile. Nếu bỏ trống, chỉ xóa session trên trình duyệt hiện tại.',
            },
          },
        },
      },
      {
        name: 'qa_generate_suite',
        description: 'Tự động phân tích giao diện URL hoặc mô tả nghiệp vụ bằng AI để sinh ra trọn bộ Test Suite hoàn chỉnh với đầy đủ các ca kiểm thử chuẩn mực (Happy Path, Negative, Boundary, Security)',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Tên phân hệ hoặc tính năng (VD: "auth", "checkout", "profile")',
            },
            url: {
              type: 'string',
              description: 'Địa chỉ URL của trang chức năng cần khảo sát và sinh test suite',
            },
            prompt: {
              type: 'string',
              description: 'Mô tả bổ sung về nghiệp vụ hoặc các kịch bản đặc thù cần bao quát',
            },
            suiteId: {
              type: 'string',
              description: 'Mã định danh tùy chọn cho suite (VD: "auth-login")',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Các nhãn phân loại (VD: ["smoke", "regression"])',
            },
          },
          required: ['module'],
        },
      },
      {
        name: 'qa_run_suite',
        description: 'Thực thi toàn bộ hoặc chọn lọc các test case trong Test Suite theo bộ lọc nhãn hoặc mức độ ưu tiên',
        inputSchema: {
          type: 'object',
          properties: {
            suiteId: {
              type: 'string',
              description: 'Mã suite cần thực thi (VD: "auth-register")',
            },
            filterTags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Chỉ chạy các test case có gắn các nhãn này (VD: ["smoke"])',
            },
            priority: {
              type: 'string',
              enum: ['P1', 'P2', 'P3', 'P4'],
              description: 'Lọc chạy theo mức độ ưu tiên',
            },
            headless: {
              type: 'boolean',
              default: false,
              description: 'Chế độ chạy ngầm (true) hoặc hiển thị trình duyệt trực quan (false)',
            },
          },
          required: ['suiteId'],
        },
      },
      {
        name: 'qa_list_suites',
        description: 'Liệt kê danh sách tất cả các Test Suite và Test Module hiện có trong hệ thống',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Lọc theo tên phân hệ (tùy chọn)',
            },
          },
        },
      },
      {
        name: 'qa_get_suite_report',
        description: 'Lấy đường dẫn và thông tin tệp báo cáo trực quan HTML tổng hợp cấp Suite',
        inputSchema: {
          type: 'object',
          properties: {
            runId: {
              type: 'string',
              description: 'Mã phiên chạy suite. Nếu bỏ trống, lấy báo cáo của phiên chạy gần nhất.',
            },
          },
        },
      },
      {
        name: 'qa_export_suite',
        description: 'Xuất Test Suite thành mã nguồn kịch bản kiểm thử tự động Playwright TypeScript (.spec.ts) chuẩn',
        inputSchema: {
          type: 'object',
          properties: {
            suiteId: {
              type: 'string',
              description: 'Mã suite cần xuất',
            },
            format: {
              type: 'string',
              enum: ['playwright', 'yaml'],
              default: 'playwright',
              description: 'Định dạng xuất (mặc định là playwright)',
            },
            targetPath: {
              type: 'string',
              description: 'Đường dẫn tùy chọn lưu tệp mã nguồn',
            },
          },
          required: ['suiteId'],
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
      case 'qa_auth_save':
        result = await handleAuthSave(args as any);
        break;
      case 'qa_auth_load':
        result = await handleAuthLoad(args as any);
        break;
      case 'qa_auth_status':
        result = await handleAuthStatus((args as any) || {});
        break;
      case 'qa_auth_clear':
        result = await handleAuthClear((args as any) || {});
        break;
      case 'qa_generate_suite':
        result = await handleGenerateSuite(args as any);
        break;
      case 'qa_run_suite':
        result = await handleRunSuite(args as any);
        break;
      case 'qa_list_suites':
        result = await handleListSuites((args as any) || {});
        break;
      case 'qa_get_suite_report':
        result = await handleGetSuiteReport((args as any) || {});
        break;
      case 'qa_export_suite':
        result = await handleExportSuite(args as any);
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

