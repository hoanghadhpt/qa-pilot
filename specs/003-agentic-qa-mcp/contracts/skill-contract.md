# Contract: Antigravity QA Pilot Custom Skill

## File Location
`.agents/skills/qa-pilot/SKILL.md`

## Specification & Prompt Contract

Skill này chỉ dẫn Antigravity Agent cách thức tương tác với MCP server `qa-pilot-mcp` khi người dùng yêu cầu kiểm thử phần mềm, test giao diện, kiểm tra luồng người dùng hoặc xuất kịch bản.

### Header & Metadata
```yaml
---
name: "qa-pilot"
description: "AI-driven automated web testing assistant that executes natural-language actions, visual assertions, and self-healing tests via Playwright & Midscene MCP tools directly from chat."
compatibility: "Requires Antigravity IDE and .mcp.json configured with qa-pilot-mcp"
---
```

### Required Agent Behaviors

1. **Autonomous Execution with Human Visibility**:
   - Khi người dùng đưa ra một mục tiêu kiểm thử (ví dụ: *"Kiểm tra luồng đăng ký tài khoản mới"*), agent tự động phân rã thành chuỗi các thao tác:
     1. Khởi chạy trình duyệt (mặc định hiển thị cửa sổ `headless: false` để QA theo dõi trực quan trừ khi người dùng yêu cầu chạy ngầm).
     2. Điều hướng đến trang mục tiêu (`qa_navigate`).
     3. Thực hiện lần lượt các bước nhập liệu/thao tác qua `qa_act`.
     4. Tự động kiểm tra các trạng thái chuyển giao qua `qa_assert`.
2. **Production Safety Gate**:
   - Trước khi thực hiện bất kỳ hành động nào có dấu hiệu thay đổi dữ liệu hoặc thanh toán trên môi trường Production, agent phải kiểm tra cờ an toàn và cảnh báo người dùng.
3. **Secret Redaction**:
   - Không bao giờ in mật khẩu hoặc secret ra chat. Luôn hiển thị `[REDACTED]` khi tóm tắt các giá trị đã nhập vào trường mật khẩu.
4. **Proactive Export**:
   - Sau khi hoàn thành một luồng kiểm thử thành công, agent chủ động hỏi người dùng có muốn xuất thành file kịch bản Playwright (`.spec.ts`) hoặc YAML để lưu vào Git repo hay không.

