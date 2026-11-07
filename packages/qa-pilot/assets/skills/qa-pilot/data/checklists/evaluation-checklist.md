# Test Quality & Evaluation Checklist

Bảng kiểm duyệt chất lượng ca kiểm thử dành cho Senior QA và AI Agent trước khi hoàn tất hoặc xuất mã Playwright E2E.

---

## 1. Nguyên tắc Triple-Oracle (UI + Console + Network)
- [ ] **QC-01 (UI Oracle)**: Mọi assertion đều kiểm tra trạng thái hiển thị trực quan (element visible, text message, validation highlight).
- [ ] **QC-02 (Console Oracle)**: Xác nhận không có lỗi JavaScript nghiêm trọng phát sinh trong console (`TypeError`, `Uncaught Exception`).
- [ ] **QC-03 (Network Oracle)**: Xác nhận API request phản hồi đúng mã HTTP dự kiến (200, 201 cho luồng thành công; 400, 422 cho validation; không có lỗi 500 unhandled).

---

## 2. Tính độc lập & Bất biến (Isolation & Idempotency)
- [ ] **QC-04 (Zero-Collision Data)**: Dữ liệu test (username, email, mã đơn hàng) sử dụng `DataFactory` sinh ngẫu nhiên hoặc timestamp để không gây xung đột với lần chạy trước.
- [ ] **QC-05 (Self-Contained Fixture)**: Mỗi test case tự khởi tạo ngữ cảnh hoặc nạp role tương ứng qua `test.fixture.ts`, không phụ thuộc vào thứ tự chạy của các file test khác.
- [ ] **QC-06 (Idempotency Verification)**: Khi submit lỗi và sửa lại, hoặc khi refresh trang, form có thể phục hồi và thao tác tiếp tục mà không bị treo.

---

## 3. Kiến trúc Page Object & Bảo trì
- [ ] **QC-07 (Component Composition)**: Các thành phần dùng chung (Navbar, Toast, Modal) được tách thành Component riêng gắn trên `BasePage`, không lặp lại locator ở các page khác nhau.
- [ ] **QC-08 (Semantic Locators First)**: Ưu tiên `getByRole`, `getByLabel`, `getByPlaceholder`, `getByTestId`. Tránh dùng đường dẫn XPath dài hoặc class CSS tự sinh dễ vỡ.
- [ ] **QC-09 (Concise Spec File)**: File `.spec.ts` không chứa mã logic chi tiết hoặc selector nội bộ, chỉ gọi các action cấp cao của Page Object (độ dài lý tưởng < 15 dòng/test).

---

## 4. An toàn & Bảo mật
- [ ] **QC-10 (Secret Redaction)**: Mật khẩu, token xác thực, API key không được hardcode trong test code hoặc log hiển thị; luôn dùng biến môi trường hoặc cơ chế redact.

