# Feature Specification: QA Pilot - Agentic QA Platform (Antigravity MCP & Midscene Engine)

**Feature Branch**: `003-agentic-qa-mcp`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Refactor toan bo sang kien truc Agentic QA: tich hop truc tiep voi Antigravity qua MCP Server va Custom Skill, su dung loi Midscene.js / Playwright de kiem thu web tu dong bang ngon ngu tu nhien, tu phuc hoi selector va xuat Test-as-Code."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tương tác kiểm thử tự động qua Chat trong Antigravity (Priority: P1)

Là một kỹ sư QA, tôi muốn mở Antigravity và chat trực tiếp bằng ngôn ngữ tự nhiên để yêu cầu AI thực hiện các bước kiểm thử trên trình duyệt (mở trang, click, nhập dữ liệu, kiểm tra assertion), quan sát trình duyệt thao tác trực tiếp và nhận phản hồi tức thì kèm bằng chứng trực quan trong cửa sổ chat.

**Why this priority**: Đây là giá trị cốt lõi giải quyết triệt để điểm yếu của phiên bản cũ. Người dùng không cần mở dashboard web riêng lẻ hay thao tác nút bấm thủ công mà điều khiển toàn bộ luồng kiểm thử ngay trong môi trường làm việc của Antigravity.

**Independent Test**: Mở Antigravity, chat câu lệnh: `"Mở trang https://demo.automationtesting.in/Register.html, điền Họ Tên và bấm Refresh"`. Hệ thống tự động mở trình duyệt Chrome, thực thi chính xác các bước qua MCP tool và báo cáo kết quả thành công trong chat kèm ảnh chụp màn hình.

**Acceptance Scenarios**:

1. **Given** Antigravity đã kết nối với `qa-pilot-mcp` server, **When** người dùng yêu cầu kiểm thử một luồng cụ thể bằng ngôn ngữ tự nhiên, **Then** Antigravity tự động kích hoạt công cụ `qa_navigate` và `qa_act` để điều khiển trình duyệt và trả kết quả từng bước.
2. **Given** một bước kiểm thử yêu cầu xác thực (`assert`), **When** người dùng yêu cầu: `"Kiểm tra xem tiêu đề 'Register' có hiển thị không"`, **Then** công cụ `qa_assert` sử dụng mô hình thị giác/ngữ nghĩa của Midscene để xác thực và trả về kết quả `PASSED` hoặc `FAILED` kèm lý do chi tiết.
3. **Given** trình duyệt đang mở ở một trạng thái bất kỳ, **When** người dùng yêu cầu `"Kiểm tra màn hình hiện tại"`, **Then** công cụ `qa_inspect` trả về ảnh chụp màn hình có đánh dấu các phần tử tương tác (Set-of-Marks) kèm danh sách hành động khả thi.

---

### User Story 2 - Tự phục hồi Selector và Báo cáo Trực quan (Priority: P2)

Là một kỹ sư QA, tôi muốn hệ thống không bị gãy (flaky) khi ID/class hoặc cấu trúc DOM của trang web thay đổi, đồng thời tự động xuất báo cáo trực quan có thể xem lại từng thao tác và vị trí click chuột.

**Why this priority**: Các bài kiểm thử truyền thống thường xuyên bị lỗi do selector thay đổi. Sử dụng engine thị giác của Midscene giúp kiểm thử ổn định bền vững và cung cấp bằng chứng trực quan sinh động.

**Independent Test**: Chạy một kịch bản kiểm thử trên một trang web có dynamic ID/class, xác nhận hệ thống vẫn định vị đúng phần tử dựa trên nhãn văn bản và vị trí hiển thị, sau đó mở file báo cáo HTML sinh ra để kiểm tra timeline trực quan.

**Acceptance Scenarios**:

1. **Given** phần tử giao diện bị thay đổi class CSS hoặc đổi vị trí DOM nhưng vẫn giữ nguyên nhãn ngữ nghĩa hiển thị cho người dùng, **When** `qa_act` thực thi thao tác trên phần tử đó, **Then** engine tự động nhận diện chính xác phần tử qua tọa độ thị giác mà không báo lỗi "Element not found".
2. **Given** một phiên kiểm thử vừa hoàn thành (thành công hoặc thất bại), **When** người dùng yêu cầu xem báo cáo, **Then** hệ thống cung cấp đường dẫn tệp báo cáo `report.html` (Midscene Visual Playground) cho phép xem lại toàn bộ timeline, ảnh chụp trước/sau mỗi action và dữ liệu debug mạng/console.

