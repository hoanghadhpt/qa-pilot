import { Page } from 'playwright';
import { QA_FIXTURES } from '../fixtures/testData.js';

export interface FormFieldInfo {
  label: string;
  type: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
}

export interface TestCasePlan {
  id: string;
  category: 'Happy Path' | 'Negative / Validation' | 'Boundary / Security' | 'State & Idempotency';
  title: string;
  description: string;
  inputs: Record<string, string>;
  expectedOutcome: string;
}

export interface TestMatrixReport {
  pageTitle: string;
  url: string;
  fields: FormFieldInfo[];
  matrix: TestCasePlan[];
  markdown: string;
}

export class TestMatrixGenerator {
  public async generateMatrix(page: Page): Promise<TestMatrixReport> {
    const title = await page.title();
    const url = page.url();

    // 1. Scan page for form fields
    const fields: FormFieldInfo[] = await page.evaluate(() => {
      const results: FormFieldInfo[] = [];
      const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');

      inputs.forEach(el => {
        let labelText = '';
        // Look for preceding or wrapping label
        const parentLabel = el.closest('label');
        if (parentLabel) {
          labelText = parentLabel.textContent || '';
        } else {
          // Look for label with for attribute or preceding sibling / parent sibling
          const formGroup = el.closest('.form-group, tr, div');
          if (formGroup) {
            const lbl = formGroup.querySelector('label');
            if (lbl) labelText = lbl.textContent || '';
          }
        }

        const type = (el as HTMLInputElement).type || el.tagName.toLowerCase();
        const placeholder = el.getAttribute('placeholder') || '';
        const name = el.getAttribute('name') || '';
        const required = el.hasAttribute('required') || labelText.includes('*');

        results.push({
          label: labelText.replace(/\*/g, '').trim() || placeholder || name || type,
          type,
          name,
          placeholder,
          required
        });
      });

      return results;
    });

    // 2. Synthesize test cases using QA Heuristics (BVA, EP, Naughty Strings, State)
    const matrix: TestCasePlan[] = [];

    // --- Category 1: Happy Path ---
    matrix.push({
      id: 'TC-01-HAPPY-PATH',
      category: 'Happy Path',
      title: 'Đăng ký thành công với dữ liệu hợp lệ đầy đủ',
      description: 'Điền tất cả các trường thông tin hợp lệ, chọn giới tính và sở thích rồi gửi form.',
      inputs: {
        'First Name': QA_FIXTURES.valid.firstName,
        'Last Name': QA_FIXTURES.valid.lastName,
        'Address': QA_FIXTURES.valid.address,
        'Email': QA_FIXTURES.valid.email,
        'Phone': QA_FIXTURES.valid.phone,
        'Gender': QA_FIXTURES.valid.gender,
        'Password': QA_FIXTURES.valid.password
      },
      expectedOutcome: 'Form gửi thành công hoặc hiển thị trạng thái hoàn tất, không có lỗi validation.'
    });

    // --- Category 2: Negative / Validation ---
    matrix.push({
      id: 'TC-02-REQ-BLANK',
      category: 'Negative / Validation',
      title: 'Bỏ trống các trường bắt buộc (First Name, Last Name, Email, Phone)',
      description: 'Nhấn Submit ngay khi chưa điền dữ liệu để kiểm tra các thông báo lỗi validation.',
      inputs: {},
      expectedOutcome: 'Hệ thống chặn submit, hiển thị viền đỏ hoặc thông báo lỗi yêu cầu nhập liệu.'
    });

    matrix.push({
      id: 'TC-03-INVALID-EMAIL',
      category: 'Negative / Validation',
      title: 'Nhập địa chỉ Email sai định dạng (thiếu @ và domain)',
      description: `Nhập giá trị '${QA_FIXTURES.negative.invalidEmails[0]}' vào trường Email.`,
      inputs: { Email: QA_FIXTURES.negative.invalidEmails[0] },
      expectedOutcome: 'Trường Email kích hoạt validation định dạng email không hợp lệ, không cho phép gửi.'
    });

    matrix.push({
      id: 'TC-04-INVALID-PHONE',
      category: 'Negative / Validation',
      title: 'Nhập số điện thoại chứa ký tự chữ (Alpha string)',
      description: `Nhập '${QA_FIXTURES.negative.invalidPhones[0]}' vào ô Số điện thoại.`,
      inputs: { Phone: QA_FIXTURES.negative.invalidPhones[0] },
      expectedOutcome: 'Chặn nhập chữ hoặc báo lỗi yêu cầu chỉ nhập chữ số hợp lệ (10 chữ số).'
    });

    // --- Category 3: Boundary & Security Attacks ---
    matrix.push({
      id: 'TC-05-XSS-INJECTION',
      category: 'Boundary / Security',
      title: 'Tấn công XSS qua trường First Name & Address',
      description: `Nhập payload '${QA_FIXTURES.boundaryAndAttacks.xssPayloads[0]}' vào First Name.`,
      inputs: { 'First Name': QA_FIXTURES.boundaryAndAttacks.xssPayloads[0] },
      expectedOutcome: 'Trình duyệt không bật hộp thoại alert, chuỗi được encode/escape an toàn.'
    });

    matrix.push({
      id: 'TC-06-BOUNDARY-LENGTH',
      category: 'Boundary / Security',
      title: 'Nhập chuỗi cực dài (Boundary 256 ký tự) vào trường Tên',
      description: 'Kiểm tra độ bền giao diện khi tên dài vượt quá giới hạn thiết kế.',
      inputs: { 'First Name': QA_FIXTURES.boundaryAndAttacks.longStrings[0] },
      expectedOutcome: 'Hệ thống tự cắt bớt (truncate) hoặc hiển thị thông báo vượt quá độ dài tối đa, không vỡ layout.'
    });

    matrix.push({
      id: 'TC-07-UNICODE-VIETNAMESE',
      category: 'Boundary / Security',
      title: 'Hỗ trợ tiếng Việt có dấu đầy đủ và Ký tự Emoji',
      description: `Nhập '${QA_FIXTURES.boundaryAndAttacks.unicodeAndEmoji[0]}' và '${QA_FIXTURES.boundaryAndAttacks.unicodeAndEmoji[1]}'.`,
      inputs: {
        'First Name': QA_FIXTURES.boundaryAndAttacks.unicodeAndEmoji[0],
        'Last Name': QA_FIXTURES.boundaryAndAttacks.unicodeAndEmoji[1]
      },
      expectedOutcome: 'Ký tự hiển thị đúng font chữ, không bị biến thành dấu hỏi (?) hoặc ký tự rác.'
    });

    // --- Category 4: State Transition & Idempotency ---
    matrix.push({
      id: 'TC-08-FORM-RESET',
      category: 'State & Idempotency',
      title: 'Kiểm tra tính năng Reset Form (Nút Refresh)',
      description: 'Điền dữ liệu vào form, sau đó bấm nút Refresh để kiểm tra trạng thái hoàn nguyên.',
      inputs: { 'First Name': 'TestReset' },
      expectedOutcome: 'Tất cả các trường quay trở lại giá trị rỗng mặc định, không lưu vết session cũ.'
    });

    // 3. Render Markdown Table
    const mdLines: string[] = [
      `# 🎯 MA TRẬN KIỂM THỬ TỔNG THỂ (QA TEST MATRIX)`,
      `**Trang mục tiêu:** [${title}](${url})`,
      `**Số phần tử form phát hiện:** ${fields.length} trường`,
      ``,
      `## 1. Danh sách Trường dữ liệu được Khảo sát`,
      `| Tên trường (Label) | Kiểu (Type) | Bắt buộc (Required) | Placeholder |`,
      `|---|---|---|---|`,
      ...fields.slice(0, 15).map(f => `| **${f.label}** | \`${f.type}\` | ${f.required ? '🔴 Có' : '⚪ Không'} | ${f.placeholder || 'N/A'} |`),
      ``,
      `## 2. Ma trận Kịch bản Kiểm thử theo Tư duy QA Chuyên nghiệp`,
      `| Mã test | Phân loại | Tên kịch bản | Dữ liệu đầu vào (Payload) | Kỳ vọng kiểm thử (Oracle) |`,
      `|---|---|---|---|---|`,
      ...matrix.map(m => `| \`${m.id}\` | **${m.category}** | ${m.title} | \`${JSON.stringify(m.inputs)}\` | ${m.expectedOutcome} |`),
      ``,
      `> 💡 **Khuyến nghị của Senior QA**: Thực thi lần lượt từ Happy Path -> Negative Validation -> Boundary & Security -> State Idempotency để đảm bảo độ bao phủ rủi ro tối đa.`
    ];

    return {
      pageTitle: title,
      url,
      fields,
      matrix,
      markdown: mdLines.join('\n')
    };
  }
}

export const testMatrixGenerator = new TestMatrixGenerator();

