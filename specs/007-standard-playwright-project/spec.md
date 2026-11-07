# Feature Specification: Standard Playwright E2E Framework Architecture

**Feature ID**: `007-standard-playwright-project`  
**Feature Branch**: `007-standard-playwright-project`  
**Created**: 2026-11-07  
**Status**: Ready for Implementation  
**Input**: "kiểm tra các cấu trúc 1 project e2e của playwright xem người ta làm như thế nào trên github (theo lượng sao) tổng hợp lại để ra 1 cấu trúc tiêu chuẩn, tester đễ dàng implement thêm"

---

## 1. Mục Tiêu & Bối Cảnh (Context & Objectives)

Khi các nhóm QA và kỹ sư kiểm thử tự động (Automation Testers) xây dựng dự án E2E bằng Playwright, họ thường gặp các vấn đề lớn:
1. **Mã nguồn bị phân mảnh**: Viết locators trực tiếp trong file kịch bản `.spec.ts`, dẫn đến việc UI chỉ cần đổi một class hay id là phải sửa hàng chục file.
2. **Khởi tạo đối tượng thủ công (Boilerplate Toil)**: Mỗi ca test đều phải lặp đi lặp lại `const loginPage = new LoginPage(page); await loginPage.goto();...` thay vì sử dụng cơ chế Dependency Injection của Playwright Fixtures.
3. **Lặp lại đăng nhập (Auth Overhead)**: 100 ca test thực hiện 100 lần login qua giao diện, gây chậm và dễ dính CAPTCHA/Rate limit.
4. **Data rác và phụ thuộc lẫn nhau**: Test case này phụ thuộc vào dữ liệu do test case trước tạo ra, gây lỗi chập chờn (flaky tests) khi chạy song song.

Dự án này thiết lập **Cấu trúc Dự án Playwright E2E Tiêu Chuẩn Công Nghiệp (Standardized Enterprise Playwright Architecture)** được tổng hợp từ các repo mã nguồn mở nhiều sao nhất trên GitHub (`microsoft/playwright`, `angelo-loria/playwright-boilerplate`, `ortoniKC/playwright-ts-boilerplate`, `pajdekPL/pw_structure`), giúp bất kỳ tester nào cũng có thể thêm mới test case, page object, hoặc fixture chỉ trong vài phút.

---

## 2. Khảo Sát GitHub & Đúc Kết Mẫu Thiết Kế (GitHub Benchmarking)

| Dự án / Repo | Stars | Kiến trúc cốt lõi | Đúc kết áp dụng cho QA Pilot |
|---|---|---|---|
| **`microsoft/playwright`** | ~65k | Source of truth, custom test fixture extension | Dùng **Fixtures (`base.extend`)** thay cho `beforeEach` truyền thống. Tự động inject Page Objects vào test. |
| **`angelo-loria/playwright-boilerplate`** | ~1.4k | Clean POM, component splitting, Axe accessibility | Tách riêng `pages/components/` (Header, Navbar, Modal) khỏi `pages/` (màn hình chính). |
| **`ortoniKC/playwright-ts-boilerplate`** | ~800 | Dynamic environments, storageState auth reuse | Dùng setup project trong `playwright.config.ts` để lưu `storageState` 1 lần và tái sử dụng cho mọi worker. |
| **`pajdekPL/pw_structure`** | ~600 | Type-safe models, API request contexts, data builders | Tích hợp data factory sinh dữ liệu sạch ngẫu nhiên, không hardcode test data. |
| **`vitalets/playwright-bdd`** | ~900 | BDD Gherkin integration with Playwright runner | Hỗ trợ kịch bản Given-When-Then tự nhiên cho tester phi kỹ thuật. |

---

## 3. Cấu Trúc Thư Mục Tiêu Chuẩn (Standard Directory Layout)

