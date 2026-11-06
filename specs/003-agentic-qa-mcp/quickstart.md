# Quickstart Validation Guide: QA Pilot Agentic Platform

Tài liệu này hướng dẫn cách xác thực và chạy thử nghiệm tính năng QA Pilot Agentic MCP từ đầu đến cuối sau khi hoàn thành refactor.

## Điều kiện tiên quyết

1. Node.js >= 18 và npm đã được cài đặt.
2. Trình duyệt Google Chrome hoặc Chromium có sẵn trên máy.
3. Antigravity IDE hoặc CLI.

## Các bước kích hoạt & kiểm thử

### Bước 1: Khởi động & Cấu hình MCP Server

Cấu hình tệp `.mcp.json` tại thư mục gốc của dự án:

```json
{
  "mcpServers": {
    "qa-pilot": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"]
    }
  }
}
```

Kiểm tra kết nối MCP:
```bash
npm run build:mcp
```

---

### Bước 2: Kịch bản Kiểm thử Nghiệm thu qua Chat (End-to-End Chat Flow)

Mở Antigravity Chat và nhập các câu lệnh thử nghiệm:

#### Tình huống 1: Thực thi kiểm thử bằng ngôn ngữ tự nhiên
**Prompt người dùng:**
> *"Mở trang `https://demo.automationtesting.in/Register.html`, điền tên 'Nguyen', họ 'Van', chọn giới tính Nam và kiểm tra xem tiêu đề 'Register' có trên trang không."*

**Kỳ vọng hệ thống:**
1. Trình duyệt Chrome bật lên (`headless: false`).
2. Mở đúng trang đăng ký.
3. Midscene nhận diện chính xác các ô `First Name`, `Last Name`, radio `Male` và thực hiện tương tác.
4. Antigravity gọi `qa_assert("tiêu đề 'Register' hiển thị trên trang")` và trả về `PASSED`.
5. Trong khung chat hiển thị báo cáo kèm ảnh chụp màn hình minh chứng.

#### Tình huống 2: Tự động phục hồi khi selector thay đổi
**Prompt người dùng:**
> *"Bấm vào nút Refresh ở cuối form và kiểm tra các trường đã được xóa trắng chưa."*

**Kỳ vọng:**
1. Engine tự tìm nút Refresh dựa trên nhãn thị giác mà không cần biết ID của nút.
2. Form được reset.
3. Báo cáo xác thực hiển thị kết quả thành công.

#### Tình huống 3: Xuất kịch bản thành Test-as-Code
**Prompt người dùng:**
> *"Xuất toàn bộ luồng vừa thực hiện thành file kịch bản Playwright vào `tests/e2e/demo_register.spec.ts`."*

**Kỳ vọng:**
1. Tệp `tests/e2e/demo_register.spec.ts` được tạo với mã nguồn TypeScript chuẩn Playwright.
2. Chạy độc lập bằng lệnh sau và đạt kết quả xanh:
```bash
npx playwright test tests/e2e/demo_register.spec.ts
```

#### Tình huống 4: Mở Báo cáo trực quan (Visual Report)
**Prompt người dùng:**
> *"Cho tôi xem báo cáo trực quan của lần chạy này."*

**Kỳ vọng:**
1. Antigravity cung cấp đường dẫn tệp `report.html` (Midscene Visual Playground).
2. Khi mở tệp, QA có thể kéo timeline để xem ảnh chụp màn hình từng bước và tọa độ click chuột thực tế.

