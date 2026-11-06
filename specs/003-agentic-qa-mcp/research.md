# Research & Technical Decisions: QA Pilot Refactor (Agentic MCP & Midscene Engine)

## Executive Summary

MVP ban đầu của QA Pilot (v0.0.1) được thiết kế theo mô hình Web Application truyền thống: máy chủ Express (cổng 4000), giao diện React Ant Design (cổng 3000), điều khiển CDP cấp thấp và gọi Local CLI subprocess trong chế độ `-p`. Khi người dùng muốn tương tác và kiểm thử trực tiếp thông qua Chat trong Antigravity IDE, kiến trúc cũ bộc lộ nhiều hạn chế:
1. Thiếu giao thức chuẩn để Antigravity Agent gọi lệnh trực tiếp (không có MCP Server chuyên dụng cho QA flow).
2. Tương tác dựa trên CDP a11y tree thuần túy rất dễ gãy (flaky) khi gặp giao diện động, thiếu năng lực cảm nhận thị giác (Visual Perception).
3. Người dùng phải chuyển qua lại giữa cửa sổ Chat IDE và trình duyệt web `localhost:3000`.

Bản refactor này tái cấu trúc hệ thống thành **Antigravity-Native Agentic QA Platform**:
- Đóng gói toàn bộ năng lực kiểm thử thành **QA-Pilot MCP Server** và **Antigravity Custom Skill**.
- Tích hợp engine **`@midscene/web`** (dựa trên Playwright) để mang lại khả năng thao tác web và assertion bằng ngôn ngữ tự nhiên, tự phục hồi selector và tự động xuất báo cáo visual tương tác.
- Tự động xuất chuỗi thao tác thành mã kiểm thử Playwright (`.spec.ts`) hoặc YAML để đưa vào CI/CD pipeline.

---

## Technical Decisions

### Decision 1: Chuyển đổi sang kiến trúc MCP Server + Antigravity Skill
- **Decision**: Loại bỏ backend Express và frontend React độc lập. Xây dựng một MCP Server chuẩn (`packages/mcp-server` hoặc `server/mcp`) chạy qua `stdio` sử dụng `@modelcontextprotocol/sdk`, đồng thời tạo Skill trong `.agents/skills/qa-pilot/SKILL.md`.
- **Rationale**:
  - Antigravity kết nối trực tiếp với MCP Server qua `.mcp.json`.
  - Toàn bộ giao diện tương tác là cửa sổ Chat của Antigravity; người dùng chỉ cần ra lệnh tự nhiên.
  - Antigravity tự động kích hoạt Skill và chọn đúng công cụ MCP tương ứng cho từng bước kiểm thử.
- **Alternatives considered**:
  - *Giữ nguyên Web Dashboard và mở thêm REST API*: Gây cồng kềnh, phân tán trải nghiệm, buộc người dùng phải chạy 2 tiến trình nền trước khi chat.
  - *Chỉ dùng Chrome DevTools MCP gốc*: Cấp độ quá thấp (chỉ có click tọa độ thô, không có logic tự phục hồi, không có semantic assert bằng ngôn ngữ tự nhiên, không có báo cáo trực quan).

---

### Decision 2: Sử dụng `@midscene/web` làm Lõi Nhận Diện & Thực Thi (Perception & Execution Engine)
- **Decision**: Sử dụng `@midscene/web` (v1.17+) kết hợp Playwright Chromium làm engine thực thi chính.
- **Rationale**:
  - **Natural Language Actions (`aiAction`)**: Nhận diện phần tử web bằng thị giác máy tính và ngữ nghĩa (ví dụ: "click nút Đăng ký màu xanh", "nhập email vào ô Tài khoản") mà không phụ thuộc vào XPath hay ID động.
  - **Natural Language Assertions (`aiAssert`)**: Kiểm tra logic trực quan trên trang (ví dụ: "xác nhận thông báo lỗi xuất hiện") trả về boolean kèm giải thích chi tiết.
  - **Visual Playground & Report**: Tự động sinh báo cáo HTML chi tiết với timeline, ảnh chụp trước/sau và vị trí click chuột mà không cần code thêm bộ vẽ SVG thủ công.
  - **Token Efficiency**: Midscene tối ưu hóa việc nén DOM và tọa độ hiển thị, giảm thiểu số lượng token gửi lên LLM so với việc gửi raw HTML.
