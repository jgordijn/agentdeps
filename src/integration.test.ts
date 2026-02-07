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
  readdir,
  lstat,
  readlink,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureRepo } from "./cache/cache.ts";
import { discoverSkills, discoverAgents, filterItems } from "./discovery/discovery.ts";
import { syncManagedDir } from "./install/managed.ts";

let tempDir: string;
let repoDir: string;

async function runGit(args: string[], cwd: string): Promise<void> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-integration-"));
  repoDir = join(tempDir, "test-repo");

  // Create a local git repo with skills and agents
  await mkdir(repoDir, { recursive: true });
  await runGit(["init"], repoDir);
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
});

describe("full install flow", () => {
  it("clones, discovers, installs, and prunes", async () => {
    // 1. Clone the local repo
    const cacheDir = join(tempDir, "cache");
    await mkdir(cacheDir, { recursive: true });

    const result = await ensureRepo(repoDir, "main", `test-integration`);
    // The ensureRepo uses its own cache dir, but we can test discovery on the repoDir directly

    // 2. Discover skills and agents
    const skills = await discoverSkills(repoDir);
    expect(skills).toEqual(["another-skill", "my-skill"]);

    const agents = await discoverAgents(repoDir);
    expect(agents).toEqual(["test-agent"]);

    // 3. Filter (all)
    const skillResult = filterItems(skills, "*");
    expect(skillResult.selected).toEqual(["another-skill", "my-skill"]);

    const agentResult = filterItems(agents, "*");
    expect(agentResult.selected).toEqual(["test-agent"]);

    // 4. Install to managed dir
    const managedSkillsDir = join(tempDir, "project", ".pi", "skills", "_agentdeps_managed");
    const managedAgentsDir = join(tempDir, "project", ".pi", "agents", "_agentdeps_managed");

    const desiredSkills = new Map(
      skillResult.selected.map((name) => [
        name,
        join(repoDir, "skills", name),
      ])
    );

    const desiredAgents = new Map(
      agentResult.selected.map((name) => [
        name,
        join(repoDir, "agents", name),
      ])
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
});
