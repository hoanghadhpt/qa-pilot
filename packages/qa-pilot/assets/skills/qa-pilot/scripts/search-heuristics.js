#!/usr/bin/env node

/**
 * Local Heuristics & Payload Search Tool (Zero External Dependencies)
 * Usage:
 *   node search-heuristics.js --category xss
 *   node search-heuristics.js --query "boundary"
 *   node search-heuristics.js --list-categories
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

function parseArgs(args) {
  const result = {
    category: null,
    query: null,
    listCategories: false,
    json: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--category' || arg === '-c') {
      result.category = args[++i];
    } else if (arg === '--query' || arg === '-q') {
      result.query = args[++i];
    } else if (arg === '--list-categories' || arg === '-l') {
      result.listCategories = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (!arg.startsWith('-') && !result.query) {
      result.query = arg;
    }
  }

  return result;
}

function loadPayloads() {
  const payloadFile = path.join(DATA_DIR, 'payloads', 'naughty-strings.json');
  if (!fs.existsSync(payloadFile)) {
    return { categories: {} };
  }
  return JSON.parse(fs.readFileSync(payloadFile, 'utf-8'));
}

function loadMarkdownFiles() {
  const files = [
    { name: 'SFDIPOT Heuristics', path: path.join(DATA_DIR, 'heuristics', 'sfdipot.md') },
    { name: 'Evaluation Checklist', path: path.join(DATA_DIR, 'checklists', 'evaluation-checklist.md') }
  ];

  return files.map((f) => {
    if (fs.existsSync(f.path)) {
      return { name: f.name, content: fs.readFileSync(f.path, 'utf-8') };
    }
    return { name: f.name, content: '' };
  });
}

export function searchHeuristics(options) {
  const payloadData = loadPayloads();
  const mdDocs = loadMarkdownFiles();

  if (options.listCategories) {
    const categories = Object.keys(payloadData.categories || {}).map((catKey) => ({
      key: catKey,
      name: payloadData.categories[catKey].name,
      count: (payloadData.categories[catKey].items || []).length
    }));
    return { categories };
  }

  const results = {
    matchedPayloads: [],
    matchedDocs: []
  };

  const queryLower = options.query ? options.query.toLowerCase() : null;
  const targetCategory = options.category ? options.category.toLowerCase() : null;

  // 1. Search in Payloads
  for (const [catKey, catObj] of Object.entries(payloadData.categories || {})) {
    if (targetCategory && !catKey.toLowerCase().includes(targetCategory)) {
      continue;
    }

    for (const item of catObj.items || []) {
      let isMatch = false;

      if (!queryLower) {
        // If only category specified
        isMatch = true;
      } else {
        const textToSearch = `${catKey} ${item.id} ${item.value} ${item.purpose} ${item.expectedValidation} ${catObj.name}`.toLowerCase();
        if (textToSearch.includes(queryLower)) {
          isMatch = true;
        }
      }

      if (isMatch) {
        results.matchedPayloads.push({
          category: catObj.name,
          ...item
        });
      }
    }
  }

  // 2. Search in Markdown Docs (if query is specified)
  if (queryLower) {
    for (const doc of mdDocs) {
      const lines = doc.content.split('\n');
      const matchingSections = [];

      let currentHeading = doc.name;
      for (const line of lines) {
        if (line.startsWith('#')) {
          currentHeading = line.replace(/^#+\s*/, '').trim();
        }
        if (line.toLowerCase().includes(queryLower)) {
          matchingSections.push({
            heading: currentHeading,
            snippet: line.trim()
          });
        }
      }

      if (matchingSections.length > 0) {
        results.matchedDocs.push({
          document: doc.name,
          matches: matchingSections.slice(0, 5) // top 5
        });
      }
    }
  }

  return results;
}

// CLI Execution Check
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const opts = parseArgs(process.argv.slice(2));
  const output = searchHeuristics(opts);

  if (opts.json) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  }

  if (opts.listCategories) {
    console.log('\n--- Danh mục Payloads có sẵn ---');
    for (const cat of output.categories) {
      console.log(`- ${cat.key.padEnd(20)}: ${cat.name} (${cat.count} items)`);
    }
    console.log('');
    process.exit(0);
  }

  console.log(`\n=== KẾT QUẢ TRA CỨU HEURISTIC & PAYLOAD (${output.matchedPayloads.length} payloads, ${output.matchedDocs.length} tài liệu) ===\n`);

  if (output.matchedPayloads.length > 0) {
    console.log('--- Payloads phù hợp: ---');
    for (const p of output.matchedPayloads) {
      console.log(`[${p.risk.toUpperCase()}] ID: ${p.id} (${p.category})`);
      console.log(`  Giá trị  : ${p.value}`);
      console.log(`  Mục đích : ${p.purpose}`);
      console.log(`  Kỳ vọng  : ${p.expectedValidation}\n`);
    }
  }

  if (output.matchedDocs.length > 0) {
    console.log('--- Tài liệu Heuristic phù hợp: ---');
    for (const d of output.matchedDocs) {
      console.log(`Tài liệu: ${d.document}`);
      for (const m of d.matches) {
        console.log(`  - [${m.heading}]: ${m.snippet}`);
      }
      console.log('');
    }
  }

  if (output.matchedPayloads.length === 0 && output.matchedDocs.length === 0) {
    console.log('Không tìm thấy kết quả phù hợp. Thử tìm kiếm với từ khóa khác hoặc dùng --list-categories.\n');
  }
}
