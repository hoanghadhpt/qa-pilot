# Feature Specification: QA Pilot MVP (v0.0.1)

**Feature Branch**: `001-qa-pilot-mvp`

**Created**: 2026-10-31

**Status**: Draft

**Input**: User description: "Xây dựng QA Pilot (v0.0.1) — nền tảng kiểm thử tự động Local-first, thực thi qua CDP kết hợp Local AI CLI cho phân tích lỗi và tạo kịch bản, quản lý Test-as-Code bằng YAML và Git, bảo vệ an toàn môi trường Production, và giao diện 3 cột tối giản."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Soạn thảo và thực thi kịch bản kiểm thử với Bằng chứng trực quan & Phân tích lỗi (Priority: P1)

Là một kỹ sư QA, tôi muốn duyệt danh sách kịch bản kiểm thử, chỉnh sửa các bước kiểm thử trên giao diện tối giản, chạy toàn bộ kịch bản hoặc chạy thử từng bước, và nhận tiến trình thời gian thực kèm ảnh chụp màn hình đánh dấu vùng lỗi và phân tích nguyên nhân gốc rễ bằng tiếng Việt khi có bước thất bại.

**Why this priority**: Đây là luồng giá trị cốt lõi của **QA Pilot**, giúp QA thực thi kiểm thử tự động có bằng chứng trực quan và chẩn đoán lỗi ngay trên máy cá nhân.

**Independent Test**: Có thể kiểm thử độc lập bằng cách chọn kịch bản mẫu `TC-01` (Pass) và `TC-02` (Fail) trên `https://demoqa.com/`, bấm `Chạy kiểm thử`, quan sát trạng thái từng bước cập nhật trực tiếp, xem ảnh chụp màn hình có khung đỏ đánh dấu vùng lỗi, bấm `Áp dụng bộ chọn` nếu có gợi ý và bấm `Sao chép báo cáo` định dạng Markdown.

**Acceptance Scenarios**:

1. **Given** người dùng mở giao diện QA Pilot và chọn một kịch bản kiểm thử hợp lệ (`TC-01`), **When** người dùng bấm `Chạy kiểm thử`, **Then** hệ thống thực thi tuần tự từng bước, cập nhật trạng thái thời gian thực cho từng bước và hiển thị kết quả `PASSED` cùng tổng thời gian chạy.
2. **Given** người dùng chạy một kịch bản có bước bị lỗi (`TC-02`), **When** bước kiểm thử thất bại tại một phần tử giao diện, **Then** hệ thống chụp ảnh màn hình gốc, tạo ảnh đánh dấu khung viền đỏ nét đứt kèm nhãn lỗi tại tọa độ phần tử (hoặc vùng chứa gần nhất), thu thập lỗi Console/Network, hiển thị phân tích nguyên nhân bằng tiếng Việt và đề xuất bộ chọn thay thế (nếu có).
3. **Given** người dùng đang chỉnh sửa một bước kiểm thử trong trình soạn thảo, **When** người dùng đánh dấu bước đó là `Bước tùy chọn` (không bắt buộc) và bước đó không tìm thấy phần tử sau khoảng thời gian chờ (`timeout_ms`), **Then** hệ thống ghi nhận cảnh báo nhưng vẫn tiếp tục thực thi các bước tiếp theo mà không làm thất bại toàn bộ kịch bản.
4. **Given** một lần chạy kiểm thử thất bại có đầy đủ bằng chứng và phân tích lỗi, **When** người dùng bấm `Sao chép báo cáo`, **Then** toàn bộ thông tin lỗi, các bước tái hiện, log lỗi và nhận định được sao chép vào clipboard dưới dạng Markdown.

---

### User Story 2 - Bảo vệ an toàn môi trường Production và Quản lý biến mật (Priority: P1)

Là một kỹ sư QA, tôi muốn chuyển đổi giữa các môi trường (`Local`, `Staging`, `Production`), sử dụng biến môi trường và biến mật trong kịch bản kiểm thử mà không bị lộ giá trị nhạy cảm ra log hoặc ngữ cảnh AI, đồng thời hệ thống tự động chặn các kịch bản có tính phá hủy trên môi trường `Production`.

