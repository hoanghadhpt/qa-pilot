import { browserManager } from '../engine/browserManager.js';
import { testMatrixGenerator } from '../engine/testMatrixGenerator.js';
import { handleNavigate } from './navigate.js';

export async function handlePlanTestMatrix(args: { url?: string }) {
  let page = browserManager.getPage();

  if (args.url) {
    await handleNavigate({ url: args.url });
    page = browserManager.getPage();
  }

  if (!page) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Vui lòng cung cấp URL hoặc khởi động trình duyệt trước khi lập ma trận kiểm thử.'
        }
      ]
    };
  }

  const result = await testMatrixGenerator.generateMatrix(page);

  return {
    content: [
      {
        type: 'text',
        text: result.markdown
      }
    ]
  };
}

