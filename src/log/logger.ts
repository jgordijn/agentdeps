/**
 * Structured error logging to a platform-appropriate log file.
 *
 * All errors are appended with timestamps. At command completion,
 * a hint is printed telling the user where the log file lives.
 *
 * Log locations:
 * - Linux:   ~/.cache/agentdeps/logs/agentdeps.log  (or XDG_STATE_HOME)
 * - macOS:   ~/Library/Logs/agentdeps/agentdeps.log
 * - Windows: %LOCALAPPDATA%/agentdeps/logs/agentdeps.log
 */
import { join } from "node:path";
import { homedir, platform } from "node:os";
import { appendFileSync, mkdirSync } from "node:fs";

/** Get the platform-appropriate log directory for agentdeps */
export function getLogDir(): string {
  const home = homedir();
  const plat = platform();

  if (plat === "darwin") {
    return join(home, "Library", "Logs", "agentdeps");
  }
  if (plat === "win32") {
    const localAppData =
      process.env["LOCALAPPDATA"] ?? join(home, "AppData", "Local");
    return join(localAppData, "agentdeps", "logs");
  }
  // Linux and others: XDG_STATE_HOME → XDG_CACHE_HOME → default
  const xdgState = process.env["XDG_STATE_HOME"];
  if (xdgState) {
    return join(xdgState, "agentdeps", "logs");
  }
  const xdgCache = process.env["XDG_CACHE_HOME"];
  return join(xdgCache ?? join(home, ".cache"), "agentdeps", "logs");
}

/** Get the path to the log file */
export function getLogPath(): string {
  return join(getLogDir(), "agentdeps.log");
}

// ── Session state ──────────────────────────────────────────────

let errorCount = 0;
let warnCount = 0;
let logDirEnsured = false;

/** Ensure the log directory exists (synchronous, runs once per process) */
function ensureLogDir(): boolean {
  if (logDirEnsured) return true;
  try {
    mkdirSync(getLogDir(), { recursive: true });
    logDirEnsured = true;
    return true;
  } catch {
    // Can't create log dir — skip file logging silently
    return false;
  }
}

// ── Formatting helpers ─────────────────────────────────────────

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }
  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error, null, 2);
  }
  return String(error);
}

function timestamp(): string {
  return new Date().toISOString();
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Log an error to the log file.
 *
 * @param context - Short label for where the error occurred (e.g. "config", "cache.ensureRepo")
 * @param error   - The caught error value
 */
export function logError(context: string, error: unknown): void {
  if (!ensureLogDir()) return;

  const entry = `[${timestamp()}] ERROR [${context}]\n${formatError(error)}\n\n`;

  try {
    appendFileSync(getLogPath(), entry);
  } catch {
    // Can't write — nothing we can do
  }

  errorCount++;
}

/**
 * Log a warning to the log file.
 */
export function logWarn(context: string, message: string): void {
  if (!ensureLogDir()) return;

  const entry = `[${timestamp()}] WARN  [${context}] ${message}\n`;

  try {
    appendFileSync(getLogPath(), entry);
  } catch {
    // Can't write
  }

  warnCount++;
}

/** Whether any errors were logged this session */
export function hasLoggedErrors(): boolean {
  return errorCount > 0;
}

/** Number of errors logged this session */
export function getErrorCount(): number {
  return errorCount;
}

/**
 * Print a user-facing hint about the log file location.
 * Call at the end of every command that may have logged errors.
 * Does nothing if no errors were logged.
 */
export function printLogHint(): void {
  if (errorCount === 0) return;
  const s = errorCount === 1 ? "" : "s";
  console.error(
    `\n⚠ ${errorCount} error${s} occurred. See log for details:\n  ${getLogPath()}`
  );
}

/** Reset session state (for testing only) */
export function resetLogState(): void {
  errorCount = 0;
  warnCount = 0;
  logDirEnsured = false;
}
