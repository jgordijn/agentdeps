/**
 * Unit tests for managed directory sync.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
  readdir,
  readlink,
  lstat,
  readFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { syncManagedDir } from "./managed.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-managed-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("syncManagedDir — link mode", () => {
  it("creates symlinks for desired items", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const source1 = join(tempDir, "source1");
    const source2 = join(tempDir, "source2");
    await mkdir(source1);
    await mkdir(source2);
    await writeFile(join(source1, "file.md"), "skill 1");
    await writeFile(join(source2, "file.md"), "skill 2");

    const desired = new Map([
      ["skill-1", source1],
      ["skill-2", source2],
    ]);

    const summary = await syncManagedDir(managedDir, desired, "link");

    expect(summary.added).toEqual(["skill-1", "skill-2"]);
    expect(summary.removed).toEqual([]);

    // Verify symlinks
    const stat1 = await lstat(join(managedDir, "skill-1"));
    expect(stat1.isSymbolicLink()).toBe(true);
    const target1 = await readlink(join(managedDir, "skill-1"));
    expect(target1).toBe(source1);
  });

  it("prunes stale items", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const source = join(tempDir, "source");
    await mkdir(source);
    await writeFile(join(source, "file.md"), "content");

    // Initial install with two items
    const desired1 = new Map([
      ["keep", source],
      ["remove", source],
    ]);
    await syncManagedDir(managedDir, desired1, "link");

    // Remove one
    const desired2 = new Map([["keep", source]]);
    const summary = await syncManagedDir(managedDir, desired2, "link");

    expect(summary.removed).toEqual(["remove"]);
    const entries = await readdir(managedDir);
    expect(entries).toEqual(["keep"]);
  });

  it("is idempotent", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const source = join(tempDir, "source");
    await mkdir(source);

    const desired = new Map([["skill", source]]);

    await syncManagedDir(managedDir, desired, "link");
    const summary = await syncManagedDir(managedDir, desired, "link");

    expect(summary.added).toEqual([]);
    expect(summary.removed).toEqual([]);
    expect(summary.unchanged).toEqual(["skill"]);
  });
});

describe("syncManagedDir — copy mode", () => {
  it("copies desired items", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const source = join(tempDir, "source");
    await mkdir(source);
    await writeFile(join(source, "SKILL.md"), "# My Skill");

    const desired = new Map([["my-skill", source]]);
    const summary = await syncManagedDir(managedDir, desired, "copy");

    expect(summary.added).toEqual(["my-skill"]);

    // Verify copy (not symlink)
    const stat = await lstat(join(managedDir, "my-skill"));
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isDirectory()).toBe(true);

    const content = await readFile(
      join(managedDir, "my-skill", "SKILL.md"),
      "utf-8"
    );
    expect(content).toBe("# My Skill");
  });

  it("prunes stale items in copy mode", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const source = join(tempDir, "source");
    await mkdir(source);
    await writeFile(join(source, "file.md"), "content");

    const desired1 = new Map([
      ["keep", source],
      ["remove", source],
    ]);
    await syncManagedDir(managedDir, desired1, "copy");

    const desired2 = new Map([["keep", source]]);
    const summary = await syncManagedDir(managedDir, desired2, "copy");

    expect(summary.removed).toEqual(["remove"]);
  });
});
