import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface WriteFileOptions {
  dryRun?: boolean;
  force?: boolean;
}

export async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string, dryRun: boolean = false): Promise<void> {
  if (dryRun) return;
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeFileSafe(
  filePath: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<{ written: boolean; skipped: boolean }> {
  const exists = await fileExists(filePath);
  if (exists && !options.force) {
    return { written: false, skipped: true };
  }

  if (options.dryRun) {
    return { written: true, skipped: false };
  }

  const dir = path.dirname(filePath);
  await ensureDir(dir, false);
  await fs.writeFile(filePath, content, 'utf-8');
  return { written: true, skipped: false };
}

export async function copyDirectoryRecursive(
  srcDir: string,
  destDir: string,
  options: WriteFileOptions = {}
): Promise<string[]> {
  const copiedFiles: string[] = [];

  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  await ensureDir(destDir, options.dryRun);

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      const nested = await copyDirectoryRecursive(srcPath, destPath, options);
      copiedFiles.push(...nested);
    } else {
      const content = await fs.readFile(srcPath, 'utf-8');
      const res = await writeFileSafe(destPath, content, options);
      if (res.written) {
        copiedFiles.push(destPath);
      }
    }
  }

  return copiedFiles;
}