**Why this priority**: Đảm bảo an toàn vận hành khi chạy kiểm thử trên môi trường thật và bảo mật thông tin đăng nhập của dự án.

**Independent Test**: Có thể kiểm thử độc lập bằng cách chuyển bộ chọn môi trường sang `Production`, kiểm tra viền cảnh báo đỏ trên thanh điều hướng, xác nhận nút `Chạy kiểm thử` bị vô hiệu hóa đối với các kịch bản gắn nhãn `destructive`/`financial`/`data-creation`, và kiểm tra tệp kết quả chạy để xác nhận mật khẩu được che thành `[REDACTED]`.

**Acceptance Scenarios**:

1. **Given** người dùng chọn môi trường `Production` trên thanh điều hướng, **When** kịch bản hiện tại có gắn nhãn `destructive`, `financial`, hoặc `data-creation` (hoặc nằm trong danh sách chặn của môi trường), **Then** giao diện hiển thị viền cảnh báo đỏ, gắn nhãn `Bị chặn trên Prod`, vô hiệu hóa nút `Chạy kiểm thử` kèm chú thích lý do chặn, và từ chối mọi yêu cầu thực thi kịch bản đó ở tầng xử lý.
2. **Given** một bước kiểm thử sử dụng biến mật `${secret.STANDARD_PASSWORD}` hoặc được đánh dấu `sensitive: true`, **When** kịch bản được thực thi và ghi lại nhật ký/báo cáo hoặc gửi dữ liệu sang AI để phân tích lỗi, **Then** mọi giá trị thực của biến mật đều được thay thế hoàn toàn bằng `[REDACTED]`.
3. **Given** dự án có cấu hình biến theo thứ tự phân tầng (Fixtures chung -> Cấu hình môi trường `local/staging/production` -> Biến mật cục bộ `.env.local`), **When** kịch bản tham chiếu đến `${env.BASE_URL}` hoặc `${secret.X}`, **Then** hệ thống phân giải đúng giá trị tương ứng với môi trường đang chọn.

---

### User Story 3 - Tạo kịch bản kiểm thử từ tài liệu và hình ảnh giao diện (Priority: P2)

Là một kỹ sư QA, tôi muốn tải lên ảnh thiết kế giao diện kết hợp với tiêu chí nghiệm thu dạng văn bản để hệ thống tạo danh sách kịch bản kiểm thử (bao gồm luồng hợp lệ và luồng ngoại lệ) và lưu vào dự án.

**Why this priority**: Giảm thời gian viết kịch bản kiểm thử mới từ tài liệu yêu cầu và thiết kế.

**Independent Test**: Có thể kiểm thử độc lập bằng cách bấm nút `Tạo kịch bản`, tải lên một tệp ảnh thiết kế cùng mô tả yêu cầu, xem danh sách kịch bản được tạo ra và lưu vào cây thư mục kịch bản của dự án.

**Acceptance Scenarios**:

1. **Given** người dùng mở hộp thoại `Tạo kịch bản`, **When** người dùng tải lên hình ảnh giao diện và nhập tiêu chí nghiệm thu rồi bấm `Tạo`, **Then** hệ thống phân tích và trả về danh sách các kịch bản kiểm thử bao gồm trường hợp hợp lệ và trường hợp ngoại lệ đúng cấu trúc chuẩn.
2. **Given** danh sách kịch bản đề xuất đang hiển thị trên hộp thoại, **When** người dùng xác nhận lưu các kịch bản đã chọn, **Then** hệ thống tạo các tệp kịch bản tương ứng trong dự án và hiển thị ngay trên danh sách ở cột bên trái.

---

### User Story 4 - Đồng bộ kịch bản kiểm thử qua Git và Giải quyết xung đột (Priority: P3)

Là một thành viên trong nhóm QA cùng làm việc trên một kho kịch bản kiểm thử, tôi muốn xem trạng thái đồng bộ với kho lưu trữ chung (`Ahead`/`Behind`), đồng bộ kịch bản, và giải quyết xung đột theo từng bước kiểm thử trên giao diện khi hai người cùng sửa một kịch bản.

**Why this priority**: Hỗ trợ làm việc nhóm theo mô hình Test-as-Code mà không bắt buộc thao tác lệnh Git thủ công.