---

### User Story 3 - Xuất kịch bản tự động thành Test-as-Code (Playwright TS & YAML) (Priority: P3)

Là một kỹ sư QA, sau khi hoàn thành một phiên kiểm thử thăm dò (exploratory testing) thành công qua chat, tôi muốn yêu cầu Antigravity xuất toàn bộ phiên đó thành mã nguồn Playwright (`.spec.ts`) hoặc YAML chuẩn để commit vào Git và chạy trên CI/CD định kỳ.

**Why this priority**: Biến thành quả tương tác qua chat thành tài sản kiểm thử tái sử dụng lâu dài, tích hợp vào quy trình CI/CD tự động mà không phát sinh thêm chi phí gọi LLM sau này.

**Independent Test**: Sau khi chat hoàn tất một flow kiểm thử gồm 5 bước, gõ lệnh `"Xuất flow vừa chạy thành kịch bản Playwright vào tests/e2e/register.spec.ts"`. Kiểm tra tệp sinh ra và chạy `npx playwright test tests/e2e/register.spec.ts` đạt kết quả pass độc lập.

**Acceptance Scenarios**:

1. **Given** phiên kiểm thử vừa thực thi thành công chuỗi hành động, **When** người dùng gọi `qa_export_test` với định dạng `playwright`, **Then** hệ thống tạo tệp mã nguồn TypeScript chuẩn Playwright sử dụng locator tối ưu, có assertion rõ ràng và tuân thủ cấu trúc dự án.
2. **Given** kịch bản kiểm thử chứa các thông tin nhạy cảm (mật khẩu, API key), **When** xuất mã nguồn hoặc ghi log, **Then** các giá trị nhạy cảm được tự động thay thế bằng biến môi trường `process.env.*` hoặc `${secret.*}` theo đúng nguyên tắc bảo vệ biến mật của dự án.

---

### User Story 4 - Bảo vệ an toàn Production và Quản lý Môi trường (Priority: P2)

Là một kỹ sư QA, tôi muốn đảm bảo an toàn tuyệt đối khi kiểm thử: hệ thống tự động chặn các hành động có tính phá hủy (xóa dữ liệu, thanh toán tài chính) trên môi trường Production, và tự động nạp đúng cấu hình biến môi trường tương ứng.

**Why this priority**: Tuân thủ nguyên tắc cốt lõi (Constitution III) nhằm ngăn chặn rủi ro làm hỏng dữ liệu khách hàng hoặc hệ thống thật.

**Independent Test**: Cấu hình môi trường mục tiêu là tên miền Production, ra lệnh `"Click nút Xóa tất cả tài khoản"`, xác nhận hệ thống từ chối thực thi và thông báo vi phạm quy tắc an toàn.

**Acceptance Scenarios**:

1. **Given** URL mục tiêu thuộc môi trường `Production`, **When** lệnh kiểm thử chứa các hành động gắn nhãn phá hủy hoặc xóa dữ liệu, **Then** MCP Server từ chối thực hiện thao tác và thông báo lý do chặn an toàn cho người dùng trên chat.
2. **Given** dự án có tệp cấu hình môi trường trong `tests/envs/`, **When** người dùng chỉ định môi trường kiểm thử (ví dụ: `staging`), **Then** hệ thống tự động phân giải các biến `${env.BASE_URL}` và nạp dữ liệu tương ứng.

## Edge Cases & Non-Functional Requirements

- **Browser Reconnect / Reuse**: Hỗ trợ kết nối vào phiên Chrome đang mở qua cổng CDP `9222` hoặc tự động bật cửa sổ Chrome mới khi chưa có.
- **Headless & Headed Switch**: Cho phép người dùng chuyển đổi linh hoạt giữa chế độ có đầu (để QA nhìn thấy trực tiếp) và không đầu (headless cho tốc độ cao).
- **Redaction**: Mọi thông tin nhạy cảm từ `.env.local` phải được ẩn thành `[REDACTED]` trước khi gửi về client chat hoặc lưu vào artifact.
- **Language**: Hỗ trợ chỉ thị kiểm thử và phản hồi kết quả bằng Tiếng Việt và Tiếng Anh.
