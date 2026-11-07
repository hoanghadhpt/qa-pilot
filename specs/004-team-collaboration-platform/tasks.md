# Tasks: QA Pilot Team Collaboration & CI/CD Platform

**Feature**: `specs/004-team-collaboration-platform`  
**Status**: Ready for Execution

---

## Phase 1: Centralized Cloud Publishing & Webhooks

- [ ] **TASK-P1-01**: Thiết kế module `packages/mcp-server/src/cloud/publisher.ts` hỗ trợ tải thư mục báo cáo lên AWS S3 / Cloudflare R2 / Supabase Storage.
- [ ] **TASK-P1-02**: Thiết kế module `packages/mcp-server/src/notifications/webhookNotifier.ts` hỗ trợ gửi message card đến Slack Incoming Webhook, Feishu Webhook, và Discord.
- [ ] **TASK-P1-03**: Cập nhật công cụ MCP `qa_get_report` trong `packages/mcp-server/src/tools/report.ts` để nhận thêm tham số `publishCloud: boolean` và `webhookUrl: string`.
- [ ] **TASK-P1-04**: Thêm nút "Share Cloud Link" và "Gửi Slack/Feishu" trực tiếp trên thanh công cụ của Report HTML.

---

## Phase 2: CI/CD Pipeline & GitHub Action Integration

- [ ] **TASK-P2-01**: Tạo workflow mẫu `.github/workflows/e2e-regression.yml` tự động chạy test kịch bản Playwright mỗi khi có Pull Request.
- [ ] **TASK-P2-02**: Viết script GitHub Action PR Commenter: tổng hợp kết quả (Pass %, thời gian, Triple-Oracle issues, token cost) và comment bảng tóm tắt vào PR.
- [ ] **TASK-P2-03**: Cấu hình cơ chế Quality Gate (PR check failed nếu có lỗi server 5xx hoặc pass rate < 95%).

---

## Phase 3: Defect Auto-Filing & Shared Auth Session Storage

- [ ] **TASK-P3-01**: Xây dựng công cụ MCP `qa_file_defect` trong `packages/mcp-server/src/tools/fileDefect.ts` kết nối với Jira REST API và Linear GraphQL API.
- [ ] **TASK-P3-02**: Xây dựng cơ chế `qa_save_auth_state` và `qa_use_auth_state` cho phép lưu trữ và tái sử dụng session cookies/JWT token giữa các lần kiểm thử của team.
- [ ] **TASK-P3-03**: Mở rộng `browserManager.ts` hỗ trợ chạy đa trình duyệt (Chromium, Firefox, WebKit) và cấu hình viewport Mobile.

