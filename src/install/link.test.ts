/**
 * Unit tests for symlink operations.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, rm, readlink, lstat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSymlink, ensureSymlink } from "./link.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-link-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("createSymlink", () => {
  it("creates a symlink to a directory", async () => {
    const target = join(tempDir, "target");
    const link = join(tempDir, "link");
    await mkdir(target);
    await writeFile(join(target, "file.txt"), "hello");

    await createSymlink(target, link);

    const stat = await lstat(link);
    expect(stat.isSymbolicLink()).toBe(true);

    const resolved = await readlink(link);
    expect(resolved).toBe(target);
  });
});

describe("ensureSymlink", () => {
  it("creates symlink when missing", async () => {
    const target = join(tempDir, "target");
    const link = join(tempDir, "link");
    await mkdir(target);

    const result = await ensureSymlink(target, link);
    expect(result).toBe("created");

    const stat = await lstat(link);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it("returns unchanged when symlink is correct", async () => {
    const target = join(tempDir, "target");
    const link = join(tempDir, "link");
    await mkdir(target);
    await createSymlink(target, link);

    const result = await ensureSymlink(target, link);
    expect(result).toBe("unchanged");
  });

  it("replaces symlink when target is wrong", async () => {
    const target1 = join(tempDir, "target1");
    const target2 = join(tempDir, "target2");
    const link = join(tempDir, "link");
    await mkdir(target1);
    await mkdir(target2);
    await createSymlink(target1, link);

    const result = await ensureSymlink(target2, link);
    expect(result).toBe("replaced");

    const resolved = await readlink(link);
    expect(resolved).toBe(target2);
  });
});
