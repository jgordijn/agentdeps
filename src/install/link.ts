/**
 * Symlink install operations.
 */
import { symlink, readlink, unlink, lstat } from "node:fs/promises";
import { platform } from "node:os";

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
      const proc = Bun.spawn(["cmd", "/c", "mklink", "/J", linkPath, target], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        const stderr = await new Response(proc.stderr).text();
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
    await unlink(linkPath);
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
