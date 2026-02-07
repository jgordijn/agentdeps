/**
 * Repository cache management.
 *
 * Clones/pulls git repositories to a platform-appropriate cache directory.
 * Uses Node.js child_process for subprocess execution.
 */
import { join } from "node:path";
import { homedir, platform } from "node:os";
import { mkdir, stat as fsStat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { logError } from "../log/logger.ts";

/** Get the platform-appropriate cache directory for agentdeps repos */
export function getCacheDir(): string {
  const home = homedir();
  const plat = platform();

  if (plat === "darwin") {
    return join(home, "Library", "Caches", "agentdeps", "repos");
  }
  if (plat === "win32") {
    const localAppData = process.env["LOCALAPPDATA"] ?? join(home, "AppData", "Local");
    return join(localAppData, "agentdeps", "repos");
  }
  // Linux and others: XDG_CACHE_HOME or default
  const xdg = process.env["XDG_CACHE_HOME"];
  return join(xdg ?? join(home, ".cache"), "agentdeps", "repos");
}

/** Run a git command and return { success, stdout, stderr } */
async function runGit(
  args: string[],
  cwd?: string
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    proc.stdout!.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    proc.stderr!.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    proc.on("close", (exitCode) => {
      resolve({
        success: exitCode === 0,
        stdout: Buffer.concat(stdoutChunks).toString().trim(),
        stderr: Buffer.concat(stderrChunks).toString().trim(),
      });
    });

    proc.on("error", () => {
      resolve({
        success: false,
        stdout: "",
        stderr: "Failed to spawn git process",
      });
    });
  });
}

/** Check if git is available in PATH */
export async function checkGitAvailable(): Promise<boolean> {
  try {
    const result = await runGit(["--version"]);
    return result.success;
  } catch {
    return false;
  }
}

/** Check if a directory exists */
async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await fsStat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Clone a repository to the cache directory.
 * Uses --branch and --single-branch for efficiency.
 */
export async function cloneRepo(
  url: string,
  ref: string,
  cacheKey: string
): Promise<{ success: boolean; path: string; error?: string }> {
  const cacheDir = getCacheDir();
  await mkdir(cacheDir, { recursive: true });

  const repoPath = join(cacheDir, cacheKey);

  const result = await runGit([
    "clone",
    "--branch",
    ref,
    "--single-branch",
    url,
    repoPath,
  ]);

  if (!result.success) {
    // Fallback: try clone without --branch (for commit SHAs)
    const fallback = await runGit(["clone", url, repoPath]);
    if (fallback.success) {
      const checkout = await runGit(["checkout", ref], repoPath);
      if (!checkout.success) {
        return { success: false, path: repoPath, error: checkout.stderr };
      }
      return { success: true, path: repoPath };
    }
    return { success: false, path: repoPath, error: result.stderr };
  }

  return { success: true, path: repoPath };
}

/**
 * Update an existing cached repository.
 * Fetches from origin and resets to the configured ref.
 * Uses `reset --hard` to avoid detached HEAD state for branch refs.
 */
export async function updateRepo(
  repoPath: string,
  ref: string
): Promise<{ success: boolean; error?: string }> {
  // Fetch latest
  const fetch = await runGit(["fetch", "origin"], repoPath);
  if (!fetch.success) {
    return { success: false, error: fetch.stderr };
  }

  // Try resetting to remote branch first (origin/<ref>)
  const resetBranch = await runGit(
    ["reset", "--hard", `origin/${ref}`],
    repoPath
  );
  if (resetBranch.success) {
    return { success: true };
  }

  // Fall back to tag or SHA (checkout is fine for these — they're always detached)
  const checkoutRef = await runGit(["checkout", ref], repoPath);
  if (!checkoutRef.success) {
    return { success: false, error: checkoutRef.stderr };
  }

  return { success: true };
}

/**
 * Ensure a repository is cloned and up-to-date.
 * Clones if missing, updates if exists.
 * Returns the cache path.
 */
export async function ensureRepo(
  url: string,
  ref: string,
  cacheKey: string
): Promise<{ success: boolean; path: string; error?: string }> {
  const cacheDir = getCacheDir();
  const repoPath = join(cacheDir, cacheKey);

  if (await dirExists(repoPath)) {
    // Update existing
    const result = await updateRepo(repoPath, ref);
    if (!result.success) {
      logError("cache.update", new Error(`Failed to update ${cacheKey}: ${result.error}`));
      console.warn(`⚠ Failed to update ${cacheKey} (using cached version)`);
      // Continue with existing cached state
    }
    return { success: true, path: repoPath };
  }

  // Clone fresh
  const result = await cloneRepo(url, ref, cacheKey);
  if (!result.success) {
    logError("cache.clone", new Error(`Failed to clone ${url}: ${result.error}`));
    console.warn(`⚠ Failed to clone ${url}`);
  }
  return result;
}
