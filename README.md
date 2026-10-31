# QA Pilot (v0.0.1)

Nền tảng kiểm thử tự động Local-first cho kỹ sư QA, sử dụng giao thức **Chrome DevTools Protocol (CDP)** kết hợp **Local AI CLI** và quản lý kịch bản theo mô hình **Test-as-Code (YAML + Git)**.

## Kiến trúc cốt lõi

1. **Thực thi qua Chrome DevTools Protocol (CDP)**:
   - Kết nối trực tiếp hoặc tự động khởi chạy Chrome qua cổng `9222` (`--remote-debugging-port=9222`) với thư mục hồ sơ cố định (`tests/temp/chrome-profile`), giữ trạng thái phiên khi chạy thử từng bước (`Chạy bước này`).
   - Thu thập cây ngữ nghĩa `Accessibility.getFullAXTree`, lỗi Console (`Runtime`) và lỗi mạng (`Network`) trực tiếp qua CDP; không gửi mã HTML thô vào ngữ cảnh AI.
2. **Bằng chứng trực quan & Phân tích lỗi**:
   - Tự động chụp ảnh màn hình gốc và vẽ khung viền đỏ nét đứt kèm nhãn lỗi bằng `sharp` (`step-<n>-annotated.png`).
   - Hỗ trợ định vị vùng chứa gần nhất khi bộ chọn đích bị thiếu và đề xuất bộ chọn thay thế (`suggestedSelector`) từ cây ngữ nghĩa.
3. **Bảo vệ an toàn Production & Che biến mật**:
   - Chặn thực thi trên môi trường `Production` đối với các kịch bản chứa nhãn `destructive`, `financial`, `data-creation` hoặc tên miền ngoài danh sách cho phép.
   - Tự động thay thế mọi giá trị biến mật từ `.env.local` thành `[REDACTED]` trong nhật ký, luồng sự kiện và tệp kết quả.
4. **Giao diện 3 cột tối giản (Ant Design v5)**:
   - Cột 1: Danh sách kịch bản, bộ lọc tìm kiếm, trạng thái chạy và nhãn an toàn Production.
   - Cột 2: Trình soạn thảo bước kiểm thử (tự động ẩn trường không áp dụng), chèn biến và chạy lẻ từng bước.
   - Cột 3: Dòng thời gian thực thi, trình xem ảnh chụp màn hình hỗ trợ phóng to, nhật ký lỗi và phân tích nguyên nhân bằng tiếng Việt.

## Cài đặt và Chạy dự án

```bash
# Cài đặt toàn bộ dependencies cho root, server và client
npm run install:all

# Chạy đồng thời Backend (cổng 4000) và Frontend (cổng 3000)
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`. Các kịch bản mẫu (`TC-01` và `TC-02`) được cấu hình kiểm thử trực tiếp trên `https://demo.automationtesting.in/Register.html`.

