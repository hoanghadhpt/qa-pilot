import * as fs from 'node:fs/promises';
import { fileExists, ensureDir } from '../utils/fileSystem.js';
import * as path from 'node:path';

export const DELIMITER_START = '<!-- QA-PILOT-START -->';
export const DELIMITER_END = '<!-- QA-PILOT-END -->';

/**
 * Merge block into existing file between delimiters, or append if delimiters not present.
 */
export async function mergeDelimiterBlock(
  filePath: string,
  contentToInsert: string,
  options: { dryRun?: boolean; force?: boolean } = {}
): Promise<{ action: 'created' | 'merged' | 'skipped' | 'dry_run'; updated: boolean }> {
  const wrappedBlock = `\n${DELIMITER_START}\n${contentToInsert.trim()}\n${DELIMITER_END}\n`;

  const exists = await fileExists(filePath);
  if (!exists) {
    if (options.dryRun) {
      return { action: 'dry_run', updated: true };
    }
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, wrappedBlock.trimStart(), 'utf-8');
    return { action: 'created', updated: true };
  }

  const existingContent = await fs.readFile(filePath, 'utf-8');

  // Check if delimiters exist
  const startIndex = existingContent.indexOf(DELIMITER_START);
  const endIndex = existingContent.indexOf(DELIMITER_END);

  let newContent: string;
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    // Replace content between delimiters
    newContent =
      existingContent.substring(0, startIndex) +
      DELIMITER_START +
      '\n' +
      contentToInsert.trim() +
      '\n' +
      existingContent.substring(endIndex);
  } else {
    // Append to end of file
    newContent = existingContent.trimEnd() + '\n' + wrappedBlock;
  }

  if (newContent === existingContent && !options.force) {
    return { action: 'skipped', updated: false };
  }

  if (options.dryRun) {
    return { action: 'dry_run', updated: true };
  }

  await fs.writeFile(filePath, newContent, 'utf-8');
  return { action: 'merged', updated: true };
}

