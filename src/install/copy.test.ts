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
  it("returns true when it copies new files", async () => {
    await writeFile(join(srcDir, "file1.txt"), "hello");
    await writeFile(join(srcDir, "file2.txt"), "world");

    const changed = await smartSync(srcDir, dstDir);

    const content1 = await readFile(join(dstDir, "file1.txt"), "utf-8");
    const content2 = await readFile(join(dstDir, "file2.txt"), "utf-8");
    expect(changed).toBe(true);
    expect(content1).toBe("hello");
    expect(content2).toBe("world");
  });

  it("returns true when it copies subdirectories recursively", async () => {
    await mkdir(join(srcDir, "sub"), { recursive: true });
    await writeFile(join(srcDir, "sub", "nested.txt"), "nested");

    const changed = await smartSync(srcDir, dstDir);

    const content = await readFile(join(dstDir, "sub", "nested.txt"), "utf-8");
    expect(changed).toBe(true);
    expect(content).toBe("nested");
  });

  it("returns false when the destination already matches the source", async () => {
    await writeFile(join(srcDir, "file.txt"), "unchanged");
    await smartSync(srcDir, dstDir);

    const changed = await smartSync(srcDir, dstDir);

    expect(changed).toBe(false);
  });

  it("returns true when it overwrites changed files", async () => {
    await writeFile(join(srcDir, "file.txt"), "original");
    await smartSync(srcDir, dstDir);

    await writeFile(join(srcDir, "file.txt"), "updated content that is longer");
    const changed = await smartSync(srcDir, dstDir);

    const content = await readFile(join(dstDir, "file.txt"), "utf-8");
    expect(changed).toBe(true);
    expect(content).toBe("updated content that is longer");
  });

  it("returns true when it removes deleted files", async () => {
    await writeFile(join(srcDir, "keep.txt"), "keep");
    await writeFile(join(srcDir, "remove.txt"), "remove");
    await smartSync(srcDir, dstDir);

    await rm(join(srcDir, "remove.txt"));
    const changed = await smartSync(srcDir, dstDir);

    const entries = await readdir(dstDir);
    expect(changed).toBe(true);
    expect(entries).toEqual(["keep.txt"]);
  });

  it("returns true when it removes deleted subdirectories", async () => {
    await mkdir(join(srcDir, "sub"), { recursive: true });
    await writeFile(join(srcDir, "sub", "file.txt"), "content");
    await writeFile(join(srcDir, "root.txt"), "root");
    await smartSync(srcDir, dstDir);

    await rm(join(srcDir, "sub"), { recursive: true });
    const changed = await smartSync(srcDir, dstDir);

    const entries = await readdir(dstDir);
    expect(changed).toBe(true);
    expect(entries).toEqual(["root.txt"]);
  });

  it("supports single-file sync and reports whether it changed", async () => {
    const srcFile = join(tempDir, "agent.md");
    const outDir = join(tempDir, "out");
    const dstFile = join(outDir, "agent.md");
    await mkdir(outDir, { recursive: true });
    await writeFile(srcFile, "# Agent");

    expect(await smartSync(srcFile, dstFile)).toBe(true);
    expect(await readFile(dstFile, "utf-8")).toBe("# Agent");

    expect(await smartSync(srcFile, dstFile)).toBe(false);

    await writeFile(srcFile, "# Agent updated");
    expect(await smartSync(srcFile, dstFile)).toBe(true);
    expect(await readFile(dstFile, "utf-8")).toBe("# Agent updated");
  });
});
