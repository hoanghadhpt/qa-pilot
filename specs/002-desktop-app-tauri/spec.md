# Feature Specification: Đóng gói Ứng dụng Desktop Native cho Windows và macOS (Tauri & Rust)

**Feature Branch**: `002-desktop-app-tauri`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "MVP tạm đủ dùng, đóng gói app desktop cho Windows và macOS sử dụng Tauri và Rust, tận dụng 100% frontend và engine hiện tại."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Khởi chạy và trải nghiệm QA Pilot như ứng dụng Native Desktop (Priority: P1)

Là một kỹ sư QA, tôi muốn mở QA Pilot trực tiếp từ biểu tượng ứng dụng trên macOS (Launchpad / Finder) hoặc Windows (Start Menu / Desktop) mà không cần mở terminal hay chạy lệnh máy chủ thủ công, sử dụng toàn bộ tính năng kiểm thử tự động trong một cửa sổ desktop độc lập.

**Why this priority**: Loại bỏ rào cản kỹ thuật khi triển khai trong đội ngũ QA, mang lại trải nghiệm phần mềm chuyên nghiệp, độc lập với trình duyệt web thông thường.

**Independent Test**: Cài đặt gói `.dmg` trên macOS hoặc `.msi` / `.exe` trên Windows, mở ứng dụng, thực hiện toàn bộ thao tác duyệt kịch bản, chỉnh sửa bước kiểm thử và chạy kiểm thử tự động qua CDP đạt trạng thái hoạt động chính xác tương đương phiên bản web.

**Acceptance Scenarios**:

1. **Given** người dùng đã cài đặt ứng dụng Desktop QA Pilot, **When** người dùng mở ứng dụng từ hệ điều hành, **Then** cửa sổ ứng dụng xuất hiện tức thì, tự động khởi động dịch vụ nền ngầm và hiển thị đầy đủ giao diện 3 cột sẵn sàng thao tác mà không yêu cầu nhập lệnh terminal.
2. **Given** người dùng đang thao tác trên cửa sổ Desktop, **When** người dùng thực thi kịch bản kiểm thử hoặc tạo kịch bản từ Prompt, **Then** toàn bộ kết nối CDP và giao tiếp AI CLI hoạt động ổn định và chính xác thông qua tiến trình nền sidecar.
3. **Given** người dùng đóng cửa sổ ứng dụng chính, **When** ứng dụng thoát hoàn toàn, **Then** toàn bộ các tiến trình nền phụ thuộc (sidecar / headless browser nếu có) được dọn dẹp và giải phóng tài nguyên CPU/RAM sạch sẽ.

---

### User Story 2 - Đóng gói phân phối đa nền tảng và Quản lý vòng đời tiến trình Sidecar (Priority: P2)

Là một kỹ sư duy trì hệ thống, tôi muốn quy trình đóng gói của QA Pilot tự động biên dịch và tạo ra các gói cài đặt native gọn nhẹ cho cả hai nền tảng Windows (`.msi` / `.exe`) và macOS (`.dmg` / `.app`) với dung lượng cài đặt tối ưu và mức tiêu hao RAM thấp.

**Why this priority**: Đảm bảo tính nhất quán khi phân phối ứng dụng cho các thành viên trong nhóm dùng các hệ điều hành khác nhau.

**Independent Test**: Chạy lệnh đóng gói (`build`), xác nhận tệp cài đặt cho macOS và Windows được sinh ra với dung lượng dưới 60MB và RAM tiêu thụ dưới 100MB ở trạng thái chờ.

**Acceptance Scenarios**:

1. **Given** mã nguồn dự án được chuẩn bị cho môi trường macOS, **When** thực thi lệnh đóng gói bản phát hành, **Then** hệ thống tạo ra tệp cài đặt `.dmg` / `.app` hợp lệ, chứa đầy đủ mã nguồn giao diện và binary sidecar tương ứng với kiến trúc phần cứng (Apple Silicon `aarch64` và Intel `x64`).
2. **Given** mã nguồn dự án được chuẩn bị cho môi trường Windows, **When** thực thi lệnh đóng gói bản phát hành, **Then** hệ thống tạo ra tệp cài đặt `.msi` / `.exe` tương thích với WebView2 trên Windows 10/11.

