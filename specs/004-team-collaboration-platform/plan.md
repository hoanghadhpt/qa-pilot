# Implementation Plan: QA Pilot Team Collaboration & CI/CD Platform

**Feature**: `specs/004-team-collaboration-platform`  
**Status**: Ready for Implementation  
**Estimated Timeline**: 3 Phases

---

## 1. Technical Context & Architecture Overview

```
                      ┌───────────────────────────────────────────────┐
                      │            Developer / QA in IDE              │
                      │       (Antigravity MCP Client / VS Code)      │
                      └──────────────────────┬────────────────────────┘
                                             │
                      ┌──────────────────────▼────────────────────────┐
                      │              CI/CD Pipeline                   │
                      │     (GitHub Actions / GitLab CI Runner)       │
                      └──────────────────────┬────────────────────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   │                                                   │
         ┌─────────▼──────────┐                             ┌──────────▼──────────┐
         │ QA Pilot MCP Core  │                             │  Cloud Storage &    │
         │ (Midscene + Engine)│                             │   Publishing Hub    │
         └─────────┬──────────┘                             └──────────┬──────────┘
                   │                                                   │
     ┌─────────────┼─────────────┐                         ┌───────────┼───────────┐
     │             │             │                         │           │           │
┌────▼────┐   ┌────▼────┐   ┌────▼────┐               ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
│Chromium │   │ Firefox │   │ WebKit  │               │ S3 / R2 │ │  Slack  │ │  Jira   │
│ Engine  │   │ Engine  │   │ Safari  │               │ Reports │ │ Webhook │ │ Linear  │
└─────────┘   └─────────┘   └─────────┘               └─────────┘ └─────────┘ └─────────┘
```

---

## 2. Lộ Trình Triển Khai Chi Tiết (Phase Breakdowns)

### Phase 1: Centralized Cloud Publishing & Webhooks (Ưu tiên cao nhất)
* **Mục tiêu**: Báo cáo sau khi chạy không bị "giam" trên máy local mà được publish lên Cloud Storage cho cả team xem.
* **Các công việc chính**:
  1. Thêm module `publisher.ts` hỗ trợ tải thư mục phiên (`tests/runs/run-xxx/`) lên AWS S3 hoặc Cloudflare R2 qua presigned URL hoặc S3 client.
  2. Tạo đường dẫn cố định công khai dạng: `https://reports.your-team.com/runs/latest.html` và `.../runs/<session-id>/report.html`.
  3. Thêm module `webhookNotifier.ts` hỗ trợ bắn card thông báo kết quả (Pass/Fail rate, số bước, chi phí token, link xem báo cáo) đến Webhook URL của **Slack**, **Discord**, hoặc **Feishu**.
  4. Cung cấp tham số `publishCloud: true` và `webhookUrl: string` trong công cụ MCP `qa_get_report`.

### Phase 2: CI/CD Pipeline & GitHub Action Integration
* **Mục tiêu**: Đưa QA Pilot vào luồng tự động kiểm thử tự động của repository.
* **Các công việc chính**:
  1. Xây dựng composite GitHub Action tại `.github/actions/qa-pilot`:
     - Cài đặt Node, Playwright browsers.
     - Khởi động MCP test runner ở chế độ Headless.
     - Chạy kịch bản E2E kiểm thử hồi quy cho các tính năng trọng yếu.
  2. Tự động comment bảng tóm tắt kết quả (Markdown Table kèm badges và link report Cloud) trực tiếp vào Pull Request.
  3. Gating check: Chặn merge PR nếu tỷ lệ Pass < 95% hoặc có lỗi Triple-Oracle nghiêm trọng (HTTP 5xx).

### Phase 3: Jira/Linear Auto-Filing & Shared Session Storage
* **Mục tiêu**: Tối ưu hóa thời gian xử lý bug và tiết kiệm thời gian đăng nhập lặp lại.
* **Các công việc chính**:
  1. Xây dựng công cụ MCP `qa_file_defect`:
     - Tự động lấy danh sách lỗi nghiêm trọng từ Triple-Oracle (`console_error`, `js_exception`, `network_failure`).
     - Đính kèm ảnh chụp màn hình tại bước lỗi.
     - Đẩy ticket tự động sang **Jira Software API** hoặc **Linear API**.
  2. Xây dựng cơ chế `qa_save_auth_state` và `qa_use_auth_state`:
     - Lưu trữ trạng thái phiên đăng nhập (Cookies, LocalStorage JWT) vào thư mục bảo mật `tests/fixtures/auth/`.
     - Các test suite tiếp theo tái sử dụng session đăng nhập mà không cần gõ username/password lặp lại.

---

## 3. Quản Trị Chi Phí & Bảo Mật Dữ Liệu Team

1. **Quản trị chi phí Token (Token Governance)**:
   - Áp dụng hạn mức chi phí (Budget Cap): Cảnh báo nếu một phiên chạy vượt quá $0.05 USD.
   - Sử dụng mô hình nhận diện tự động hoặc model tối ưu chi phí (`gemini-2.0-flash` / `deepseek-chat`) cho các lượt chạy lặp lại trên CI/CD.
2. **Bảo mật thông tin nội bộ (Data Sanitization)**:
   - Module `globalRedactor` tự động che mờ mật khẩu, Bearer Token, API Key và email người dùng thực tế trước khi xuất HTML và tải lên Cloud.

