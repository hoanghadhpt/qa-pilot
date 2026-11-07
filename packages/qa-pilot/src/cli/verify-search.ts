/**
 * Verification Suite for Offline Heuristics Search Tool
 */

// @ts-ignore
import { searchHeuristics } from '../../../../.agents/skills/qa-pilot/scripts/search-heuristics.js';

function runSearchVerifications() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TÍCH HỢP CHO OFFLINE HEURISTICS SEARCH ===\n');
  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Kịch bản ${total}: ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] Kịch bản ${total}: ${name}`);
      if (details) console.error(`       Chi tiết: ${details}`);
    }
  }

  // 1. List categories
  const listRes = searchHeuristics({ listCategories: true } as any);
  assert(
    'Liệt kê danh mục payloads có sẵn',
    Array.isArray(listRes.categories) && listRes.categories.length >= 5,
    `Tìm thấy ${listRes.categories?.length} categories`
  );

  // 2. Filter by category
  const xssRes = searchHeuristics({ category: 'xss' } as any);
  assert(
    'Lọc payloads theo danh mục xss',
    xssRes.matchedPayloads.length >= 3 && xssRes.matchedPayloads.every((p: any) => p.category.includes('XSS')),
    `Tìm thấy ${xssRes.matchedPayloads.length} XSS payloads`
  );

  // 3. Query search
  const bvaRes = searchHeuristics({ query: 'boundary' } as any);
  assert(
    'Tìm kiếm chuỗi theo từ khóa boundary',
    bvaRes.matchedPayloads.length > 0 && bvaRes.matchedDocs.length > 0,
    `Payloads: ${bvaRes.matchedPayloads.length}, Docs: ${bvaRes.matchedDocs.length}`
  );

  // 4. Vietnamese query search
  const vnRes = searchHeuristics({ query: 'tiếng việt' } as any);
  assert(
    'Tìm kiếm hỗ trợ tiếng Việt có dấu',
    vnRes.matchedPayloads.length > 0,
    `Payloads: ${vnRes.matchedPayloads.length}`
  );

  // 5. Unknown query non-crashing
  const noneRes = searchHeuristics({ query: 'xyznonexistentterm12345' } as any);
  assert(
    'Tìm kiếm từ khóa không tồn tại trả về rỗng không crash',
    noneRes.matchedPayloads.length === 0 && noneRes.matchedDocs.length === 0
  );

  console.log(`\n=== TỔNG KẾT: ${passed}/${total} KỊCH BẢN THÀNH CÔNG ===\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runSearchVerifications();
