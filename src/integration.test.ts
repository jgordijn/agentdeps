/**
 * Integration test — exercises the full install flow with a local git repo.
 *
 * Creates a temp git repo with skills and agents, then runs:
 * clone → discover → install → prune
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
  readFile,
  readdir,
  lstat,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureRepo, getCacheDir } from "./cache/cache.ts";
import { discoverSkills, discoverAgents, filterItems } from "./discovery/discovery.ts";
import { syncManagedDir } from "./install/managed.ts";
import { cleanupLegacyManagedDirs } from "./install/migration.ts";
import { resetRegistry } from "./registry/registry.ts";
import { resetLogState, hasLoggedErrors, getLogPath } from "./log/logger.ts";

let tempDir: string;
let repoDir: string;

/** Cache keys used by tests — cleaned up in afterEach */
const testCacheKeys = ["test-integration", "test-update-fail", "test-bad-ref"];

async function runGit(args: string[], cwd: string): Promise<void> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
}

beforeEach(async () => {
  resetRegistry();
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-integration-"));
  repoDir = join(tempDir, "test-repo");

  // Create a local git repo with skills and agents
  await mkdir(repoDir, { recursive: true });
  await runGit(["init", "-b", "main"], repoDir);
  await runGit(["config", "user.email", "test@test.com"], repoDir);
  await runGit(["config", "user.name", "Test"], repoDir);

  // Add skills
  await mkdir(join(repoDir, "skills", "my-skill"), { recursive: true });
  await writeFile(
    join(repoDir, "skills", "my-skill", "SKILL.md"),
    "# My Skill\nA test skill."
  );

  await mkdir(join(repoDir, "skills", "another-skill"), { recursive: true });
  await writeFile(
    join(repoDir, "skills", "another-skill", "SKILL.md"),
    "# Another Skill"
  );

  // Add agents
  await mkdir(join(repoDir, "agents", "test-agent"), { recursive: true });
  await writeFile(
    join(repoDir, "agents", "test-agent", "agent.md"),
    "# Test Agent"
  );

  await runGit(["add", "."], repoDir);
  await runGit(["commit", "-m", "initial"], repoDir);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
  // Clean up cached repos to prevent cross-test contamination
  const cacheDir = getCacheDir();
  for (const key of testCacheKeys) {
    await rm(join(cacheDir, key), { recursive: true, force: true });
  }
});

