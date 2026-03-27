/**
 * Managed directory operations — shared by both link and copy install methods.
 *
 * Managed directories (e.g., `.pi/skills/_agentdeps_managed/`) are fully owned by the tool.
 * Stale entries are pruned, desired entries are installed.
 */
import { readdir, mkdir, rm, lstat, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { ensureSymlink } from "./link.ts";
import { smartSync } from "./copy.ts";

/** Expand ~ to home directory */
export function expandHomePath(path: string): string {
  if (path.startsWith("~/") || path === "~") {
    return join(homedir(), path.slice(1));
  }
  return path;
}

/** Summary of actions taken during sync */
export interface SyncSummary {
  added: string[];
  updated: string[];
  removed: string[];
  unchanged: string[];
}

/**
 * Resolve the target filename for an item.
 * For file-based sources (e.g., agents stored as `.md` files),
 * the file extension is preserved. For directories, the name is used as-is.
 */
async function resolveTargetName(name: string, sourcePath: string): Promise<string> {
  try {
    const srcStat = await stat(sourcePath);
    if (srcStat.isFile()) {
      const ext = sourcePath.match(/(\.[^.]+)$/)?.[1] ?? "";
      return name + ext;
    }
  } catch {
    // Can't stat — use name as-is
  }
  return name;
}

/**
 * Sync a managed directory with the desired set of items.
 *
 * @param managedDir - The managed/ directory path (e.g., `.pi/skills/_agentdeps_managed`)
 * @param desiredItems - Map of name → source path for items that should exist
 * @param installMethod - "link" for symlinks, "copy" for smart sync
 */
export async function syncManagedDir(
  managedDir: string,
  desiredItems: Map<string, string>,
  installMethod: "link" | "copy"
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    added: [],
    updated: [],
    removed: [],
    unchanged: [],
  };

  let currentEntries: string[] = [];
  let dirExists = false;
  try {
    currentEntries = await readdir(managedDir);
    dirExists = true;
  } catch {
    // Directory doesn't exist yet
  }

  if (desiredItems.size === 0 && !dirExists) {
    return summary;
  }

  const resolvedItems: Array<{ name: string; targetName: string; sourcePath: string }> = [];
  for (const [name, sourcePath] of desiredItems) {
    const targetName = await resolveTargetName(name, sourcePath);
    resolvedItems.push({ name, targetName, sourcePath });
  }

  const targetNames = new Set(resolvedItems.map((item) => item.targetName));

  for (const entry of currentEntries) {
    if (!targetNames.has(entry)) {
      await rm(join(managedDir, entry), { recursive: true, force: true });
      summary.removed.push(entry);
    }
  }

  if (desiredItems.size === 0) {
    try {
      const remaining = await readdir(managedDir);
      if (remaining.length === 0) {
        await rm(managedDir, { recursive: true, force: true });
      }
    } catch {
      // Already gone
    }
    return summary;
  }

  await mkdir(managedDir, { recursive: true });

  for (const { name, targetName, sourcePath } of resolvedItems) {
    const targetPath = join(managedDir, targetName);

    if (installMethod === "link") {
      const result = await ensureSymlink(sourcePath, targetPath);
      if (result === "created") {
        summary.added.push(name);
      } else if (result === "replaced") {
        summary.updated.push(name);
      } else {
        summary.unchanged.push(name);
      }
      continue;
    }

    try {
      await lstat(targetPath);
      const changed = await smartSync(sourcePath, targetPath);
      if (changed) {
        summary.updated.push(name);
      } else {
        summary.unchanged.push(name);
      }
    } catch {
      await smartSync(sourcePath, targetPath);
      summary.added.push(name);
    }
  }

  return summary;
}
