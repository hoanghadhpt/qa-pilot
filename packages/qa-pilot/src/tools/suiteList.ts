import { suiteManager } from '../engine/suiteManager.js';

export interface ListSuitesArgs {
  module?: string;
}

export async function handleListSuites(args: ListSuitesArgs = {}) {
  const { module: filterModule } = args;

  const summaries = await suiteManager.listSuites(filterModule);

  if (summaries.length === 0) {
    const filterNote = filterModule ? ` thuộc phân hệ '${filterModule}'` : '';
    return {
      content: [
        {
          type: 'text',
          text: `Chưa có Test Suite nào được lưu${filterNote} trong tests/suites/. Dùng qa_generate_suite({ module: "..." }) để tự động sinh suite đầu tiên.`,
        },
      ],
    };
  }

  const lines = summaries.map((s) => {
    return `- [${s.module}/${s.id}] ${s.name} (${s.caseCount} cases) | Tags: ${s.tags.join(', ') || 'none'} | Tệp: ${s.filePath}`;
  });

  return {
    content: [
      {
        type: 'text',
        text: `Danh sách các Test Suite hiện có (${summaries.length} suites):\n${lines.join('\n')}`,
      },
    ],
  };
}

