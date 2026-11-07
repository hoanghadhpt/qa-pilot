# Feature Specification: Test Suite Management & AI Standardized Suite Generator

**Feature ID**: `006-test-suite-management`  
**Feature Branch**: `006-test-suite-management`  
**Created**: 2026-11-07  
**Status**: Ready for Planning  
**Input**: "nghiên cứu chức năng quản lý test suite sao cho thuận tiện sử dụng, report, hỗ trợ end user bằng việc sinh ra test suite cho 1 chức năng / module với đầy đủ các case cần thiết. Viết test case đúng tiêu chuẩn, tham khảo github xem có repo nào làm việc này ko"

---

## 1. Nghiên Cứu Hiện Trạng & Khảo Sát GitHub (GitHub Benchmarking)

Để thiết kế tính năng quản lý Test Suite và sinh tự động đạt chuẩn công nghiệp, hệ thống tham chiếu các giải pháp mã nguồn mở hàng đầu trên GitHub:

| Dự án / Repository | Lượt Sao (Stars) | Cơ Chế Cốt Lõi | Điểm Mạnh & Khuyết Điểm Cần Học Hỏi |
|---|---|---|---|
| **`kiwitcms/Kiwi`** | ~3.5k | Test Management System (TMS) mã nguồn mở bằng Python/Django | **Mạnh**: Phân cấp Test Plan -> Test Suite -> Test Case chuẩn mực.<br>**Yếu**: Nặng nề, giao diện cũ, không hỗ trợ AI sinh tự động test case. |
| **`kimatata/unittcms`** | ~1.2k | Lightweight Modern Test Case Management | **Mạnh**: Giao diện gọn gàng, tổ chức cây thư mục Module trực quan.<br>**Yếu**: Vẫn là nhập liệu thủ công, chưa có AI quét trang. |
| **`fugazi/testpilot-ai`** | ~800 | AI Crawling & Playwright Suite Generator | **Mạnh**: Tự bò vào URL để sinh Page Object Model và test suite Playwright.<br>**Yếu**: Thiếu phân loại Heuristic (bỏ sót boundary, security, idempotency). |
| **`klikagent` (mihaamiharu)** | ~600 | GitHub Issue to Playwright Generator | **Mạnh**: Đọc mô tả issue bằng ngôn ngữ tự nhiên để sinh kịch bản E2E.<br>**Yếu**: Phụ thuộc sâu vào workflow GitHub Actions. |
| **`allure-framework/allure2`** | ~4.2k | Test Reporting Framework đa ngôn ngữ | **Mạnh**: Chuẩn mực về phân loại Suite/Sub-suite, Severity (Blocker/Critical/Normal/Minor), Behaviors (Feature/Story).<br>**Học hỏi**: Áp dụng phân cấp và metadata chuẩn Allure cho hệ thống Report. |

### Đúc kết thiết kế cho QA Pilot
1. **Mô hình Test-as-Code & Zero-Database**: Lưu trữ Test Suite dưới dạng schema JSON/YAML ngay trong repo (`tests/suites/<module>/<suite-name>.yaml`), vừa có thể quản lý trực tiếp bằng file, vừa có thể render UI/HTML và chạy tự động.
2. **Tiêu chuẩn Test Case chuẩn mực (Standardized Heuristics)**:
   - Cấu trúc BDD (Behavior-Driven Development): `Given - When - Then`.
   - Phân loại theo ISTQB / SFDIPOT:
     - **Happy Path (P1)**: Luồng nghiệp vụ chuẩn thành công.
     - **Negative & Validation (P1/P2)**: Thiếu dữ liệu, dữ liệu sai định dạng, email/phone không hợp lệ.
     - **Boundary Value Analysis (BVA) & Special Characters (P2)**: Chuỗi ký tự cực đại, số 0, số âm, Naughty Strings, Unicode/emoji.
     - **Security & Permissions (P2/P3)**: Thử nghiệm XSS/SQLi payload cơ bản, truy cập trái quyền (Role check).
     - **State Idempotency & Double Submit (P2)**: Click đúp liên tục nút lưu/thanh toán, reload giữa luồng.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - AI Full-Suite Generation Cho Module/Chức Năng (Priority: P1) 🎯 MVP
Là một QA Engineer hoặc Product Owner, tôi muốn chỉ cần cung cấp URL trang web hoặc mô tả chức năng của một Module, hệ thống AI sẽ tự động phân tích và sinh ra một **Test Suite hoàn chỉnh** bao gồm đầy đủ các ca kiểm thử chuẩn mực (Happy Path, Negative, Boundary, Security) mà không cần phải viết tay từng test case.