describe("full install flow", () => {
  it("clones, discovers, installs, and prunes", async () => {
    // 1. Clone the local repo
    const cacheDir = join(tempDir, "cache");
    await mkdir(cacheDir, { recursive: true });

    await ensureRepo(repoDir, "main", `test-integration`);
    // The ensureRepo uses its own cache dir, but we can test discovery on the repoDir directly

    // 2. Discover skills and agents
    const skills = await discoverSkills(repoDir);
    expect(skills.map((s) => s.name)).toEqual(["another-skill", "my-skill"]);

    const agents = await discoverAgents(repoDir);
    expect(agents.map((a) => a.name)).toEqual(["test-agent"]);

    // 3. Filter (all)
    const skillResult = filterItems(skills, "*");
    expect(skillResult.selected.map((s) => s.name)).toEqual(["another-skill", "my-skill"]);

    const agentResult = filterItems(agents, "*");
    expect(agentResult.selected.map((a) => a.name)).toEqual(["test-agent"]);

    // 4. Install to managed dir (pi now uses .agents/ paths)
    const managedSkillsDir = join(tempDir, "project", ".agents", "skills", "_agentdeps_managed");
    const managedAgentsDir = join(tempDir, "project", ".agents", "agents", "_agentdeps_managed");

    const desiredSkills = new Map(
      skillResult.selected.map((item) => [item.name, item.sourcePath] as const)
    );

    const desiredAgents = new Map(
      agentResult.selected.map((item) => [item.name, item.sourcePath] as const)
    );

    const skillSummary = await syncManagedDir(managedSkillsDir, desiredSkills, "link");
    expect(skillSummary.added).toEqual(["another-skill", "my-skill"]);

    const agentSummary = await syncManagedDir(managedAgentsDir, desiredAgents, "link");
    expect(agentSummary.added).toEqual(["test-agent"]);

    // Verify symlinks
    const skillEntries = await readdir(managedSkillsDir);
    expect(skillEntries.sort()).toEqual(["another-skill", "my-skill"]);

    const stat = await lstat(join(managedSkillsDir, "my-skill"));
    expect(stat.isSymbolicLink()).toBe(true);

    // 5. Prune: remove one skill from desired set
    const prunedSkills = new Map([
      ["my-skill", join(repoDir, "skills", "my-skill")],
    ]);

    const pruneSummary = await syncManagedDir(managedSkillsDir, prunedSkills, "link");
    expect(pruneSummary.removed).toEqual(["another-skill"]);
    expect(pruneSummary.unchanged).toEqual(["my-skill"]);

    const afterPrune = await readdir(managedSkillsDir);
    expect(afterPrune).toEqual(["my-skill"]);
  });

  it("fails when cache update fails (e.g. broken remote)", async () => {
    resetLogState();

    // 1. Clone successfully with the real repo
    const result1 = await ensureRepo(repoDir, "main", "test-update-fail");
    expect(result1.success).toBe(true);

    // 2. Break the origin remote so the next fetch will fail.
    //    updateRepo uses `git fetch origin` on the cached repo,
    //    so we point origin at a non-existent path.
    const cachedRepoPath = result1.path;
    await runGit(["remote", "set-url", "origin", "/nonexistent/path"], cachedRepoPath);

    // 3. Call ensureRepo again with the same cacheKey.
    //    The cache dir exists → updateRepo → fetch fails → logError → returns failure.
    const result2 = await ensureRepo(repoDir, "main", "test-update-fail");

    // Should fail — invalid refs and broken remotes must not silently succeed
    expect(result2.success).toBe(false);
    expect(result2.error).toBeDefined();

    // The failed update should have been logged
    expect(hasLoggedErrors()).toBe(true);

    const logContent = await readFile(getLogPath(), "utf-8");
    expect(logContent).toContain("cache.update");
  });

  it("fails when a non-existent ref is specified", async () => {
    // Attempt to clone with a ref that doesn't exist
    const result = await ensureRepo(repoDir, "nonexistent-branch", "test-bad-ref");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});


describe("legacy path migration", () => {
  it("cleans up legacy managed dirs and installs to .agents/", async () => {
    const projectDir = join(tempDir, "project");

    // Simulate existing legacy managed dirs at old Pi paths
    const legacySkillsManaged = join(projectDir, ".pi/skills/_agentdeps_managed/my-skill");
    const legacyAgentsManaged = join(projectDir, ".pi/agents/_agentdeps_managed/test-agent");
    await mkdir(legacySkillsManaged, { recursive: true });
    await mkdir(legacyAgentsManaged, { recursive: true });
    await writeFile(join(legacySkillsManaged, "SKILL.md"), "old");

    // Run migration from the project directory
    const originalCwd = process.cwd();
    process.chdir(projectDir);
    try {
      await cleanupLegacyManagedDirs(["pi"]);
    } finally {
      process.chdir(originalCwd);
    }

    // Legacy managed dirs should be gone
    const piSkillsEntries = await readdir(join(projectDir, ".pi/skills"));
    expect(piSkillsEntries).not.toContain("_agentdeps_managed");

    const piAgentsEntries = await readdir(join(projectDir, ".pi/agents"));
    expect(piAgentsEntries).not.toContain("_agentdeps_managed");

    // Now install skills to the new .agents/ path
    const skills = await discoverSkills(repoDir);
    const skillResult = filterItems(skills, "*");

    const newManagedDir = join(projectDir, ".agents/skills/_agentdeps_managed");
    const desiredSkills = new Map(
      skillResult.selected.map((item) => [item.name, item.sourcePath] as const)
    );

    const summary = await syncManagedDir(newManagedDir, desiredSkills, "link");
    expect(summary.added).toEqual(["another-skill", "my-skill"]);

    // Verify new location has the skills
    const newEntries = await readdir(newManagedDir);
    expect(newEntries.sort()).toEqual(["another-skill", "my-skill"]);
  });
});