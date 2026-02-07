/**
 * Unit tests for smart copy sync.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
  readFile,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { smartSync } from "./copy.ts";

let tempDir: string;
let srcDir: string;
let dstDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-copy-test-"));
  srcDir = join(tempDir, "src");
  dstDir = join(tempDir, "dst");
  await mkdir(srcDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("smartSync", () => {
  it("copies new files", async () => {
    await writeFile(join(srcDir, "file1.txt"), "hello");
    await writeFile(join(srcDir, "file2.txt"), "world");

    await smartSync(srcDir, dstDir);

    const content1 = await readFile(join(dstDir, "file1.txt"), "utf-8");
    const content2 = await readFile(join(dstDir, "file2.txt"), "utf-8");
    expect(content1).toBe("hello");
    expect(content2).toBe("world");
  });

  it("copies subdirectories recursively", async () => {
    await mkdir(join(srcDir, "sub"), { recursive: true });
    await writeFile(join(srcDir, "sub", "nested.txt"), "nested");

    await smartSync(srcDir, dstDir);

    const content = await readFile(join(dstDir, "sub", "nested.txt"), "utf-8");
    expect(content).toBe("nested");
  });

  it("overwrites changed files", async () => {
    await writeFile(join(srcDir, "file.txt"), "original");
    await smartSync(srcDir, dstDir);

    // Modify source
    await writeFile(join(srcDir, "file.txt"), "updated content");
    await smartSync(srcDir, dstDir);

    const content = await readFile(join(dstDir, "file.txt"), "utf-8");
    expect(content).toBe("updated content");
  });

  it("removes deleted files", async () => {
    await writeFile(join(srcDir, "keep.txt"), "keep");
    await writeFile(join(srcDir, "remove.txt"), "remove");
    await smartSync(srcDir, dstDir);

    // Remove from source
    await rm(join(srcDir, "remove.txt"));
    await smartSync(srcDir, dstDir);

    const entries = await readdir(dstDir);
    expect(entries).toEqual(["keep.txt"]);
  });

  it("removes deleted subdirectories", async () => {
    await mkdir(join(srcDir, "sub"), { recursive: true });
    await writeFile(join(srcDir, "sub", "file.txt"), "content");
    await writeFile(join(srcDir, "root.txt"), "root");
    await smartSync(srcDir, dstDir);

    // Remove subdirectory from source
    await rm(join(srcDir, "sub"), { recursive: true });
    await smartSync(srcDir, dstDir);

    const entries = await readdir(dstDir);
    expect(entries).toEqual(["root.txt"]);
  });
});
