import { TestSuite, TestCase, TestStep, CasePriority, CaseType } from '../types.js';
import { suiteManager } from './suiteManager.js';
import { browserManager } from './browserManager.js';
import { midsceneBridge } from './midsceneBridge.js';

export interface GenerateSuiteOptions {
  module: string;
  url?: string;
  prompt?: string;
  suiteId?: string;
  tags?: string[];
}

export interface DiscoveredField {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
}

export class SuiteGenerator {
  /**
   * Tự động phân tích và sinh Test Suite chuẩn hóa cho một module hoặc URL
   */
  public async generateSuite(options: GenerateSuiteOptions): Promise<TestSuite> {
    const { module: moduleName, url, prompt, tags } = options;

    suiteManager.validateModule(moduleName);

    const suiteId = options.suiteId || `${moduleName}-suite`;
    suiteManager.validateId(suiteId);

    const defaultTags = tags && tags.length > 0 ? tags : [moduleName, 'generated'];
    const suiteName = this.formatSuiteName(moduleName, prompt);

    let discoveredFields: DiscoveredField[] = [];
    let pageTitle = '';

    // Khảo sát trang web nếu có URL
    if (url) {
      try {
        discoveredFields = await this.discoverPageElements(url);
        const page = browserManager.getPage();
        if (page) {
          pageTitle = await page.title().catch(() => '');
        }
      } catch (err: any) {
        console.warn(`[SuiteGenerator] Không thể tự động khảo sát URL '${url}': ${err.message}. Tiếp tục sinh theo heuristic.`);
      }
    }

    // Sinh các ca kiểm thử theo Heuristic Framework
    const testCases: TestCase[] = [];

    // 1. Happy Path (P1)
    testCases.push(this.buildHappyPathCase(moduleName, url, discoveredFields, pageTitle, prompt));

    // 2. Negative Validation - Bỏ trống trường bắt buộc (P1)
    testCases.push(this.buildNegativeRequiredCase(moduleName, url, discoveredFields));

    // 3. Negative Validation - Sai định dạng (P1)
    testCases.push(this.buildNegativeFormatCase(moduleName, url, discoveredFields));

    // 4. Boundary Value Analysis - Ký tự cực đại (P2)
    testCases.push(this.buildBoundaryMaxLengthCase(moduleName, url, discoveredFields));

    // 5. Boundary Value Analysis - Ký tự đặc biệt & Naughty Strings (P2)
    testCases.push(this.buildSpecialCharsCase(moduleName, url, discoveredFields));

    // 6. Security Probe - Thăm dò XSS Input (P2)
    testCases.push(this.buildSecurityXssCase(moduleName, url, discoveredFields));

    // 7. Security Probe - Thăm dò SQL Injection (P2)
    testCases.push(this.buildSecuritySqliCase(moduleName, url, discoveredFields));

    // 8. State Idempotency - Ngăn chặn click đúp / Submit lặp (P2)
    testCases.push(this.buildIdempotencyCase(moduleName, url));

    const now = new Date().toISOString();
    const suite: TestSuite = {
      id: suiteId,
      module: moduleName,
      name: suiteName,
      description: prompt || `Bộ kiểm thử tự động toàn diện cho phân hệ '${moduleName}' trên trang ${url || 'chức năng'}`,
      target_url: url,
      environment: 'local',
      tags: Array.from(new Set([...defaultTags, 'automated', 'standard-suite'])),
      created_at: now,
      updated_at: now,
      cases: testCases,
    };

    // Lưu vào kho Test-as-Code YAML
    await suiteManager.saveSuite(suite);

    return suite;
  }

  private formatSuiteName(moduleName: string, prompt?: string): string {
    if (prompt && prompt.length < 50) {
      return `Kiểm thử ${prompt}`;
    }
    const cleanMod = moduleName.replace(/[-_]/g, ' ');
    return `Bộ kiểm thử phân hệ ${cleanMod.charAt(0).toUpperCase() + cleanMod.slice(1)}`;
  }

