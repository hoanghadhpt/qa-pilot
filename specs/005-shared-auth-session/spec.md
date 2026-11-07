# Feature Specification: Shared Auth Session Storage

**Feature ID**: `005-shared-auth-session`  
**Branch**: `005-shared-auth-session`  
**Status**: Ready for Implementation  
**Created**: 2026-11-06  
**Input**: User request: "lên kế hoạch triển khai tính năng share auth token cho solo QA và team QA"

---

## 1. Mục Tiêu & Bối Cảnh (Context & Objectives)

Trong kiểm thử tự động, việc lặp lại thao tác đăng nhập qua giao diện người dùng (UI Login) cho mỗi kịch bản kiểm thử gây lãng phí 70% thời gian thực thi, dễ dính CAPTCHA/OTP và gây tình trạng "đá session" lẫn nhau.

Tính năng **Shared Auth Session Storage** cung cấp cơ chế:
1. **Lưu trữ trạng thái đăng nhập (Storage State)**: Trích xuất toàn bộ Cookies và LocalStorage/SessionStorage của phiên đăng nhập thành profile độc lập.
2. **Nạp phiên tức thì (Zero-Latency Auth)**: Khởi tạo ngữ cảnh trình duyệt với session đã có sẵn trong **0.05 giây**, bỏ qua hoàn toàn trang đăng nhập.
3. **Hỗ trợ 2 mô hình**:
   - **Solo QA**: Interactive One-Time Login (Tester tự đăng nhập 1 lần, vượt mọi CAPTCHA/2FA), lưu local profile để dùng vĩnh viễn.
   - **Team QA & CI/CD**: Quản lý ma trận đa vai trò (`admin`, `staff`, `buyer`), phát hiện token hết hạn (`exp` validation), và chia sẻ phiên qua Vault/Storage an toàn không commit mật khẩu lên Git.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Solo QA One-Time Login & Instant Replay (Priority: P1)
Là một QA/Developer, tôi muốn đăng nhập tài khoản một lần duy nhất trên trình duyệt, để QA Pilot tự động lưu lại trạng thái phiên (Cookies + LocalStorage) và tự động nạp lại cho mọi lần kiểm thử tiếp theo mà không cần gõ tài khoản/mật khẩu.

* **Acceptance Criteria**:
  1. **Given** người dùng đang ở trang web sau khi đăng nhập thành công, **When** gọi công cụ `qa_auth_save({ role: 'admin' })`, **Then** hệ thống trích xuất toàn bộ Cookies và LocalStorage hợp lệ lưu vào `tests/fixtures/auth/admin.json`.
  2. **Given** file `tests/fixtures/auth/admin.json` đã tồn tại, **When** khởi động phiên kiểm thử mới với `qa_auth_load({ role: 'admin' })`, **Then** trình duyệt tự động có sẵn session mà không cần truy cập `/login`.

---

### User Story 2 - Auto Session Validation & Expiry Detection (Priority: P1)
Là một QA automation engineer, tôi muốn hệ thống tự động kiểm tra tính hợp lệ của token và cảnh báo ngay lập tức nếu session đã hết hạn để tránh test bị thất bại oan uổng.

* **Acceptance Criteria**:
  1. **Given** một auth profile đã lưu, **When** gọi `qa_auth_status({ role: 'admin' })`, **Then** hệ thống phân tích hạn dùng (JWT `exp` hoặc Cookie `expires`) và trả về: `valid (còn N phút)` hoặc `expired`.
  2. **Given** session nạp vào bị hết hạn khiến server trả về HTTP 401 hoặc điều hướng về `/login`, **Then** Triple-Oracle ghi nhận lỗi xác thực và gợi ý làm mới session thay vì báo lỗi assertion phần tử.

---

### User Story 3 - Multi-Role Session Matrix (Priority: P2)
Là một nhóm phát triển, tôi muốn lưu trữ và chuyển đổi nhanh giữa nhiều vai trò khác nhau (`admin`, `staff`, `customer`) trong cùng một phiên hoặc giữa các ca kiểm thử khác nhau.

* **Acceptance Criteria**:
  1. **Given** các profile `admin.json` và `customer.json` đã được lưu, **When** chuyển đổi ca test từ Admin sang Customer bằng `qa_auth_load({ role: 'customer' })`, **Then** phiên làm việc của Admin được dọn sạch và nạp đúng ngữ cảnh Customer.

---

### User Story 4 - Team Auth Vault & Security Sanitization (Priority: P3)
Là một QA Lead, tôi muốn đảm bảo các file session authentication không bao giờ bị commit nhầm lên Git và có thể đồng bộ hóa giữa các thành viên qua biến môi trường hoặc Cloud Storage được mã hóa.

* **Acceptance Criteria**:
  1. Thư mục `tests/fixtures/auth/` và file `*.auth.json` được loại trừ hoàn toàn khỏi Git qua `.gitignore`.
  2. Hỗ trợ import/export auth state dạng Base64 Encrypted String thông qua biến môi trường `QA_AUTH_STATE_<ROLE>`.

---

## 3. Ranh Giới Tính Năng (Scope & Boundaries)

* **In Scope**:
  * Các công cụ MCP: `qa_auth_save`, `qa_auth_load`, `qa_auth_status`, `qa_auth_clear`.
  * Bộ lưu trữ profile JSON tương thích chuẩn `Playwright storageState`.
  * Tích hợp Triple-Oracle bắt lỗi 401 / redirect login.
  * Tích hợp hiển thị vai trò xác thực đang dùng lên Header Report HTML.
* **Out of Scope (để dành Phase sau)**:
  * Tự động giải CAPTCHA bằng AI (người dùng tự giải ở bước setup ban đầu).
  * Can thiệp sinh mã OTP SMS (sử dụng Human-in-the-loop hoặc bypass secret ở Staging).
