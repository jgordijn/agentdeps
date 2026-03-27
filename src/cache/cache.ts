/**
 * Repository cache management.
 *
 * Clones/pulls git repositories to a platform-appropriate cache directory.
 * Uses Node.js child_process for subprocess execution.
 */
import { join } from "node:path";
import { homedir, platform } from "node:os";
import { mkdir, rm, stat as fsStat } from "node:fs/promises";
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
  const xdg = process.env["XDG_CACHE_HOME"];
  return join(xdg ?? join(home, ".cache"), "agentdeps", "repos");
}

function getSafeCwd(): string {
  try {
    return process.cwd();
  } catch {
    return homedir();
  }
}

const GIT_ENV_VARS_TO_UNSET = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_NAMESPACE",
  "GIT_PREFIX",
  "GIT_SUPER_PREFIX",
] as const;

function gitSubprocessEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of GIT_ENV_VARS_TO_UNSET) {
    delete env[key];
  }
  return env;
}



async function runGit(
  args: string[],
  cwd?: string
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn("git", args, {
      cwd: cwd ?? getSafeCwd(),
      env: gitSubprocessEnv(),
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

async function getHeadRevision(repoPath: string): Promise<string | undefined> {
  const result = await runGit(["rev-parse", "HEAD"], repoPath);
  if (!result.success || result.stdout.length === 0) {
    return undefined;
  }
  return result.stdout;
}

async function getChangedPaths(
  repoPath: string,
  beforeRevision: string,
  afterRevision: string
): Promise<string[]> {
  if (beforeRevision === afterRevision) {
    return [];
  }

  const result = await runGit(
    ["diff", "--name-only", beforeRevision, afterRevision, "--", "skills", "agents"],
    repoPath
  );
  if (!result.success || result.stdout.length === 0) {
    return [];
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
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

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await fsStat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function cloneRepo(
  url: string,
  ref: string,
  cacheKey: string
): Promise<{ success: boolean; path: string; error?: string; changedPaths: string[] }> {
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
    await rm(repoPath, { recursive: true, force: true });

    const fallback = await runGit(["clone", url, repoPath]);
    if (fallback.success) {
      const checkout = await runGit(["checkout", ref], repoPath);
      if (!checkout.success) {
        await rm(repoPath, { recursive: true, force: true });
        return {
          success: false,
          path: repoPath,
          error: `ref '${ref}' not found: ${checkout.stderr}`,
          changedPaths: [],
        };
      }
      return { success: true, path: repoPath, changedPaths: [] };
    }
    return { success: false, path: repoPath, error: result.stderr, changedPaths: [] };
  }

  return { success: true, path: repoPath, changedPaths: [] };
}

export async function updateRepo(
  repoPath: string,
  ref: string
): Promise<{ success: boolean; error?: string; changedPaths: string[] }> {
  const beforeRevision = await getHeadRevision(repoPath);

  const fetch = await runGit(["fetch", "origin"], repoPath);
  if (!fetch.success) {
    return { success: false, error: fetch.stderr, changedPaths: [] };
  }

  const resetBranch = await runGit(
    ["reset", "--hard", `origin/${ref}`],
    repoPath
  );
  if (!resetBranch.success) {
    const checkoutRef = await runGit(["checkout", ref], repoPath);
    if (!checkoutRef.success) {
      return { success: false, error: checkoutRef.stderr, changedPaths: [] };
    }
  }

  const afterRevision = await getHeadRevision(repoPath);
  if (!beforeRevision || !afterRevision) {
    return { success: true, changedPaths: [] };
  }

  return {
    success: true,
    changedPaths: await getChangedPaths(repoPath, beforeRevision, afterRevision),
  };
}

export async function ensureRepo(
  url: string,
  ref: string,
  cacheKey: string
): Promise<{ success: boolean; path: string; error?: string; changedPaths: string[] }> {
  const cacheDir = getCacheDir();
  const repoPath = join(cacheDir, cacheKey);

  if (await dirExists(repoPath)) {
    const result = await updateRepo(repoPath, ref);
    if (!result.success) {
      logError("cache.update", new Error(`Failed to update ${cacheKey}: ${result.error}`));
      return {
        success: false,
        path: repoPath,
        error: `Failed to update ${cacheKey}: ${result.error}`,
        changedPaths: [],
      };
    }
    return { success: true, path: repoPath, changedPaths: result.changedPaths };
  }

  const result = await cloneRepo(url, ref, cacheKey);
  if (!result.success) {
    logError("cache.clone", new Error(`Failed to clone ${url}: ${result.error}`));
    console.warn(`⚠ Failed to clone ${url}`);
  }
  return result;
}