- **Alternatives considered**:
  - *Tự viết logic xử lý CDP + Sharp*: Tốn nhiều thời gian, dễ sinh lỗi khi gặp responsive layout, shadow DOM hoặc iframe.
  - *Stagehand*: Cực tốt nhưng phụ thuộc nhiều vào hạ tầng cloud của Browserbase, trong khi Midscene hoàn toàn local-first và hỗ trợ Playwright cục bộ mượt mà.

---

### Decision 3: Cơ chế Bảo vệ An toàn Môi trường & Che giấu Biến mật
- **Decision**: Triển khai tầng middleware bảo vệ (Security Guardrails) trực tiếp trong MCP Server:
  1. **Production Guardrail**: Khi URL đích thuộc danh sách `is_production: true` hoặc chứa tên miền ngoài whitelist, MCP Server sẽ chặn ngay lập tức bất kỳ action nào chứa từ khóa phá hủy (`destructive`, `delete`, `drop`, `payment`, `checkout`) trừ khi có xác nhận tường minh.
  2. **Secret Redaction**: Tự động nạp `.env.local` vào bộ nhớ an toàn; mọi chuỗi giá trị nhạy cảm (mật khẩu, tokens) xuất hiện trong log, prompt hoặc report đều bị thay thế bằng `[REDACTED]`.
- **Rationale**: Duy trì và củng cố Nguyên tắc III trong Hiến pháp dự án (Constitution III).
- **Alternatives considered**:
  - Dựa vào prompt của AI để bảo vệ: Không đảm bảo độ tin cậy tuyệt đối vì LLM có thể bị jailbreak hoặc ảo giác.

---

### Decision 4: Xuất Kịch Bản Kiểm Thử Test-as-Code (Playwright TS / YAML)
- **Decision**: Sau khi người dùng khám phá và kiểm thử thành công một luồng qua chat, công cụ `qa_export_test` sẽ phân tích lịch sử các bước (actions & asserts) và biên dịch thành:
  1. File mã nguồn Playwright TypeScript (`tests/e2e/<test_name>.spec.ts`) chuẩn Page Object Model hoặc kịch bản độc lập.
  2. File kịch bản YAML (`tests/specs/<test_name>.yaml`) tương thích với runner chạy định kỳ trong CI/CD.
- **Rationale**: Đảm bảo nguyên tắc Test-as-Code (Constitution II), giúp kết quả kiểm thử qua chat được lưu trữ vào Git repo và chạy lại tự động trong CI/CD mà không tốn chi phí gọi LLM.
- **Alternatives considered**:
  - Chỉ lưu log JSON: Không thể chạy lại tự động trong các môi trường CI không có AI.

---

## Best Practices & Integration Patterns

1. **MCP Tool Granularity**:
   - `qa_launch_browser(headless?: boolean, cdpPort?: number)`: Khởi tạo phiên trình duyệt.
   - `qa_navigate(url: string)`: Điều hướng đến trang web mục tiêu.
   - `qa_act(action: string)`: Thực thi hành động bằng ngôn ngữ tự nhiên.
   - `qa_assert(assertion: string)`: Xác thực trạng thái/giao diện bằng ngôn ngữ tự nhiên.
   - `qa_inspect()`: Chụp màn hình và tóm tắt các interactive elements hiện tại.
   - `qa_export_test(name: string, format: 'playwright' | 'yaml')`: Xuất file kịch bản.
   - `qa_get_report()`: Lấy đường dẫn file báo cáo trực quan.
2. **Antigravity Skill Blueprint**:
   - Cung cấp system instruction chuẩn cho Antigravity để tự động kết hợp các tool thành chuỗi kiểm thử hoàn chỉnh, tự động đề xuất assertion khi form được submit, và cảnh báo QA khi phát hiện UI bất thường.

