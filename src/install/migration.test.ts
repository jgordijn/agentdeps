/**
 * Tests for legacy path migration.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cleanupLegacyManagedDirs } from "./migration.ts";
import { resetRegistry } from "../registry/registry.ts";

let tempDir: string;

beforeEach(async () => {
  resetRegistry();
  tempDir = await mkdtemp(join(tmpdir(), "migration-test-"));
  // Change to temp dir so relative paths resolve there
  process.chdir(tempDir);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("cleanupLegacyManagedDirs", () => {
  it("removes pi legacy managed skills directory", async () => {
    const managedDir = join(tempDir, ".pi/skills/_agentdeps_managed");
    await mkdir(managedDir, { recursive: true });
    await writeFile(join(managedDir, "some-skill"), "test");

    await cleanupLegacyManagedDirs(["pi"]);

    const entries = await readdir(join(tempDir, ".pi/skills"));
    expect(entries).not.toContain("_agentdeps_managed");
  });

  it("removes pi legacy managed agents directory", async () => {
    const managedDir = join(tempDir, ".pi/agents/_agentdeps_managed");
    await mkdir(managedDir, { recursive: true });
    await writeFile(join(managedDir, "some-agent"), "test");

    await cleanupLegacyManagedDirs(["pi"]);

    const entries = await readdir(join(tempDir, ".pi/agents"));
    expect(entries).not.toContain("_agentdeps_managed");
  });

  it("removes opencode legacy managed directories", async () => {
    const skillsManaged = join(tempDir, ".opencode/skills/_agentdeps_managed");
    const agentsManaged = join(tempDir, ".opencode/agents/_agentdeps_managed");
    await mkdir(skillsManaged, { recursive: true });
    await mkdir(agentsManaged, { recursive: true });

    await cleanupLegacyManagedDirs(["opencode"]);

    const skillEntries = await readdir(join(tempDir, ".opencode/skills"));
    const agentEntries = await readdir(join(tempDir, ".opencode/agents"));
    expect(skillEntries).not.toContain("_agentdeps_managed");
    expect(agentEntries).not.toContain("_agentdeps_managed");
  });

  it("silently skips non-existent legacy directories", async () => {
    // No directories created — should not throw
    await cleanupLegacyManagedDirs(["pi", "opencode"]);
  });

  it("does not remove parent directories or user content", async () => {
    const piSkills = join(tempDir, ".pi/skills");
    await mkdir(join(piSkills, "_agentdeps_managed"), { recursive: true });
    await writeFile(join(piSkills, "my-custom-skill.md"), "user content");

    await cleanupLegacyManagedDirs(["pi"]);

    const entries = await readdir(piSkills);
    expect(entries).toContain("my-custom-skill.md");
    expect(entries).not.toContain("_agentdeps_managed");
  });

  it("does not touch unconfigured agents", async () => {
    const managedDir = join(tempDir, ".pi/skills/_agentdeps_managed");
    await mkdir(managedDir, { recursive: true });
    await writeFile(join(managedDir, "some-skill"), "test");

    // Only claude-code configured, not pi
    await cleanupLegacyManagedDirs(["claude-code"]);

    const entries = await readdir(join(tempDir, ".pi/skills"));
    expect(entries).toContain("_agentdeps_managed");
  });
});