---

### User Story 3 - Tích hợp Khay hệ thống (System Tray) và Thông báo Native của Hệ điều hành (Priority: P3)

Là một kỹ sư QA đang chạy một bộ kịch bản kiểm thử dài, tôi muốn thu nhỏ ứng dụng xuống khay hệ thống (System Tray / Menu Bar) và nhận thông báo native của hệ điều hành khi đợt kiểm thử hoàn tất hoặc khi có lỗi nghiêm trọng xảy ra.

**Why this priority**: Cho phép QA làm việc trên các tác vụ khác trong khi kịch bản kiểm thử chạy ngầm, nhận thông báo kịp thời khi có lỗi mà không cần theo dõi màn hình liên tục.

**Independent Test**: Khởi chạy một kịch bản kiểm thử, thu nhỏ cửa sổ app xuống System Tray, đợi kịch bản chạy xong và xác nhận banner thông báo xuất hiện trên Trung tâm thông báo của hệ điều hành kèm kết quả PASSED hoặc FAILED.

**Acceptance Scenarios**:

1. **Given** kịch bản kiểm thử đang chạy ngầm, **When** người dùng bấm thu nhỏ hoặc ẩn cửa sổ, **Then** biểu tượng QA Pilot vẫn hiển thị trên System Tray / Menu Bar với menu thao tác nhanh (`Hiện cửa sổ`, `Dừng kiểm thử`, `Thoát`).
2. **Given** một lượt chạy kiểm thử kết thúc trong lúc cửa sổ đang ẩn, **When** trạng thái chuyển sang `PASSED` hoặc `FAILED`, **Then** hệ thống phát thông báo native (OS Notification) hiển thị tiêu đề kịch bản và kết quả kiểm thử.

---

### Edge Cases

- **Xung đột cổng cục bộ khi khởi động**: Nếu cổng giao tiếp nội bộ (`4000`) giữa ứng dụng desktop và tiến trình sidecar đang bị chiếm bởi một phần mềm khác, lớp nền Rust phải tự động phát hiện và cấp phát cổng động khả dụng tiếp theo.
- **Môi trường Windows chưa kích hoạt WebView2**: Nếu máy trạm Windows thiếu thành phần runtime WebView2, bộ cài đặt hoặc ứng dụng phải thông báo rõ ràng hướng dẫn cài đặt runtime chính thức từ Microsoft.
- **Đóng ứng dụng đột ngột (Force Quit / Kill Signal)**: Khi ứng dụng nhận tín hiệu đóng cưỡng bức từ hệ điều hành, tiến trình Rust wrapper phải bảo đảm dừng tiến trình con (sidecar) để không để lại tiến trình zombie chạy ngầm.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ứng dụng PHẢI được đóng gói thành phần mềm Desktop native độc lập bằng framework **Tauri v2** và ngôn ngữ **Rust**, hỗ trợ hai hệ điều hành **macOS** (tương thích cả Apple Silicon `aarch64` và Intel `x64`) và **Windows** (Windows 10/11 64-bit).
- **FR-002**: Ứng dụng PHẢI tái sử dụng 100% giao diện người dùng hiện tại (React 18 + Vite + Ant Design v5) thông qua cơ chế nạp bundle tài sản tĩnh vào Webview native của hệ điều hành (WebKit trên macOS, Microsoft WebView2 trên Windows) mà không cần sửa đổi kiến trúc giao diện.
- **FR-003**: Ứng dụng PHẢI nhúng và quản lý vòng đời toàn bộ logic thực thi kiểm thử CDP, kết nối Chrome và phân tích AI CLI hiện tại dưới dạng một tiến trình nhúng cục bộ (**Tauri External Binary / Sidecar**), tự động khởi động cùng ứng dụng và tự động chấm dứt khi người dùng thoát ứng dụng.
- **FR-004**: Cửa sổ ứng dụng Desktop PHẢI hỗ trợ lưu trữ trạng thái kích thước, vị trí cửa sổ và cho phép phóng to, thu nhỏ, toàn màn hình phù hợp với hành vi chuẩn của hệ điều hành.
- **FR-005**: Ứng dụng PHẢI hỗ trợ biểu tượng Khay hệ thống (**System Tray** trên Windows / **Menu Bar** trên macOS) cho phép ẩn/hiện cửa sổ nhanh và thoát ứng dụng an toàn.
- **FR-006**: Ứng dụng PHẢI hỗ trợ gửi thông báo native (**Native OS Notification**) tới hệ thống khi kịch bản kiểm thử hoàn thành hoặc khi phát hiện lỗi nghiêm trọng trong chế độ chạy ngầm.
- **FR-007**: Toàn bộ kho kịch bản kiểm thử, cấu hình môi trường và tệp kết quả chạy PHẢI tiếp tục tuân thủ nguyên lý Test-as-Code, lưu trữ trực tiếp dưới dạng tệp phẳng trong thư mục dự án của người dùng trên ổ cứng.
- **FR-008 (Quy tắc văn bản & Giao diện tối giản)**: Toàn bộ thông báo hệ thống, menu khay hệ thống và thông báo native PHẢI tuân thủ nguyên tắc tối giản: không dùng emoji, không dùng từ ngữ quảng cáo cường điệu và chỉ sử dụng ngôn ngữ kỹ thuật chuẩn xác.