```text
tests/
├── e2e/                           # Kịch bản kiểm thử E2E phân theo module
│   ├── auth/                      # Module xác thực
│   │   ├── login.spec.ts
│   │   └── register.spec.ts
│   ├── checkout/                  # Module giỏ hàng & thanh toán
│   │   └── cart.spec.ts
│   └── settings/                  # Module cấu hình người dùng
│       └── profile.spec.ts
├── pages/                         # Page Object Model (POM)
│   ├── base.page.ts               # Lớp nền: chứa các tiện ích chung, wait, toast, modal
│   ├── components/                # Các thành phần tái sử dụng giữa các trang
│   │   ├── navbar.component.ts    # Thanh điều hướng, menu
│   │   ├── notification.component.ts # Toast / Alert notifications
│   │   └── confirm-dialog.component.ts # Hộp thoại xác nhận (Modal)
│   ├── login.page.ts              # Page Object đăng nhập
│   ├── register.page.ts           # Page Object đăng ký
│   └── dashboard.page.ts          # Page Object bảng điều khiển
├── fixtures/                      # Custom Test Fixtures (Dependency Injection)
│   └── test.fixture.ts            # Extend base test: tự động inject loginPage, dashboardPage, v.v.
├── data/                          # Test data & factories
│   ├── users.data.ts              # Tài khoản mẫu theo vai trò (admin, staff, customer)
│   └── data-factory.ts            # Sinh dữ liệu ngẫu nhiên (email, phone, text, BVA payloads)
├── fixtures/auth/                 # Session Storage Profiles (.gitignore)
│   ├── admin.json
│   └── customer.json
├── utils/                         # Tiện ích bổ trợ
│   ├── redactor.util.ts           # Che giấu mật khẩu, token
│   └── date.util.ts               # Định dạng ngày giờ
├── suites/                        # Test-as-Code YAML suites (Feature 006)
│   └── auth/
│       └── auth-login.yaml
playwright.config.ts               # Cấu hình Playwright trung tâm
```

---

## 4. User Scenarios & Acceptance Criteria

### User Story 1 - Viết Test Case Dễ Dàng Với Fixtures Tự Động (Priority: P1) 🎯 MVP
Là một Automation Tester, tôi muốn khi viết kịch bản test mới (`.spec.ts`), tôi chỉ cần khai báo tên Page Object trong tham số test (ví dụ `{ loginPage, dashboardPage }`), hệ thống tự động khởi tạo đối tượng trang mà không cần tôi phải `new` hoặc gọi `beforeEach`.

* **Acceptance Criteria**:
  1. File `tests/fixtures/test.fixture.ts` cung cấp biến `test` mở rộng (`base.extend<PageFixtures>`).
  2. Trong file spec, tester viết:
     ```typescript
     import { test, expect } from '../../fixtures/test.fixture';
     test('Đăng nhập thành công', async ({ loginPage, dashboardPage }) => {
       await loginPage.navigate();
       await loginPage.login('user@example.com', 'password');
       await expect(dashboardPage.welcomeHeader).toBeVisible();
     });
     ```
  3. Không cần bất kỳ lệnh khởi tạo `new LoginPage(page)` nào trong file test.

---

### User Story 2 - Tái Sử Dụng Page Object Model & Components Chuẩn (Priority: P1)
Là một Tester/Developer, tôi muốn các Page Object được xây dựng trên `BasePage`, sử dụng chuẩn locator hướng người dùng của Playwright (`getByRole`, `getByLabel`, `getByTestId`), phân tách rõ ràng các Component chung (Navbar, Toast, Modal) để khi giao diện thay đổi chỉ cần sửa tại 1 nơi duy nhất.

* **Acceptance Criteria**:
  1. `BasePage` cung cấp các phương thức cốt lõi: `waitForUrl()`, `getToastMessage()`, `waitForLoaded()`, `clickSafely()`.
  2. Mọi Page Object đều kế thừa từ `BasePage`.
  3. Các thành phần giao diện xuất hiện trên nhiều trang (Navbar, Notification) được tách thành lớp con trong `src/pages/components/` và nhúng vào `BasePage` để dùng được ở mọi nơi.

---

### User Story 3 - Tự Động Hóa Dữ Liệu Kiểm Thử & An Toàn Bảo Mật (Priority: P2)
Là một QA Lead, tôi muốn hệ thống cung cấp bộ sinh dữ liệu ngẫu nhiên (`data-factory`) để tránh việc chạy lặp lại bị trùng lặp dữ liệu, đồng thời tự động che giấu các mật khẩu và token nhạy cảm trong log và báo cáo.

