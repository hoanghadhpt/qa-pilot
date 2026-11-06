# QA Pilot (v0.1.0) - Agentic AI QA Platform for Antigravity

**QA Pilot** là nền tảng kiểm thử web tự động thế hệ mới tích hợp trực tiếp vào **Google Antigravity IDE** thông qua **Model Context Protocol (MCP)** và **Antigravity Custom Skill**, sử dụng lõi **Midscene.js** và **Playwright** để điều khiển trình duyệt và xác thực giao diện bằng ngôn ngữ tự nhiên.

---

## 🌟 Tính năng nổi bật

1. **Điều khiển & Kiểm thử trực tiếp qua Chat**:
   - Không cần mở web dashboard riêng biệt hay thao tác nút bấm thủ công.
   - Trò chuyện tự nhiên với Antigravity: *"Mở trang staging, điền form đăng ký với email ngẫu nhiên, kiểm tra nút Submit hiển thị thông báo thành công"*.
2. **Lõi Cảm Nhận Thị Giác & Tự Phục Hồi (Midscene + Playwright)**:
   - Tự động nhận diện phần tử web bằng thị giác máy tính và ngữ nghĩa (Visual Perception).
   - Không bị gãy (flaky) khi class CSS, ID hoặc cấu trúc DOM thay đổi.
3. **Báo cáo Trực quan (Visual Report)**:
   - Tự động ghi lại ảnh chụp màn hình từng bước và tọa độ click chuột.
   - Xuất file báo cáo HTML `tests/runs/<sessionId>/report.html` cho phép xem lại toàn bộ timeline trực quan.
4. **Xuất kịch bản Test-as-Code**:
   - Chuyển đổi toàn bộ phiên kiểm thử qua chat thành file mã nguồn **Playwright TypeScript (`.spec.ts`)** hoặc **YAML** để commit vào Git và chạy định kỳ trên CI/CD mà không tốn thêm token AI.
5. **Bảo vệ An Toàn Production & Che Biến Mật**:
   - Tự động chặn các thao tác phá hủy (`delete`, `remove`, `payment`) trên môi trường Production.
   - Tự động che toàn bộ mật khẩu và API key thành `[REDACTED]` trong log và báo cáo.

---

## 🚀 Cài đặt và Kích hoạt

### 1. Cài đặt Dependencies & Biên dịch MCP Server

```bash
# Cài đặt và build gói MCP server
npm --prefix packages/mcp-server install
npm run build:mcp
```

### 2. Cấu hình Antigravity MCP

Tệp `.mcp.json` tại thư mục gốc dự án đã được cấu hình sẵn:

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

Antigravity IDE sẽ tự động phát hiện và kết nối với máy chủ MCP `qa-pilot`.

---

## 💬 Hướng dẫn Trò chuyện Kiểm thử với Antigravity

Trong khung chat của Antigravity, bạn có thể ra lệnh kiểm thử bằng tiếng Việt hoặc tiếng Anh:

* **Mở trang**:
  > *"Mở trang `https://demo.automationtesting.in/Register.html`"*
* **Thao tác tự nhiên**:
  > *"Điền 'Nguyen' vào ô First Name, điền 'Van' vào ô Last Name, và chọn giới tính Nam"*
* **Xác thực trạng thái**:
  > *"Kiểm tra xem tiêu đề 'Register' có hiển thị trên trang không"*
* **Xem lại báo cáo**:
  > *"Cho tôi xem báo cáo trực quan của lần chạy này"*
* **Xuất mã nguồn**:
  > *"Xuất luồng vừa chạy thành file Playwright test vào `tests/e2e/register.spec.ts`"*