### Key Entities

- **Desktop Application Bundle**: Gói phần mềm cài đặt nhị phân hoàn chỉnh được ký và phân phối cho từng hệ điều hành (`.dmg`/`.app` cho macOS, `.msi`/`.exe` cho Windows).
- **Embedded Runner Sidecar**: Tiến trình thực thi nhúng chạy ngầm được quản lý bởi tầng lõi Rust, chịu trách nhiệm điều phối giao thức CDP với Chrome và gọi các AI CLI cục bộ.
- **Native Window & Tray State**: Cấu hình trạng thái hiển thị của cửa sổ chính và biểu tượng ứng dụng trên khay hệ điều hành.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng có thể khởi chạy ứng dụng Desktop và nhìn thấy giao diện sẵn sàng thao tác trong vòng dưới **1.5 giây** từ khi bấm biểu tượng ứng dụng.
- **SC-002**: Dung lượng gói cài đặt phân phối cuối cùng cho cả hai nền tảng macOS và Windows không vượt quá **60 MB** (nhẹ hơn ít nhất 3 đến 5 lần so với các giải pháp đóng gói dựa trên Electron).
- **SC-003**: Mức tiêu thụ bộ nhớ RAM của ứng dụng Desktop ở trạng thái chờ không vượt quá **100 MB**.
- **SC-004**: 100% kịch bản kiểm thử đang chạy thành công trên phiên bản web hiện tại đều thực thi đạt (`PASSED`) với kết quả tương đương khi chạy trên ứng dụng Desktop.
- **SC-005**: 100% tài nguyên tiến trình nền phụ thuộc được giải phóng hoàn toàn trong vòng **500ms** khi người dùng thoát ứng dụng.

## Assumptions

- Máy trạm Windows của người dùng đã có sẵn Microsoft Edge WebView2 Runtime (được cài đặt mặc định trên Windows 10 bản cập nhật mới và Windows 11).
- Trình duyệt Chrome/Chromium vẫn được cài đặt sẵn trên máy người dùng để phục vụ chạy kiểm thử qua CDP port 9222 như thiết kế của MVP.
- Quy trình phát triển và kiểm thử phiên bản web độc lập (`npm run dev`) vẫn được duy trì song song phục vụ việc phát triển tính năng mới nhanh chóng trước khi đóng gói desktop.

