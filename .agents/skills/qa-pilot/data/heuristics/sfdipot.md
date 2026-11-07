# SFDIPOT Heuristic Taxonomy for Web Testing

Cẩm nang áp dụng mô hình heuristic SFDIPOT (James Bach) dành cho Senior QA Automation Engineer trong việc phân tích và thiết kế Test Matrix cho ứng dụng web.

---

## 1. Structure (Cấu trúc giao diện & Thành phần DOM)
Phân tích những gì cấu thành nên trang web và kiến trúc phân rã giao diện:
- **Thành phần**: Form container, Input text, Number field, Dropdown select, Checkbox, Radio, Submit button, Reset button.
- **Phân cấp Component**: Header / Navbar, Main content, Modal dialogs, Toast notifications.
- **Tiêu chuẩn Locator**: Ưu tiên Semantic Locators (Role + Name, Label, Test ID). Tránh tuyệt đối XPath tuyệt đối dài dòng hoặc CSS class dễ biến đổi (e.g., hash class của styled-components).
- **Trạng thái cấu trúc**: Disabled state, Hidden fields, Read-only fields, Loading spinners.

---

## 2. Function (Chức năng & Quy tắc nghiệp vụ)
Kiểm tra xem hệ thống làm được những gì và những gì bị cấm:
- **Happy Path**: Luồng thành công lý tưởng với dữ liệu hợp lệ.
- **Negative Validation**: Bỏ trống trường bắt buộc, nhập sai định dạng email, mật khẩu không đủ độ dài, số điện thoại chứa chữ cái.
- **Conditional Visibility**: Các trường chỉ xuất hiện khi một tùy chọn nhất định được chọn (ví dụ: chọn hình thức thanh toán thẻ mới hiện ô số thẻ).
- **Error Recovery**: Sau khi báo lỗi đỏ, người dùng sửa lại đúng dữ liệu thì lỗi có tự động biến mất và cho phép submit lại không.

---

## 3. Data (Dữ liệu đầu vào, Dải biên & Tấn công)
Thử thách hệ thống bằng các dạng dữ liệu khắc nghiệt:
- **Boundary Value Analysis (BVA)**:
  - Trường văn bản: 0 ký tự (rỗng), 1 ký tự (biên dưới), max ký tự (255 chars), max + 1 ký tự (>255 chars).
  - Trường số: Min, Max, Số âm (-1), Số 0, Số thực dấu phẩy động (3.14), Số cực lớn (`9999999999999`).
- **Naughty Strings & Chuỗi đặc biệt**:
  - Tiếng Việt có dấu và thanh điệu phức tạp: `"Nguyễn Văn Trọng Nghĩa (Tiếng Việt có dấu: ế, ắ, ộ, ử)"`.
  - Ký tự khoảng trắng lạ: Non-breaking space (`\u00A0`), Zero-width space (`\u200B`), Tab, Trailing/Leading spaces.
  - Payloads bảo mật (XSS/SQLi): `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`, `' OR '1'='1`.
  - Emoji & Unicode 4-byte: `😀🎉🚀🔥` (kiểm tra encoding UTF-8mb4 trên database).

---

## 4. Interfaces (Giao diện tích hợp, API & Network)
Quan sát điểm kết nối giữa Client và Server qua Network Oracle:
- **Mã phản hồi HTTP**: Kiểm tra 200 OK cho luồng đúng, 400 Bad Request cho validation, 401 Unauthorized khi hết hạn phiên, 403 Forbidden, 500 Internal Server Error.
- **Payload Request**: Kiểm tra tham số gửi lên JSON body có bị thừa, thiếu hoặc gửi lộ mật khẩu dưới dạng plain text không.
- **Chuyển hướng trang (Redirect)**: Sau khi đăng nhập thành công phải chuyển về đúng trang trước đó hoặc Dashboard; khi token hết hạn phải chuyển hướng về `/login`.

---

## 5. Platform (Môi trường thực thi & Thiết bị)
Đảm bảo tính tương thích trên các nền tảng:
- **Trình duyệt**: Chromium, Firefox, WebKit (Safari).
- **Kích thước Viewport**: Desktop (1920x1080, 1280x720), Mobile emulation (Pixel 5, iPhone 13).
- **Hệ thống Font & Bàn phím**: Gõ bàn phím ảo trên mobile, phím Enter để submit form thay vì click chuột.

---

## 6. Operations (Thao tác người dùng & Thói quen sử dụng)
Mô phỏng thói quen thực tế của người dùng:
- **Double Click / Multi Submit**: Người dùng click nút Submit 2 lần liên tiếp thật nhanh. Hệ thống phải vô hiệu hóa nút submit (debounce/disable) để tránh tạo dữ liệu trùng lặp.
- **Nút Reset**: Bấm Clear/Reset phải xóa toàn bộ giá trị đã điền và khôi phục form về trạng thái ban đầu.
- **Copy-Paste**: Người dùng copy paste chuỗi dài có chứa khoảng trắng thừa hoặc định dạng đặc biệt vào trường dữ liệu.

---

## 7. Time (Thời gian, Độ trễ & Tính bất biến)
Các yếu tố liên quan đến thời gian và trạng thái:
- **Idempotency (Tính bất biến)**: Submit một form thất bại, sửa lỗi và submit lại phải hoạt động bình thường, không gây ra deadlock hoặc lỗi trạng thái staled.
- **Network Latency / Slow Network**: Mô phỏng mạng chậm (Slow 3G), kiểm tra nút bấm có hiện trạng thái Loading/Spinner để người dùng không bấm loạn xạ không.
- **Session Expiration / TTL**: Kiểm tra hết hạn token JWT (`exp`) hoặc cookie và cơ chế làm mới hoặc đăng nhập lại.