* **Why this priority**: Giải quyết điểm nghẽn lớn nhất của QA: mất hàng giờ để nghĩ và soạn thảo kịch bản kiểm thử cho từng màn hình/tính năng.
* **Independent Test**: Người dùng gọi công cụ sinh suite cho một URL form đăng ký (`/register`), hệ thống phân tích và sinh ra ngay file suite chứa tối thiểu 6-8 test cases phân loại rõ ràng, có đầy đủ các bước `Given - When - Then`.

* **Acceptance Scenarios**:
  1. **Given** một địa chỉ URL chức năng (ví dụ trang Giỏ hàng, Đăng nhập, Tạo đơn hàng), **When** người dùng yêu cầu `qa_generate_suite({ module: "auth", url: "https://example.com/login" })`, **Then** hệ thống khám phá giao diện (semantic accessibility tree) và sinh ra Test Suite chuẩn YAML/JSON chứa các nhóm: `happy_path`, `negative_validation`, `boundary_values`, `security_check`.
  2. **Given** mô tả nghiệp vụ bằng ngôn ngữ tự nhiên (không có URL trực tiếp), **When** người dùng gọi `qa_generate_suite({ module: "checkout", prompt: "Chức năng thanh toán qua thẻ và ví điện tử, áp dụng mã giảm giá" })`, **Then** hệ thống áp dụng heuristic SFDIPOT để sinh bộ test case đầy đủ tiền điều kiện (Preconditions), dữ liệu test (Test Data) và kết quả kỳ vọng (Expected Results).

---

### User Story 2 - Quản Lý & Điều Phối Thực Thi Test Suite (Priority: P1)
Là một QA Lead hoặc Test Runner, tôi muốn tổ chức các test case thành các Test Suite phân cấp theo Module, có thể kích hoạt chạy toàn bộ Suite, chạy theo Tag (`@smoke`, `@regression`, `@p1`), hoặc chạy song song để tiết kiệm thời gian.

* **Why this priority**: Giúp đội ngũ kiểm thử dễ dàng điều phối chạy nhanh bản build mới (Smoke test 2 phút) hoặc chạy kiểm thử hồi quy đầy đủ (Full Regression).
* **Independent Test**: Chạy lệnh thực thi Suite với bộ lọc `--tags @smoke`, kiểm tra hệ thống chỉ chạy đúng các ca kiểm thử có gắn tag `@smoke` và trả về kết quả tổng hợp.

* **Acceptance Scenarios**:
  1. **Given** một Test Suite gồm 10 test cases với các tag `@smoke` và `@regression`, **When** người dùng thực thi `qa_run_suite({ suiteId: "auth-login", filterTags: ["smoke"] })`, **Then** hệ thống chỉ thực thi các test case có tag `smoke`, bỏ qua các case còn lại.
  2. **Given** một test case trong Suite cần trạng thái đăng nhập, **When** test case định nghĩa `auth_role: "admin"`, **Then** hệ thống tự động nạp Auth Session của role `admin` (Feature 005) trước khi bước vào kịch bản test.

---

### User Story 3 - Báo Cáo Tổng Hợp Cấp Suite (Aggregated Suite Report) (Priority: P2)
Là một QA Manager hoặc Tech Lead, tôi muốn xem báo cáo trực quan tổng hợp kết quả của toàn bộ Test Suite theo từng Module, bao gồm tỷ lệ Pass/Fail, thời gian thực thi, thống kê lỗi Triple-Oracle, và cho phép mở chi tiết từng bước (Step drill-down) có kèm ảnh chụp.

* **Why this priority**: Cung cấp bức tranh toàn cảnh về chất lượng sản phẩm (Release Readiness) cho ban quản lý mà không phải đọc từng log rời rạc.
* **Independent Test**: Sau khi chạy xong một Suite, mở file báo cáo `suite-report.html` hiển thị thẻ thống kê tổng quan (Pass Rate, Total Duration, Issue Breakdown) và bảng danh sách test case có thể lọc theo trạng thái Passed/Failed.

* **Acceptance Scenarios**:
  1. **Given** một Suite vừa kết thúc chạy, **When** người dùng yêu cầu xem báo cáo bằng `qa_get_suite_report()`, **Then** hệ thống xuất ra trang HTML độc lập (standalone) chứa:
     - Header tổng quan: Tên Suite, Module, Thời gian, Tỷ lệ Đạt (%).
     - Biểu đồ phân bổ trạng thái (Passed, Failed, Skipped).
     - Danh sách chi tiết từng Test Case có thể click mở rộng (Collapsible) để xem log từng bước, bằng chứng ảnh chụp (Visual evidence), và chẩn đoán lỗi Triple-Oracle.

