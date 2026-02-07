/**
 * Symlink install operations.
 */
import { symlink, readlink, unlink, lstat, rm } from "node:fs/promises";
import { platform } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Create a symlink. On Windows, falls back to directory junction.
 */
export async function createSymlink(
  target: string,
  linkPath: string
): Promise<void> {
  try {
    await symlink(target, linkPath, "dir");
  } catch (err) {
    if (platform() === "win32") {
      // Fallback: try directory junction on Windows
      try {
        await execFileAsync("cmd", ["/c", "mklink", "/J", linkPath, target]);
      } catch (junctionErr: unknown) {
        const stderr = junctionErr instanceof Error ? junctionErr.message : String(junctionErr);
        throw new Error(
          `Failed to create symlink or junction at ${linkPath}. ` +
            `Consider switching to install_method: copy, or enable Developer Mode on Windows. ` +
            `Error: ${stderr.trim()}`
        );
      }
    } else {
      throw err;
    }
  }
}

/**
 * Ensure a symlink exists and points to the correct target.
 * Idempotent: skip if correct, replace if wrong target, create if missing.
 */
export async function ensureSymlink(
  target: string,
  linkPath: string
): Promise<"created" | "replaced" | "unchanged"> {
  try {
    const stat = await lstat(linkPath);

    if (stat.isSymbolicLink()) {
      const currentTarget = await readlink(linkPath);
      if (currentTarget === target) {
        return "unchanged";
      }
      // Wrong target — replace
      await unlink(linkPath);
      await createSymlink(target, linkPath);
      return "replaced";
    }

    // Exists but is not a symlink — remove and create
    await rm(linkPath, { recursive: true, force: true });
    await createSymlink(target, linkPath);
    return "replaced";
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") {
      // Doesn't exist — create
      await createSymlink(target, linkPath);
      return "created";
    }
    throw err;
  }
}