**Independent Test**: Có thể kiểm thử độc lập bằng cách chỉnh sửa và lưu một kịch bản, kiểm tra trạng thái Git trên thanh tiêu đề, bấm `Đồng bộ` và mô phỏng xung đột để kiểm tra hộp thoại so sánh khác biệt theo từng bước.

**Acceptance Scenarios**:

1. **Given** người dùng đã chỉnh sửa và lưu một kịch bản kiểm thử, **When** người dùng bấm `Đồng bộ` trên thanh tiêu đề và không có xung đột, **Then** hệ thống tự động kéo bản mới nhất về, lưu lịch sử thay đổi và đẩy lên kho lưu trữ chung, cập nhật trạng thái `Behind: 0, Ahead: 0`.
2. **Given** kịch bản kiểm thử vừa sửa có xung đột với thay đổi từ thành viên khác trên kho chung, **When** quá trình đồng bộ phát hiện xung đột, **Then** hệ thống hiển thị hộp thoại giải quyết xung đột theo từng bước kiểm thử để người dùng chọn giữ phiên bản cục bộ hoặc phiên bản từ kho chung.

---

### Edge Cases

- **Mục tiêu nằm ngoài tên miền cho phép trên Production**: Khi môi trường đang là `Production` và một bước kiểm thử cố gắng mở một địa chỉ URL không nằm trong danh sách tên miền được phép của môi trường đó, hệ thống phải chặn thực thi ngay lập tức.
- **Tiến trình AI CLI cục bộ không phản hồi hoặc chưa được cài đặt**: Khi quá trình phân tích nguyên nhân gốc rễ hoặc tạo kịch bản gọi AI CLI cục bộ bị quá thời gian chờ hoặc thiếu công cụ CLI, hệ thống vẫn phải lưu đầy đủ bằng chứng hình ảnh/log của lần chạy test và hiển thị thông báo rõ ràng.
- **Tệp kịch bản bị lỗi cú pháp**: Khi một tệp kịch bản trên đĩa bị chỉnh sửa thủ công sai định dạng hoặc thiếu trường bắt buộc, hệ thống phải báo lỗi rõ ràng cho từng tệp bị hỏng mà không làm gián đoạn việc tải danh sách các kịch bản hợp lệ khác.
- **Ngắt kết nối giữa chừng khi đang xem tiến trình trực tiếp**: Khi trình duyệt bị làm mới hoặc mất kết nối luồng sự kiện trong lúc kịch bản đang chạy, kết quả cuối cùng vẫn phải được ghi nhận đầy đủ vào thư mục lịch sử chạy để người dùng xem lại ngay khi kết nối lại.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống PHẢI lưu trữ toàn bộ kịch bản kiểm thử, cấu hình môi trường và dữ liệu mẫu dưới dạng tệp văn bản có cấu trúc ngay trong thư mục dự án mà không phụ thuộc vào hệ quản trị cơ sở dữ liệu bên ngoài.
- **FR-002**: Hệ thống PHẢI hỗ trợ cấu trúc kịch bản kiểm thử bao gồm: mã định danh (`id`), tiêu đề (`title`), mô tả (`description`), danh sách nhãn (`tags`), quy tắc môi trường (`allowed`/`blocked`), danh sách bước thực hiện (`steps`: `open`, `input`, `click`, `assert`, kèm thuộc tính `optional`, `sensitive`, `timeout_ms`) và các điều kiện kiểm chứng (`assertions`: `element_visible`, `no_console_errors`).
- **FR-003**: Hệ thống PHẢI thực thi kịch bản theo mô hình kết hợp: thực thi các bước thao tác trình duyệt qua giao thức CDP, đồng thời kích hoạt tiến trình AI cục bộ độc lập ở chế độ không tương tác khi cần phân tích nguyên nhân lỗi hoặc tạo kịch bản mới.
- **FR-004**: Hệ thống PHẢI truyền ngữ cảnh tinh gọn cho AI bao gồm cây ngữ nghĩa truy cập (Accessibility Tree), danh sách lỗi Console phát sinh và các yêu cầu mạng thất bại; TUYỆT ĐỐI KHÔNG gửi toàn bộ mã nguồn HTML thô vào ngữ cảnh AI.
- **FR-005**: Hệ thống PHẢI phát luồng trạng thái thực thi theo thời gian thực tới giao diện người dùng cho từng bước kiểm thử đang chạy, cho phép dừng lần chạy đang diễn ra (`Dừng`), chuyển đổi chế độ trình duyệt hiện hình/chạy ngầm (`Hiện trình duyệt` / `Chạy ngầm`), tự động khởi chạy hoặc kết nối phiên trình duyệt cố định (giữ trạng thái giữa các lần chạy thử từng bước `Chạy bước này`) và hiển thị trạng thái kết nối trình duyệt trên thanh tiêu đề.
- **FR-006**: Khi một bước kiểm thử bắt buộc bị thất bại, hệ thống PHẢI chụp ảnh màn hình gốc và tạo thêm một ảnh chụp màn hình đã được chú thích với khung chữ nhật viền đỏ nét đứt bao quanh vùng lỗi kèm nhãn mô tả nguyên nhân lỗi (nếu phần tử đích không tồn tại, hệ thống định vị vùng chứa gần nhất hoặc phần tử thao tác liền trước để vẽ khung lỗi), đồng thời đề xuất bộ chọn thay thế (`suggestedSelector`) từ cây ngữ nghĩa để người dùng bấm `Áp dụng bộ chọn`.
- **FR-007**: Hệ thống PHẢI cung cấp cơ chế phân giải biến theo thứ tự ưu tiên từ dữ liệu mẫu chung, cấu hình môi trường (`local`, `staging`, `production`) đến tệp biến mật cục bộ, đồng thời cung cấp menu `Chèn biến` (`${secret.X}`, `${faker.email}`) ngay trong trình soạn thảo bước kiểm thử.
- **FR-008**: Hệ thống PHẢI tự động che (redact) mọi giá trị thuộc danh sách biến mật hoặc bước được đánh dấu nhạy cảm thành `[REDACTED]` trước khi ghi xuống tệp kết quả, phát qua luồng sự kiện hoặc đưa vào lời nhắc cho AI.
- **FR-009**: Hệ thống PHẢI áp dụng rào chắn an toàn cho môi trường `Production`: tự động chặn việc chạy các kịch bản có nhãn `destructive`, `financial`, `data-creation` hoặc truy cập tên miền ngoài danh sách cho phép, đồng thời hiển thị cảnh báo màu đỏ trên giao diện.
- **FR-010**: Giao diện **QA Pilot** PHẢI được tổ chức theo bố cục 3 cột gồm:
  1. **Cột 1 (Danh sách kịch bản)**: Tìm kiếm theo mã/tiêu đề, cây danh mục kịch bản, nhãn trạng thái (`Passed`/`Failed`/`Untested`), nhãn an toàn Production (`An toàn Prod`/`Bị chặn trên Prod`) và nút `Tạo kịch bản`.
  2. **Cột 2 (Trình soạn thảo bước kiểm thử)**: Thanh công cụ (`Chạy kiểm thử`, `Dừng`, `Lưu`), danh sách thẻ bước kiểm thử chỉnh sửa trực tiếp (ẩn tự động các ô nhập liệu không áp dụng cho hành động đang chọn), tuỳ chọn `Bước tùy chọn`, nút `Chạy bước này`, thêm mới và sắp xếp lại thứ tự bước.
  3. **Cột 3 (Bằng chứng & Phân tích lỗi)**: Dòng thời gian thực thi, trình xem ảnh chụp màn hình hỗ trợ phóng to và nút bật/tắt `Hiển thị vùng lỗi`, bảng nhật ký lỗi Console/Network, thẻ phân tích nguyên nhân bằng tiếng Việt và nút `Sao chép báo cáo`.
