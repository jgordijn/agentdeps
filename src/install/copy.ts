/**
 * Smart copy sync operations.
 *
 * Recursively syncs a source directory to a destination:
 * - Adds new files
 * - Overwrites changed files
 * - Removes files/directories that no longer exist in source
 */
import {
  readdir,
  mkdir,
  rm,
  stat,
  copyFile,
} from "node:fs/promises";
import type { Dirent } from "node:fs";
import { join } from "node:path";

/**
 * Sync source to dest. Handles both files and directories.
 * - If source is a file, copies it directly to dest.
 * - If source is a directory, recursively syncs so dest mirrors source exactly.
 */
export async function smartSync(
  source: string,
  dest: string
): Promise<void> {
  const srcStat = await stat(source);

  if (srcStat.isFile()) {
    // Single file sync
    const needsCopy = await fileNeedsCopy(source, dest);
    if (needsCopy) {
      await copyFile(source, dest);
    }
    return;
  }

  // Directory sync
  await mkdir(dest, { recursive: true });

  // Get source entries
  const sourceEntries = await readdir(source, { withFileTypes: true });
  const sourceNames = new Set(sourceEntries.map((e) => e.name));

  // Get dest entries (may not exist yet)
  let destEntries: Dirent<string>[] = [];
  try {
    destEntries = await readdir(dest, { withFileTypes: true });
  } catch {
    // Dest doesn't exist yet, that's fine
  }

  // Remove items in dest that are not in source
  for (const entry of destEntries) {
    if (!sourceNames.has(entry.name)) {
      await rm(join(dest, entry.name), { recursive: true, force: true });
    }
  }

  // Sync source items
  for (const entry of sourceEntries) {
    const srcPath = join(source, entry.name);
    const dstPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await smartSync(srcPath, dstPath);
    } else if (entry.isFile()) {
      const needsCopy = await fileNeedsCopy(srcPath, dstPath);
      if (needsCopy) {
        await copyFile(srcPath, dstPath);
      }
    }
  }
}

/** Check if a file needs to be copied (missing or different size/mtime) */
async function fileNeedsCopy(src: string, dst: string): Promise<boolean> {
  try {
    const [srcStat, dstStat] = await Promise.all([stat(src), stat(dst)]);
    // Compare size first (fast), then mtime
    if (srcStat.size !== dstStat.size) return true;
    if (srcStat.mtimeMs > dstStat.mtimeMs) return true;
    return false;
  } catch {
    // Dest doesn't exist
    return true;
  }
}
