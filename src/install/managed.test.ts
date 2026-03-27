/**
 * Unit tests for managed directory sync.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
  readlink,
  lstat,
  readFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { syncManagedDir, expandHomePath } from "./managed.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-managed-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("expandHomePath", () => {
  it("expands the home shorthand and leaves other paths unchanged", () => {
    expect(expandHomePath("~/agentdeps-test")).not.toBe("~/agentdeps-test");
    expect(expandHomePath("/tmp/agentdeps-test")).toBe("/tmp/agentdeps-test");
  });
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
    expect(summary.updated).toEqual([]);
    expect(summary.removed).toEqual([]);
    expect(summary.unchanged).toEqual([]);

    const stat1 = await lstat(join(managedDir, "skill-1"));
    expect(stat1.isSymbolicLink()).toBe(true);
    const target1 = await readlink(join(managedDir, "skill-1"));
    expect(target1).toBe(source1);
  });

  it("classifies added, updated, removed, and unchanged items", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const keepSource = join(tempDir, "keep-source");
    const oldUpdateSource = join(tempDir, "old-update-source");
    const newUpdateSource = join(tempDir, "new-update-source");
    const addSource = join(tempDir, "add-source");

    for (const dir of [keepSource, oldUpdateSource, newUpdateSource, addSource]) {
      await mkdir(dir);
      await writeFile(join(dir, "file.md"), dir);
    }

    await syncManagedDir(
      managedDir,
      new Map([
        ["keep", keepSource],
        ["update", oldUpdateSource],
        ["remove", oldUpdateSource],
      ]),
      "link"
    );

    const summary = await syncManagedDir(
      managedDir,
      new Map([
        ["keep", keepSource],
        ["update", newUpdateSource],
        ["add", addSource],
      ]),
      "link"
    );

    expect(summary.added).toEqual(["add"]);
    expect(summary.updated).toEqual(["update"]);
    expect(summary.removed).toEqual(["remove"]);
    expect(summary.unchanged).toEqual(["keep"]);
  });

  it("is idempotent", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const source = join(tempDir, "source");
    await mkdir(source);

    const desired = new Map([["skill", source]]);

    await syncManagedDir(managedDir, desired, "link");
    const summary = await syncManagedDir(managedDir, desired, "link");

    expect(summary.added).toEqual([]);
    expect(summary.updated).toEqual([]);
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
    expect(summary.updated).toEqual([]);
    expect(summary.removed).toEqual([]);
    expect(summary.unchanged).toEqual([]);

    const stat = await lstat(join(managedDir, "my-skill"));
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.isDirectory()).toBe(true);

    const content = await readFile(
      join(managedDir, "my-skill", "SKILL.md"),
      "utf-8"
    );
    expect(content).toBe("# My Skill");
  });

  it("classifies updated and unchanged items for existing targets", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const stableSource = join(tempDir, "stable-source");
    const changingSource = join(tempDir, "changing-source");
    await mkdir(stableSource);
    await mkdir(changingSource);
    await writeFile(join(stableSource, "SKILL.md"), "# Stable Skill");
    await writeFile(join(changingSource, "SKILL.md"), "# Old Skill");

    const desired = new Map([
      ["stable", stableSource],
      ["changing", changingSource],
    ]);

    await syncManagedDir(managedDir, desired, "copy");

    await writeFile(join(changingSource, "SKILL.md"), "# Updated Skill with more content");
    const summary = await syncManagedDir(managedDir, desired, "copy");

    expect(summary.added).toEqual([]);
    expect(summary.updated).toEqual(["changing"]);
    expect(summary.removed).toEqual([]);
    expect(summary.unchanged).toEqual(["stable"]);
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

    expect(summary.added).toEqual([]);
    expect(summary.updated).toEqual([]);
    expect(summary.removed).toEqual(["remove"]);
    expect(summary.unchanged).toEqual(["keep"]);
  });

  it("is idempotent in copy mode", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const source = join(tempDir, "source");
    await mkdir(source);
    await writeFile(join(source, "SKILL.md"), "# My Skill");

    const desired = new Map([["my-skill", source]]);
    await syncManagedDir(managedDir, desired, "copy");
    const summary = await syncManagedDir(managedDir, desired, "copy");

    expect(summary.added).toEqual([]);
    expect(summary.updated).toEqual([]);
    expect(summary.removed).toEqual([]);
    expect(summary.unchanged).toEqual(["my-skill"]);
  });

  it("preserves file extensions for file-based items and removes empty managed dirs", async () => {
    const managedDir = join(tempDir, "_agentdeps_managed");
    const sourceFile = join(tempDir, "helper-agent.md");
    await writeFile(sourceFile, "# Helper Agent");

    const installSummary = await syncManagedDir(
      managedDir,
      new Map([["helper-agent", sourceFile]]),
      "copy"
    );
    expect(installSummary.added).toEqual(["helper-agent"]);
    expect(await readFile(join(managedDir, "helper-agent.md"), "utf-8")).toBe("# Helper Agent");

    const removeSummary = await syncManagedDir(managedDir, new Map(), "copy");
    expect(removeSummary.removed).toEqual(["helper-agent.md"]);
    await expect(lstat(managedDir)).rejects.toThrow();
  });
});
