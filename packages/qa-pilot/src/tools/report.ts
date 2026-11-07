import { reportManager } from '../engine/reportManager.js';

export async function handleGetReport() {
  const session = reportManager.getCurrentSession();
  if (!session) {
    return {
      isError: true,
      content: [{ type: 'text', text: 'Chưa có phiên kiểm thử nào được ghi nhận.' }]
    };
  }

  const reportPath = reportManager.generateHtmlReport();
  return {
    content: [
      {
        type: 'text',
        text: `Đã tạo báo cáo trực quan tại tệp:\n${reportPath}\n\nBạn có thể mở tệp này trên trình duyệt để xem toàn bộ timeline và ảnh chụp màn hình.`
      }
    ]
  };
}

