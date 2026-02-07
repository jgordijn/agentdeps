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
 * Recursively sync sourceDir to destDir.
 * After sync, destDir mirrors sourceDir exactly.
 */
export async function smartSync(
  sourceDir: string,
  destDir: string
): Promise<void> {
  // Ensure dest exists
  await mkdir(destDir, { recursive: true });

  // Get source entries
  const sourceEntries = await readdir(sourceDir, { withFileTypes: true });
  const sourceNames = new Set(sourceEntries.map((e) => e.name));

  // Get dest entries (may not exist yet)
  let destEntries: Dirent<string>[] = [];
  try {
    destEntries = await readdir(destDir, { withFileTypes: true });
  } catch {
    // Dest doesn't exist yet, that's fine
  }

  // Remove items in dest that are not in source
  for (const entry of destEntries) {
    if (!sourceNames.has(entry.name)) {
      await rm(join(destDir, entry.name), { recursive: true, force: true });
    }
  }

  // Sync source items
  for (const entry of sourceEntries) {
    const srcPath = join(sourceDir, entry.name);
    const dstPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      await smartSync(srcPath, dstPath);
    } else if (entry.isFile()) {
      // Copy file if changed or missing
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