---

### User Story 4 - Xuất Chuẩn Song Phương (Playwright Spec & IEEE 29119 Test-as-Code) (Priority: P3)
Là một Automation Engineer, tôi muốn xuất Test Suite thành mã nguồn Playwright TypeScript (`.spec.ts`) chuẩn Page Object Model hoặc file Test-as-Code YAML để commit vào Git và chạy trên CI/CD (GitHub Actions / GitLab CI).

* **Why this priority**: Đảm bảo tính mở, không bị "vendor lock-in", cho phép đội ngũ kỹ thuật tích hợp liền mạch vào hệ thống CI/CD có sẵn.
* **Independent Test**: Xuất file test case trong Suite ra định dạng Playwright, chạy trực tiếp bằng lệnh `npx playwright test` và pass mà không cần chỉnh sửa code.

* **Acceptance Scenarios**:
  1. **Given** một Test Suite đã được tạo và kiểm thử thành công, **When** người dùng gọi `qa_export_suite({ suiteId: "auth-login", format: "playwright" })`, **Then** hệ thống sinh ra file `tests/e2e/<module>/<suiteId>.spec.ts` có cấu trúc `test.describe()` và `test()` chuẩn cú pháp Playwright.

---

## 3. Tiêu Chuẩn Đặc Tả Test Case (Standardized Test Case Schema)

Mỗi Test Case do hệ thống sinh ra hoặc quản lý BẮT BUỘC tuân thủ cấu trúc chuẩn công nghiệp sau:

```yaml
id: "TC-AUTH-001"
title: "Đăng nhập thành công với thông tin hợp lệ (Happy Path)"
module: "Authentication"
suite: "Login Suite"
priority: "P1" # P1 (Critical) | P2 (High) | P3 (Medium) | P4 (Low)
type: "happy_path" # happy_path | negative_validation | boundary_value | security_probe | idempotency
tags: ["smoke", "auth", "p1"]
auth_role: "guest" # guest | admin | staff | customer (tích hợp Feature 005)
preconditions:
  - "Trình duyệt mở tại trang đăng nhập /login"
  - "Tài khoản người dùng đã được kích hoạt trong hệ thống"
steps:
  - step: 1
    action: "Nhập địa chỉ email hợp lệ vào ô Email"
    data: "testuser@example.com"
    expected: "Ô Email hiển thị địa chỉ vừa nhập, không có thông báo lỗi"
  - step: 2
    action: "Nhập mật khẩu chính xác vào ô Password"
    data: "[REDACTED_PASSWORD]"
    expected: "Mật khẩu được che giấu dưới dạng dấu sao (dot/bullet)"
  - step: 3
    action: "Click vào nút 'Đăng nhập'"
    expected: "Hiển thị biểu tượng tải hoặc chuyển hướng sau tối đa 2 giây"
assertions:
  - "URL chuyển hướng đến trang /dashboard"
  - "Tiêu đề trang chứa 'Bảng điều khiển'"
  - "Tên người dùng 'testuser' hiển thị trên góc phải màn hình"
postconditions:
  - "Phiên làm việc được thiết lập thành công"
```

---

## 4. Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Hệ thống PHẢI cung cấp công cụ `qa_generate_suite` cho phép tự động phân tích URL hoặc mô tả nghiệp vụ để sinh ra bộ Test Suite hoàn chỉnh với tối thiểu 4 nhóm heuristic (Happy Path, Negative, Boundary, Security).
- **FR-002**: Mỗi Test Case được sinh ra PHẢI có đầy đủ: `id`, `title`, `priority`, `type`, `tags`, `preconditions`, `steps` (action + data + expected), và `assertions`.
- **FR-003**: Hệ thống PHẢI hỗ trợ cấu trúc phân cấp kiểm thử theo mô hình: `Module` -> `TestSuite` -> `TestCase` -> `TestStep`.
- **FR-004**: Tất cả dữ liệu Test Suite PHẢI được lưu trữ dưới dạng file cấu trúc chuẩn Test-as-Code (YAML/JSON) tại `tests/suites/<module>/<suite-id>.yaml` (Tuân thủ Nguyên tắc II: Zero-Database Persistence).
- **FR-005**: Hệ thống PHẢI cung cấp công cụ `qa_run_suite` cho phép chạy tuần tự hoặc chọn lọc các test case trong Suite theo bộ lọc `tags` hoặc `priority`.
- **FR-006**: Khi thực thi một Test Case có yêu cầu xác thực (`auth_role`), hệ thống PHẢI tự động kích hoạt nạp phiên xác thực tương ứng từ Auth Session Manager (Feature 005).
- **FR-007**: Hệ thống PHẢI tự động sinh báo cáo trực quan tổng hợp cấp Suite (`suite-report.html`) bao gồm ma trận kết quả, tỷ lệ đạt, thời lượng, và drill-down chi tiết từng bước kèm ảnh chụp.
- **FR-008**: Báo cáo tổng hợp PHẢI tích hợp dữ liệu chẩn đoán của Triple-Oracle (Console error, Network 4xx/5xx, JS Exception, Session Expiry).
- **FR-009**: Hệ thống PHẢI hỗ trợ công cụ `qa_export_suite` để xuất Test Suite sang mã nguồn kịch bản kiểm thử tự động Playwright TypeScript (`.spec.ts`).
- **FR-010**: Tất cả mật khẩu, khóa bí mật, token trong Test Suite và Báo cáo PHẢI được che giấu thành `[REDACTED]` thông qua Redactor (Tuân thủ Nguyên tắc III).
- **FR-011**: Ngôn ngữ thể hiện trên giao diện báo cáo và công cụ PHẢI sử dụng tiếng Việt chuyên môn, trung tính, không chứa emoji trang trí hoặc từ ngữ quảng bá (Tuân thủ Nguyên tắc VI).