- **FR-011**: Hệ thống PHẢI cung cấp tính năng tạo kịch bản kiểm thử từ hình ảnh thiết kế và văn bản tiêu chí nghiệm thu để nhận về danh sách kịch bản kiểm thử (Happy Paths & Negative Cases).
- **FR-012**: Hệ thống PHẢI tích hợp quản lý phiên bản Git cho các tệp kịch bản kiểm thử (hiển thị số lượng thay đổi `Ahead`/`Behind`, nút `Đồng bộ`, và hộp thoại giải quyết xung đột theo từng bước kiểm thử khi xảy ra xung đột).
- **FR-013**: Hệ thống PHẢI loại trừ toàn bộ thư mục lưu trữ kết quả chạy kiểm thử, tệp tải lên tạm thời, ảnh chụp màn hình và tệp biến mật cục bộ khỏi lịch sử quản lý phiên bản Git.
- **FR-014 (Quy tắc văn bản & Giao diện tối giản)**: Toàn bộ văn bản trên giao diện PHẢI ngắn gọn, trực diện, chỉ mô tả đúng chức năng kỹ thuật; TUYỆT ĐỐI KHÔNG sử dụng biểu tượng emoji hoặc các từ ngữ quảng cáo/cường điệu (như "1-click", "thông minh", "siêu tốc", "tự chữa lành", "ma thuật").

