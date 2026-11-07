# Feature Specification: QA Pilot Team Collaboration & CI/CD Platform

**Feature ID**: `004-team-collaboration-platform`  
**Status**: Draft / In Planning  
**Target Delivery**: Enterprise / Team Expansion

---

## 1. Mục Tiêu & Đối Tượng Sử Dụng (Target Personas)

Hệ thống QA Pilot mở rộng từ công cụ kiểm thử cá nhân trong IDE thành **Nền tảng kiểm thử chất lượng toàn diện cho đội ngũ kỹ thuật (Team QA & Engineering Platform)**.

### Đối tượng sử dụng & Nỗi đau được giải quyết:

| Vai trò trong Team | Nỗi đau hiện tại | Giá trị QA Pilot mang lại |
| :--- | :--- | :--- |
| **QA Automation / Manual Tester** | • Mất hàng giờ viết và bảo trì locator DOM phức tạp.<br>• Kịch bản test hay bị gãy (*flaky*) khi UI đổi giao diện.<br>• Khó phát hiện lỗi ngầm nếu UI không văng lỗi. | • Sinh kịch bản và xác thực bằng ngôn ngữ tự nhiên.<br>• Tự động áp dụng ma trận 4 trụ cột (Happy, Negative, Boundary, Idempotency).<br>• Tự xuất code Playwright chuẩn TypeScript để lưu vào kho code chung.<br>• Triple-Oracle bắt trọn lỗi JavaScript và Network 4xx/5xx. |
| **Frontend & Fullstack Devs** | • Lười viết kiểm thử E2E vì tốn thời gian setup môi trường.<br>• Sợ break tính năng cũ khi merge code.<br>• Khó tái hiện bug từ báo cáo của tester. | • Dùng trực tiếp trong IDE qua lệnh MCP ngắn gọn.<br>• Chạy test nhanh trước khi mở Pull Request.<br>• Tự động có báo cáo HTML trực quan kèm screenshot minh chứng đính kèm PR. |
| **QA Lead / Engineering Manager** | • Thiếu cái nhìn tổng quan về chất lượng sản phẩm qua các sprint.<br>• Không kiểm soát được chi phí token AI khi dev dùng bừa bãi.<br>• Khó giải trình hiệu quả automation cho sếp. | • Dashboard theo dõi Run History Trend (tỷ lệ pass/fail và thời gian thực thi theo từng ngày/tuần).<br>• Minh bạch chi phí AI token và ngân sách từng phiên kiểm thử.<br>• Báo cáo chuyên nghiệp, chuẩn Allure phục vụ demo và audit. |
| **Product Manager (PM) / BA** | • Nghiệm thu tính năng (UAT) thủ công mất thời gian.<br>• Không biết đọc code test kỹ thuật. | • Báo cáo trực quan hiển thị đầy đủ timeline và ảnh chụp màn hình từng bước nghiệp vụ, có modal phóng to để duyệt nghiệm thu tức thì. |

---

## 2. Kịch Bản Sử Dụng Điển Hình Của Team (User Stories)

### User Story 1: Dev kiểm thử nhanh trước khi tạo Pull Request
* Là một lập trình viên, tôi muốn gõ lệnh MCP trong IDE để kiểm thử luồng nghiệp vụ vừa sửa, tự động sinh báo cáo và đính kèm link kết quả vào PR description.

### User Story 2: Tự động chạy Regression Test trên CI/CD
* Là một Tech Lead, tôi muốn kịch bản kiểm thử được kích hoạt tự động trên GitHub Actions / GitLab CI mỗi khi có Pull Request mới, chạy headless trên môi trường Staging và tự động comment kết quả tóm tắt vào PR.

### User Story 3: Báo cáo tập trung và cảnh báo qua Slack/Feishu
* Là một QA Lead, tôi muốn mọi lần chạy test từ máy cá nhân hoặc CI đều đẩy báo cáo lên Cloud (S3/R2/Vercel) và gửi thông báo tức thì vào kênh chat chung của team khi có lỗi nghiêm trọng.

### User Story 4: Tự động tạo Bug Ticket lên Jira/Linear
* Là một QA Tester, khi Triple-Oracle phát hiện lỗi HTTP 500 hoặc JS Exception crash giao diện, tôi muốn bấm 1 nút để tự động tạo ticket Jira/Linear với đầy đủ ảnh chụp, bước tái hiện và console log.

---

## 3. Các Yêu Cầu Chức Năng Cốt Lõi (Functional Requirements)

* **FR-01: Centralized Cloud Report Storage**: Hỗ trợ xuất và đồng bộ báo cáo HTML + ảnh chụp lên AWS S3, Cloudflare R2, hoặc Supabase Storage để cả team truy cập bằng URL duy nhất.
* **FR-02: CI/CD GitHub Action**: Đóng gói thành GitHub Action (`qa-pilot-action`), tự động comment bảng tóm tắt kết quả kiểm thử vào PR.
* **FR-03: Team Webhooks Notification**: Hỗ trợ gửi thông báo kết quả kiểm thử qua Webhook đến Slack, Discord, Feishu hoặc Telegram.
* **FR-04: Defect Auto-Filing (Jira/Linear)**: Tích hợp API tạo Issue trên Jira/Linear/GitHub Issues kèm đính kèm screenshot và log lỗi Triple-Oracle.
* **FR-05: Multi-Browser & Viewports Matrix**: Hỗ trợ chạy đồng thời hoặc cấu hình ma trận trình duyệt (Chromium, Firefox, WebKit) và thiết bị di động (Mobile Chrome, Mobile Safari).
* **FR-06: Shared Auth Session (Storage State)**: Lưu trữ và tái sử dụng session đăng nhập (Cookies, LocalStorage) để bỏ qua bước đăng nhập lặp lại cho các test suite trong team.