* **Acceptance Criteria**:
  1. `DataFactory` cung cấp các hàm tiện ích: `generateUser()`, `generateEmail()`, `generateBoundaryString(len)`, `generateNaughtyString()`.
  2. Các giá trị mật khẩu sinh ra tự động đăng ký với `globalRedactor` để không bị lộ ra ngoài log.

---

### User Story 4 - Cấu Hình Chạy Đa Môi Trường & CI/CD Sẵn Sàng (Priority: P2)
Là một DevOps/CI Engineer, tôi muốn file `playwright.config.ts` tự động nhận diện môi trường (Local vs CI), cấu hình sharding song song, tự động kích hoạt lưu vết Trace/Screenshot khi thất bại, và hỗ trợ chạy thử nghiệm đa trình duyệt (Chromium, Firefox, WebKit).

* **Acceptance Criteria**:
  1. `playwright.config.ts` hỗ trợ biến môi trường `BASE_URL` và `CI`.
  2. Tự động kích hoạt cơ chế `trace: 'on-first-retry'` và `screenshot: 'only-on-failure'` để tiết kiệm tài nguyên.
  3. Cung cấp file cấu hình mẫu GitHub Actions CI (`.github/workflows/e2e-playwright.yml`) chạy sharding song song và tự động xuất báo cáo Allure/HTML.

---

## 5. Requirements *(mandatory)*

- **FR-001**: Hệ thống PHẢI thiết lập cấu trúc thư mục kiểm thử chuẩn hóa gồm: `tests/pages/`, `tests/pages/components/`, `tests/fixtures/`, `tests/data/`, `tests/e2e/`.
- **FR-002**: Lớp `BasePage` PHẢI đóng gói các thao tác kiểm thử phổ quát và tích hợp sẵn `NavbarComponent` cùng `NotificationComponent`.
- **FR-003**: Hệ thống PHẢI cung cấp `test.fixture.ts` mở rộng Playwright `test` để tự động hóa Dependency Injection cho tất cả các Page Object.
- **FR-004**: Locators trong tất cả Page Object PHẢI ưu tiên tuyệt đối các bộ định vị ngữ nghĩa hướng người dùng: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByTestId`, không dùng CSS selector tĩnh dễ vỡ.
- **FR-005**: Tích hợp trực tiếp với bộ quản lý phiên đăng nhập `AuthSessionManager` (Feature 005) để hỗ trợ `storageState` tái sử dụng, không đăng nhập UI lặp lại.
- **FR-006**: File cấu hình `playwright.config.ts` PHẢI thiết lập sẵn reporting, artifacts capture khi fail, và cấu hình chạy đa môi trường.
- **FR-007**: Hệ thống PHẢI đi kèm kịch bản CI/CD mẫu cho GitHub Actions hỗ trợ cache dependencies và upload artifacts báo cáo.
- **FR-008**: Tất cả văn bản hướng dẫn và mẫu kịch bản PHẢI tuân thủ ngôn ngữ trung tính, không sử dụng emoji trang trí trong code và báo cáo chính thống (Tuân thủ Nguyên tắc VI của Hiến pháp).

---

## 6. Success Criteria *(mandatory)*

- **SC-001**: Một tester mới có thể tạo thêm một test case E2E hoàn chỉnh chỉ với **dưới 10 dòng mã nguồn** bằng cách sử dụng Fixtures có sẵn.
- **SC-002**: Tốc độ thực thi bộ kiểm thử tăng ít nhất **50%** nhờ việc tái sử dụng `storageState` thay vì đăng nhập qua UI ở từng ca test.
- **SC-003**: 100% các ca test trong framework chạy độc lập (Isolated), có thể chạy theo bất kỳ thứ tự nào hoặc chạy song song 10 workers mà không bị xung đột dữ liệu.
- **SC-004**: Khi một phần tử giao diện thay đổi (ví dụ nút Submit đổi nhãn hoặc vị trí), kỹ sư chỉ cần cập nhật đúng **1 dòng mã** trong Page Object tương ứng, toàn bộ các test case liên quan tự động hoạt động bình thường.