  /**
   * Khảo sát cấu trúc trang thực tế thông qua Playwright DOM inspection
   */
  private async discoverPageElements(targetUrl: string): Promise<DiscoveredField[]> {
    let page = browserManager.getPage();
    if (!page) {
      page = await browserManager.launch({ headless: true });
    }
    midsceneBridge.attach(page);

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Trích xuất các input fields nổi bật
    const fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs
        .filter((el) => {
          const type = (el.getAttribute('type') || '').toLowerCase();
          return type !== 'hidden' && type !== 'submit' && type !== 'button';
        })
        .slice(0, 8)
        .map((el) => {
          const name = el.getAttribute('name') || el.getAttribute('id') || el.getAttribute('placeholder') || 'trường dữ liệu';
          const placeholder = el.getAttribute('placeholder') || '';
          const type = el.getAttribute('type') || el.tagName.toLowerCase();
          return { name, label: placeholder || name, type, placeholder };
        });
    });

    return fields;
  }

  // --- HEURISTIC BUILDERS ---

  private buildHappyPathCase(
    mod: string,
    url?: string,
    fields: DiscoveredField[] = [],
    pageTitle?: string,
    prompt?: string
  ): TestCase {
    const steps: TestStep[] = [];
    let stepNum = 1;

    if (fields.length > 0) {
      for (const f of fields.slice(0, 4)) {
        let sampleVal = 'Dữ liệu mẫu kiểm thử';
        if (f.type === 'email' || f.name.toLowerCase().includes('email')) {
          sampleVal = 'tester.standard@example.com';
        } else if (f.type === 'password' || f.name.toLowerCase().includes('pass')) {
          sampleVal = 'SecretPass@2026';
        } else if (f.type === 'tel' || f.name.toLowerCase().includes('phone')) {
          sampleVal = '0987654321';
        } else if (f.name.toLowerCase().includes('name')) {
          sampleVal = 'Nguyen Van Tester';
        }

        steps.push({
          step: stepNum++,
          action: `Điền thông tin hợp lệ vào ô ${f.label}`,
          data: sampleVal,
          expected: `Ô ${f.label} hiển thị giá trị vừa nhập, không có cảnh báo lỗi`,
        });
      }
    } else {
      steps.push({
        step: stepNum++,
        action: 'Điền đầy đủ thông tin hợp lệ vào các trường bắt buộc',
        data: 'Dữ liệu kiểm thử hợp lệ',
        expected: 'Giao diện ghi nhận dữ liệu, sẵn sàng gửi',
      });
    }

    steps.push({
      step: stepNum++,
      action: 'Click vào nút Submit',
      expected: 'Hiển thị trạng thái xử lý và chuyển hướng hoặc hiển thị kết quả thành công',
    });

    const assertTitle = pageTitle ? `Tiêu đề ${pageTitle} hiển thị` : 'Nút Submit hiển thị';

    return {
      id: `TC-${mod.toUpperCase().replace(/[^A-Z0-9]/g, '')}-001`,
      title: `${pageTitle ? `Thực hiện thành công trên ${pageTitle}` : `Thực hiện luồng nghiệp vụ chuẩn thành công (Happy Path)`}`,
      description: prompt || 'Xác nhận toàn bộ quy trình hoạt động trơn tru khi người dùng cung cấp thông tin hợp lệ',
      priority: 'P1',
      type: 'happy_path',
      tags: ['smoke', 'p1', 'core', 'happy_path'],
      preconditions: [
        `Trình duyệt đã mở và tải thành công trang ${url || 'mục tiêu'}`,
        'Môi trường kiểm thử hoạt động bình thường, backend sẵn sàng phản hồi',
      ],
      steps,
      assertions: [
        assertTitle,
      ],
    };
  }

  private buildNegativeRequiredCase(mod: string, url?: string, fields: DiscoveredField[] = []): TestCase {
    const steps: TestStep[] = [
      {
        step: 1,
        action: 'Để trống tất cả các trường dữ liệu trên màn hình',
        expected: 'Các ô nhập liệu giữ nguyên trạng thái trống ban đầu',
      },
      {
        step: 2,
        action: 'Click vào nút gửi dữ liệu hoặc nút hoàn thành',
        expected: 'Hệ thống chặn gửi yêu cầu và hiển thị cảnh báo validation',
      },
    ];

    return {
      id: `TC-${mod.toUpperCase().replace(/[^A-Z0-9]/g, '')}-002`,
      title: 'Kiểm tra chặn gửi dữ liệu khi bỏ trống các trường bắt buộc (Negative Validation)',
      description: 'Đảm bảo người dùng không thể gửi form khi chưa điền các thông tin quan trọng',
      priority: 'P1',
      type: 'negative_validation',
      tags: ['negative', 'validation', 'required_fields', 'p1'],
      preconditions: [`Trình duyệt mở tại trang ${url || 'chức năng'}`],
      steps,
      assertions: [
        'Thông báo lỗi bắt buộc (required field error) hiển thị dưới các ô nhập liệu',
        'Trang web không bị điều hướng đi nơi khác',
      ],
    };
  }

  private buildNegativeFormatCase(mod: string, url?: string, fields: DiscoveredField[] = []): TestCase {
    const steps: TestStep[] = [
      {
        step: 1,
        action: 'Nhập địa chỉ email sai định dạng "tester_khong_hop_le_email"',
        data: 'tester_khong_hop_le_email',
        expected: 'Ô Email hiển thị chuỗi vừa nhập',
      },
      {
        step: 2,
        action: 'Nhập số điện thoại chứa ký tự chữ "09012abcde"',
        data: '09012abcde',
        expected: 'Ô số điện thoại hiển thị chuỗi vừa nhập',
      },
      {
        step: 3,
        action: 'Click vào nút xác nhận hoặc rời tiêu điểm (blur)',
        expected: 'Hệ thống phát hiện lỗi định dạng và hiển thị cảnh báo tương ứng',
      },
    ];

    return {
      id: `TC-${mod.toUpperCase().replace(/[^A-Z0-9]/g, '')}-003`,
      title: 'Kiểm tra xác thực định dạng dữ liệu sai quy cách (Format Validation)',
      description: 'Xác thực cơ chế kiểm tra định dạng email, số điện thoại hoặc kiểu dữ liệu chuyên biệt',
      priority: 'P1',
      type: 'negative_validation',
      tags: ['negative', 'format_check', 'p1'],
      preconditions: [`Trình duyệt mở tại trang ${url || 'chức năng'}`],
      steps,
      assertions: [
        'Cảnh báo định dạng không hợp lệ xuất hiện rõ ràng',
        'Yêu cầu mạng không gửi dữ liệu không hợp lệ lên máy chủ',
      ],
    };
  }

  private buildBoundaryMaxLengthCase(mod: string, url?: string, fields: DiscoveredField[] = []): TestCase {
    // 255 ký tự 'A'
    const longString = 'A'.repeat(255);
    const steps: TestStep[] = [
      {
        step: 1,
        action: 'Nhập chuỗi văn bản có độ dài cực đại (255 ký tự) vào ô văn bản chính',
        data: longString,
        expected: 'Ô văn bản nhận đủ độ dài hoặc tự động cắt ngắn ở giới hạn cho phép (maxlength)',
      },
      {
        step: 2,
        action: 'Kiểm tra bố cục giao diện xung quanh ô nhập liệu',
        expected: 'Bố cục (layout) không bị vỡ, chữ không bị tràn ra ngoài khung hiển thị',
      },
    ];

    return {
      id: `TC-${mod.toUpperCase().replace(/[^A-Z0-9]/g, '')}-004`,
      title: 'Kiểm tra giới hạn ký tự cực đại và độ ổn định bố cục (Boundary Value - Max Length)',
      description: 'Kiểm tra trường nhập liệu khi người dùng cung cấp độ dài tối đa cho phép',
      priority: 'P2',
      type: 'boundary_value',
      tags: ['boundary', 'max_length', 'p2'],
      preconditions: [`Trình duyệt mở tại trang ${url || 'chức năng'}`],
      steps,
      assertions: [
        'Khung nhập liệu không bị vỡ giao diện (no layout spill)',
        'Hệ thống xử lý mượt mà, không gặp lỗi treo trình duyệt',
      ],
    };
  }

  private buildSpecialCharsCase(mod: string, url?: string, fields: DiscoveredField[] = []): TestCase {
    // Naughty string: Unicode, emoji, quotes, html-like entities
    const specialData = 'Ṫëṡṫ Ứñïċöḋë 🌟 & < > " \' %00';
    const steps: TestStep[] = [
      {
        step: 1,
        action: 'Nhập dữ liệu chứa ký tự đặc biệt, Unicode có dấu và emoji vào form',
        data: specialData,
        expected: 'Hệ thống hiển thị đúng các ký tự đặc biệt mà không làm sai lệch bảng mã UTF-8',
      },
      {
        step: 2,
        action: 'Nhấn nút lưu hoặc kiểm tra hiển thị',
        expected: 'Dữ liệu được lưu trữ và hiển thị toàn vẹn',
      },
    ];

    return {
      id: `TC-${mod.toUpperCase().replace(/[^A-Z0-9]/g, '')}-005`,
      title: 'Kiểm tra xử lý ký tự đặc biệt, Unicode và Naughty Strings (Boundary & Robustness)',
      description: 'Đảm bảo ứng dụng hỗ trợ đầy đủ bộ mã UTF-8 và không bị crash khi nhập chuỗi phức tạp',
      priority: 'P2',
      type: 'boundary_value',
      tags: ['boundary', 'unicode', 'special_chars', 'p2'],
      preconditions: [`Trình duyệt mở tại trang ${url || 'chức năng'}`],
      steps,
      assertions: [
        'Ký tự hiển thị chính xác, không bị lỗi font hoặc biến thành ký tự lạ (mojibake)',
        'Không có lỗi JavaScript Exception trong console',
      ],
    };
  }

  private buildSecurityXssCase(mod: string, url?: string, fields: DiscoveredField[] = []): TestCase {
    const xssPayload = "<script>console.log('xss-probe')</script>";
    const steps: TestStep[] = [
      {
        step: 1,
        action: 'Nhập chuỗi thăm dò mã độc XSS vào trường nhập liệu',
        data: xssPayload,
        expected: 'Hệ thống coi chuỗi là văn bản thuần túy (plain text)',
      },
      {
        step: 2,
        action: 'Gửi dữ liệu và quan sát màn hình phản hồi',
        expected: 'Trang web mã hóa HTML entities (escape), không tự động thực thi script độc hại',
      },
    ];

    return {
      id: `TC-${mod.toUpperCase().replace(/[^A-Z0-9]/g, '')}-006`,
      title: 'Thăm dò an toàn phòng chống tấn công XSS (Security Probe - Stored/Reflected XSS)',
      description: 'Xác minh các ô nhập liệu được làm sạch (sanitized/escaped) trước khi hiển thị lại',
      priority: 'P2',
      type: 'security_probe',
      tags: ['security', 'xss', 'guardrail', 'p2'],
      preconditions: [`Trình duyệt mở tại trang ${url || 'chức năng'}`],
      steps,
      assertions: [
        'Không có popup alert hay script lạ được thực thi trong trình duyệt',
        'Triple-Oracle không ghi nhận bất kỳ cảnh báo bảo mật nguy hiểm nào',
      ],
    };
  }

  private buildSecuritySqliCase(mod: string, url?: string, fields: DiscoveredField[] = []): TestCase {
    const sqliPayload = "' OR '1'='1' --";
    const steps: TestStep[] = [
      {
        step: 1,
        action: 'Nhập chuỗi ký tự thăm dò SQL Injection vào trường tìm kiếm hoặc form',
        data: sqliPayload,
        expected: 'Hệ thống nhận diện chuỗi tìm kiếm thông thường',
      },
      {
        step: 2,
        action: 'Nhấn tìm kiếm hoặc gửi dữ liệu',
        expected: 'Máy chủ phản hồi an toàn, không làm lộ stack trace hoặc lỗi cơ sở dữ liệu',
      },
    ];

    return {
      id: `TC-${mod.toUpperCase().replace(/[^A-Z0-9]/g, '')}-007`,
      title: 'Thăm dò an toàn lỗi tràn dữ liệu SQL Injection (Security Probe - SQLi Resilience)',
      description: 'Kiểm tra backend sử dụng parameterized queries hoặc ORM an toàn khi gặp ký tự nháy đơn',
      priority: 'P2',
      type: 'security_probe',
      tags: ['security', 'sqli', 'guardrail', 'p2'],
      preconditions: [`Trình duyệt mở tại trang ${url || 'chức năng'}`],
      steps,
      assertions: [
        'Không xuất hiện thông báo lỗi nội bộ máy chủ (HTTP 500)',
        'Màn hình không hiển thị chuỗi lỗi cú pháp SQL (SQL syntax error)',
      ],
    };
  }

  private buildIdempotencyCase(mod: string, url?: string): TestCase {
    const steps: TestStep[] = [
      {
        step: 1,
        action: 'Click liên tiếp 2 lần thật nhanh (Double-click) vào nút hành động chính',
        expected: 'Nút hành động được làm mờ (disabled) hoặc hiển thị biểu tượng loading ngay sau lần click đầu tiên',
      },
      {
        step: 2,
        action: 'Quan sát kết quả giao dịch hoặc phản hồi từ hệ thống',
        expected: 'Chỉ có đúng một yêu cầu mạng được xử lý thành công, không tạo bản ghi trùng lặp',
      },
    ];

    return {
      id: `TC-${mod.toUpperCase().replace(/[^A-Z0-9]/g, '')}-008`,
      title: 'Kiểm tra khả năng chịu lỗi khi click đúp liên tục (State Idempotency & Debounce)',
      description: 'Xác minh hệ thống ngăn chặn việc gửi trùng lặp yêu cầu khi người dùng vô tình nhấp chuột nhiều lần',
      priority: 'P2',
      type: 'idempotency',
      tags: ['idempotency', 'double_submit', 'debounce', 'p2'],
      preconditions: [`Trình duyệt mở tại trang ${url || 'chức năng'}`],
      steps,
      assertions: [
        'Hệ thống không phát sinh lỗi xung đột dữ liệu (data conflict)',
        'Chỉ có một hành động hợp lệ duy nhất được ghi nhận',
      ],
    };
  }
}

export const suiteGenerator = new SuiteGenerator();