---

## 5. Key Entities

### Entity 1: `TestModule`
Đại diện cho một phân hệ hoặc tính năng lớn trong ứng dụng (ví dụ: `auth`, `checkout`, `product-catalog`, `user-settings`).
- Thuộc tính: `id`, `name`, `description`, `suitesCount`.

### Entity 2: `TestSuite`
Tập hợp các ca kiểm thử dành riêng cho một chức năng hoặc một quy trình nghiệp vụ cụ thể thuộc Module.
- Thuộc tính: `id`, `moduleId`, `name`, `description`, `targetUrl`, `environment`, `tags`, `cases: TestCase[]`, `createdAt`, `updatedAt`.

### Entity 3: `TestCase`
Đặc tả chi tiết của một ca kiểm thử cụ thể theo tiêu chuẩn BDD/ISTQB.
- Thuộc tính: `id`, `title`, `description`, `priority` (P1-P4), `type` (happy_path, negative, boundary, security, idempotency), `tags: string[]`, `authRole`, `preconditions: string[]`, `steps: TestStep[]`, `assertions: string[]`, `postconditions: string[]`.

### Entity 4: `TestStep`
Từng hành động tương tác trong kịch bản kiểm thử.
- Thuộc tính: `stepNumber`, `action`, `data`, `expected`, `optional`.

### Entity 5: `SuiteExecutionRun`
Phiên thực thi thực tế của một Test Suite.
- Thuộc tính: `runId`, `suiteId`, `startedAt`, `finishedAt`, `durationMs`, `totalCases`, `passedCases`, `failedCases`, `skippedCases`, `results: TestCaseResult[]`, `reportPath`.

---

## 6. Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: Quá trình tự động sinh trọn bộ Test Suite cho 1 URL/màn hình bằng AI hoàn thành trong **dưới 15 giây**, sinh ra tối thiểu **6 ca kiểm thử** bao quát đầy đủ 4 nhóm heuristic.
- **SC-002**: 100% các Test Case được sinh ra tuân thủ đúng định dạng BDD (`Given - When - Then`) và có đủ assertions rõ ràng, không có trường trống.
- **SC-003**: Người dùng có thể lọc và thực thi một tập hợp con test case (ví dụ `--tags smoke`) chỉ với một lệnh duy nhất.
- **SC-004**: Báo cáo trực quan HTML cấp Suite tổng hợp hiển thị đầy đủ tỷ lệ đạt, thời lượng, và mở được ảnh chụp màn hình từng bước bị lỗi trong **dưới 1 giây** khi mở tệp.
- **SC-005**: 100% token, mật khẩu mẫu và cookie trong Test Suite được che giấu thành `[REDACTED]`, không xuất hiện chuỗi nhạy cảm trần trong báo cáo.

---

## 7. Assumptions & Constraints

- Hệ thống tương thích với các ứng dụng Web hiện đại (SPA, SSR, Multi-page) thông qua giao thức CDP & Playwright.
- Bộ lưu trữ Suite tuân thủ triết lý Test-as-Code (tập tin YAML/JSON trên ổ đĩa), không yêu cầu cài đặt máy chủ cơ sở dữ liệu bên ngoài.
- Dữ liệu Test Data nhạy cảm trong các ca kiểm thử bảo mật (SQLi/XSS) chỉ mang tính chất thăm dò an toàn trong phạm vi môi trường kiểm thử (Staging/Local), tuân thủ nghiêm ngặt Production Safety Guardrail của Hiến pháp.
