/**
 * Tests for the structured logger.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We need to set XDG_STATE_HOME *before* importing the logger so getLogDir()
// picks up the test directory. The logger caches logDirEnsured, so we reset.
let tempDir: string;
let originalXdgState: string | undefined;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-logger-test-"));
  originalXdgState = process.env["XDG_STATE_HOME"];
  process.env["XDG_STATE_HOME"] = tempDir;
});

afterEach(async () => {
  if (originalXdgState === undefined) {
    delete process.env["XDG_STATE_HOME"];
  } else {
    process.env["XDG_STATE_HOME"] = originalXdgState;
  }
  await rm(tempDir, { recursive: true, force: true });
});

describe("logger", () => {
  it("getLogDir uses XDG_STATE_HOME when set", async () => {
    // Re-import to get fresh module state
    const { getLogDir } = await import("./logger.ts");
    const dir = getLogDir();
    expect(dir).toContain(tempDir);
    expect(dir).toContain("agentdeps");
  });

  it("getLogPath returns a file inside the log dir", async () => {
    const { getLogPath, getLogDir } = await import("./logger.ts");
    const path = getLogPath();
    expect(path.startsWith(getLogDir())).toBe(true);
    expect(path).toEndWith("agentdeps.log");
  });

  it("logError writes to the log file and increments error count", async () => {
    const { logError, getLogPath, getErrorCount, hasLoggedErrors, resetLogState } =
      await import("./logger.ts");

    resetLogState();
    expect(hasLoggedErrors()).toBe(false);
    expect(getErrorCount()).toBe(0);

    logError("test-context", new Error("something broke"));

    expect(hasLoggedErrors()).toBe(true);
    expect(getErrorCount()).toBe(1);

    const content = await readFile(getLogPath(), "utf-8");
    expect(content).toContain("ERROR");
    expect(content).toContain("test-context");
    expect(content).toContain("something broke");
  });

  it("logWarn writes to the log file", async () => {
    const { logWarn, getLogPath, resetLogState, hasLoggedErrors } =
      await import("./logger.ts");

    resetLogState();

    logWarn("test-warn", "some warning message");

    // Warnings don't count as errors
    expect(hasLoggedErrors()).toBe(false);

    const content = await readFile(getLogPath(), "utf-8");
    expect(content).toContain("WARN");
    expect(content).toContain("test-warn");
    expect(content).toContain("some warning message");
  });

  it("logError handles non-Error values", async () => {
    const { logError, getLogPath, resetLogState } = await import("./logger.ts");

    resetLogState();

    logError("string-error", "plain string error");
    logError("object-error", { code: 42 });

    const content = await readFile(getLogPath(), "utf-8");
    expect(content).toContain("plain string error");
    expect(content).toContain("42");
  });

  it("resetLogState clears counters", async () => {
    const { logError, getErrorCount, hasLoggedErrors, resetLogState } =
      await import("./logger.ts");

    logError("ctx", new Error("err"));
    expect(getErrorCount()).toBeGreaterThan(0);

    resetLogState();
    expect(getErrorCount()).toBe(0);
    expect(hasLoggedErrors()).toBe(false);
  });

  it("printLogHint prints nothing when no errors were logged", async () => {
    const { spyOn } = await import("bun:test");
    const { printLogHint, resetLogState } = await import("./logger.ts");

    resetLogState();

    const spy = spyOn(console, "error").mockImplementation(() => {});
    printLogHint();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("printLogHint prints log path when errors were logged", async () => {
    const { spyOn } = await import("bun:test");
    const { printLogHint, logError, getLogPath, resetLogState } =
      await import("./logger.ts");

    resetLogState();

    logError("test-hint", new Error("boom"));

    const spy = spyOn(console, "error").mockImplementation(() => {});
    printLogHint();
    expect(spy).toHaveBeenCalled();

    const output = spy.mock.calls[0]![0] as string;
    expect(output).toContain("1 error");
    expect(output).toContain("See log for details");
    expect(output).toContain(getLogPath());
    spy.mockRestore();
  });
});