### Key Entities

- **Project (Dự án kiểm thử)**: Đơn vị tổ chức độc lập chứa các cấu hình môi trường, dữ liệu mẫu (`fixtures`) và danh sách các kịch bản kiểm thử (`specs`).
- **Environment Config (Cấu hình môi trường)**: Định nghĩa thông số cho từng môi trường (`local`, `staging`, `production`), bao gồm địa chỉ cơ sở (`BASE_URL`), cờ đánh dấu môi trường thật (`is_production`), danh sách tên miền cho phép và các biến môi trường.
- **Test Specification (Kịch bản kiểm thử)**: Tệp định nghĩa một kịch bản kiểm thử gồm thông tin định danh, nhãn phân loại, quy tắc môi trường được phép/bị chặn, danh sách các bước thao tác tuần tự (`Step`) và các điều kiện kiểm chứng (`Assertion`).
- **Test Run Summary & Evidence (Kết quả & Bằng chứng lần chạy)**: Bản ghi kết quả của một lần thực thi kịch bản, bao gồm trạng thái chung, thời gian chạy, kết quả từng bước, ảnh chụp màn hình gốc và ảnh đã đánh dấu vùng lỗi, danh sách lỗi Console/Network và kết quả phân tích nguyên nhân từ AI (`aiDiagnosis`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Kỹ sư QA có thể tạo mới hoặc chỉnh sửa một kịch bản kiểm thử trên giao diện, bấm chạy và nhận được phản hồi trạng thái bước đầu tiên trên màn hình trong vòng dưới 2 giây.
- **SC-002**: 100% các kịch bản gắn nhãn `destructive`, `financial`, hoặc `data-creation` đều bị chặn tự động cả trên giao diện lẫn tầng xử lý khi môi trường được chọn là `Production`.
- **SC-003**: 100% giá trị biến mật trong tệp cấu hình bí mật cục bộ không bao giờ xuất hiện dưới dạng văn bản thuần trong tệp kết quả chạy, nhật ký lỗi hay nội dung gửi cho AI.
- **SC-004**: Khi một kịch bản kiểm thử thất bại, hệ thống tạo đầy đủ bộ bằng chứng (ảnh gốc, ảnh đóng khung đỏ vùng lỗi, nhật ký Console/Network và phân tích nguyên nhân bằng tiếng Việt) và cho phép sao chép báo cáo lỗi hoàn chỉnh.
- **SC-005**: 100% nhãn giao diện, nút bấm và thông báo tuân thủ quy tắc tối giản: không chứa emoji và không chứa từ ngữ cường điệu.

## Assumptions

- Máy trạm chạy **QA Pilot** là môi trường phát triển/kiểm thử cục bộ (Local-first) đã cài đặt sẵn trình duyệt Chrome/Chromium phục vụ kiểm thử tự động qua CDP, công cụ quản lý phiên bản Git và ít nhất một công cụ AI CLI cục bộ (`claude`, `agy`, hoặc `gemini`).
- Trang đích kiểm thử mẫu trong quá trình phát triển và nghiệm thu là `https://demoqa.com/`.
- Phiên bản MVP (`v0.0.1`) tập trung vào trải nghiệm chạy trên máy cục bộ cho từng thành viên QA và phối hợp nhóm thông qua kho lưu trữ Git chung.
