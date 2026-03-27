/**
 * Integration test — exercises the full install flow with a local git repo.
 *
 * Creates a temp git repo with skills and agents, then runs:
 * clone → discover → install → prune
 */
import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
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
import { deriveCacheKey } from "./cache/url.ts";
import { discoverSkills, discoverAgents, filterItems } from "./discovery/discovery.ts";
import { syncManagedDir } from "./install/managed.ts";
import { cleanupLegacyManagedDirs } from "./install/migration.ts";
import { resetRegistry } from "./registry/registry.ts";
import { resetLogState, hasLoggedErrors, getLogPath } from "./log/logger.ts";
import { saveProjectConfig } from "./config/project.ts";
import type { GlobalConfig } from "./config/global.ts";
import { runInstall } from "./commands/install.ts";

let tempDir: string;
let repoDir: string;
let testCacheKeys: string[];

const GIT_ENV_VARS_TO_UNSET = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_NAMESPACE",
  "GIT_PREFIX",
  "GIT_SUPER_PREFIX",
] as const;

function gitTestEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of GIT_ENV_VARS_TO_UNSET) {
    delete env[key];
  }
  return env;
}

async function runGit(args: string[], cwd: string): Promise<void> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    env: gitTestEnv(),
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
}

function createCacheKey(prefix: string): string {
  const key = `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  testCacheKeys.push(key);
  return key;
}

beforeEach(async () => {
  resetRegistry();
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-integration-"));
  repoDir = join(tempDir, "test-repo");
  testCacheKeys = [];

  await mkdir(repoDir, { recursive: true });
  await runGit(["init", "-b", "main"], repoDir);
  await runGit(["config", "user.email", "test@test.com"], repoDir);
  await runGit(["config", "user.name", "Test"], repoDir);

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
  const cacheDir = getCacheDir();
  for (const key of testCacheKeys) {
    await rm(join(cacheDir, key), { recursive: true, force: true });
  }
});

describe("full install flow", () => {
  test.serial("clones, discovers, installs, and prunes", async () => {
    const cacheDir = join(tempDir, "cache");
    await mkdir(cacheDir, { recursive: true });

    await ensureRepo(repoDir, "main", createCacheKey("test-integration"));

    const skills = await discoverSkills(repoDir);
    expect(skills.map((s) => s.name)).toEqual(["another-skill", "my-skill"]);

    const agents = await discoverAgents(repoDir);
    expect(agents.map((a) => a.name)).toEqual(["test-agent"]);

    const skillResult = filterItems(skills, "*");
    expect(skillResult.selected.map((s) => s.name)).toEqual(["another-skill", "my-skill"]);

    const agentResult = filterItems(agents, "*");
    expect(agentResult.selected.map((a) => a.name)).toEqual(["test-agent"]);

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
    expect(skillSummary.updated).toEqual([]);

    const agentSummary = await syncManagedDir(managedAgentsDir, desiredAgents, "link");
    expect(agentSummary.added).toEqual(["test-agent"]);
    expect(agentSummary.updated).toEqual([]);

    const skillEntries = await readdir(managedSkillsDir);
    expect(skillEntries.sort()).toEqual(["another-skill", "my-skill"]);

    const stat = await lstat(join(managedSkillsDir, "my-skill"));
    expect(stat.isSymbolicLink()).toBe(true);

    const prunedSkills = new Map([
      ["my-skill", join(repoDir, "skills", "my-skill")],
    ]);

    const pruneSummary = await syncManagedDir(managedSkillsDir, prunedSkills, "link");
    expect(pruneSummary.added).toEqual([]);
    expect(pruneSummary.updated).toEqual([]);
    expect(pruneSummary.removed).toEqual(["another-skill"]);
    expect(pruneSummary.unchanged).toEqual(["my-skill"]);

    const afterPrune = await readdir(managedSkillsDir);
    expect(afterPrune).toEqual(["my-skill"]);
  });

  test.serial("prints changed managed skill names after a repository update", async () => {
    const config: GlobalConfig = {
      clone_method: "https",
      agents: ["pi"],
      install_method: "link",
    };
    const projectDir = join(tempDir, "project");
    const projectConfigPath = join(projectDir, "agents.yaml");
    const cacheKey = deriveCacheKey(repoDir, "main");
    testCacheKeys.push(cacheKey);

    const originalCwd = process.cwd();
    const originalXdgConfigHome = process.env["XDG_CONFIG_HOME"];
    const originalXdgStateHome = process.env["XDG_STATE_HOME"];
    process.env["XDG_CONFIG_HOME"] = join(tempDir, "xdg-config");
    process.env["XDG_STATE_HOME"] = join(tempDir, "xdg-state");
    await mkdir(projectDir, { recursive: true });
    await saveProjectConfig(projectConfigPath, {
      dependencies: [
        {
          repo: repoDir,
          ref: "main",
          skills: "*",
          agents: false,
        },
      ],
    });

    const logSpy = spyOn(console, "log").mockImplementation(() => {});

    let output = "";
    try {
      process.chdir(projectDir);
      await runInstall(config);

      await writeFile(
        join(repoDir, "skills", "my-skill", "SKILL.md"),
        "# My Skill\nUpdated content"
      );
      await rm(join(repoDir, "skills", "another-skill"), {
        recursive: true,
        force: true,
      });
      await mkdir(join(repoDir, "skills", "new-skill"), { recursive: true });
      await writeFile(
        join(repoDir, "skills", "new-skill", "SKILL.md"),
        "# New Skill"
      );
      await runGit(["add", "."], repoDir);
      await runGit(["commit", "-m", "update skills"], repoDir);

      logSpy.mockClear();
      await runInstall(config);
      output = logSpy.mock.calls
        .flatMap((call) => call.map((value) => String(value)))
        .join("\n");
    } finally {
      process.chdir(originalCwd);
      if (originalXdgConfigHome === undefined) {
        delete process.env["XDG_CONFIG_HOME"];
      } else {
        process.env["XDG_CONFIG_HOME"] = originalXdgConfigHome;
      }
      if (originalXdgStateHome === undefined) {
        delete process.env["XDG_STATE_HOME"];
      } else {
        process.env["XDG_STATE_HOME"] = originalXdgStateHome;
      }
      logSpy.mockRestore();
    }

    expect(output).toContain("skills added: new-skill");
    expect(output).toContain("skills updated: my-skill");
    expect(output).toContain("skills removed: another-skill");

    const managedSkillsDir = join(projectDir, ".agents", "skills", "_agentdeps_managed");
    expect((await readdir(managedSkillsDir)).sort()).toEqual(["my-skill", "new-skill"]);
  });

  test.serial("fails when cache update fails (e.g. broken remote)", async () => {
    resetLogState();

    const updateFailCacheKey = createCacheKey("test-update-fail");
    const result1 = await ensureRepo(repoDir, "main", updateFailCacheKey);
    expect(result1.success).toBe(true);

    const cachedRepoPath = result1.path;
    await runGit(["remote", "set-url", "origin", "/nonexistent/path"], cachedRepoPath);

    const result2 = await ensureRepo(repoDir, "main", updateFailCacheKey);

    expect(result2.success).toBe(false);
    expect(result2.error).toBeDefined();

    expect(hasLoggedErrors()).toBe(true);

    const logContent = await readFile(getLogPath(), "utf-8");
    expect(logContent).toContain("cache.update");
  });

  test.serial("fails when a non-existent ref is specified", async () => {
    const result = await ensureRepo(repoDir, "nonexistent-branch", createCacheKey("test-bad-ref"));

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("legacy path migration", () => {
  test.serial("cleans up legacy managed dirs and installs to .agents/", async () => {
    const projectDir = join(tempDir, "project");

    const legacySkillsManaged = join(projectDir, ".pi/skills/_agentdeps_managed/my-skill");
    const legacyAgentsManaged = join(projectDir, ".pi/agents/_agentdeps_managed/test-agent");
    await mkdir(legacySkillsManaged, { recursive: true });
    await mkdir(legacyAgentsManaged, { recursive: true });
    await writeFile(join(legacySkillsManaged, "SKILL.md"), "old");

    const originalCwd = process.cwd();
    process.chdir(projectDir);
    try {
      await cleanupLegacyManagedDirs(["pi"]);
    } finally {
      process.chdir(originalCwd);
    }

    const piSkillsEntries = await readdir(join(projectDir, ".pi/skills"));
    expect(piSkillsEntries).not.toContain("_agentdeps_managed");

    const piAgentsEntries = await readdir(join(projectDir, ".pi/agents"));
    expect(piAgentsEntries).not.toContain("_agentdeps_managed");

    const skills = await discoverSkills(repoDir);
    const skillResult = filterItems(skills, "*");

    const newManagedDir = join(projectDir, ".agents/skills/_agentdeps_managed");
    const desiredSkills = new Map(
      skillResult.selected.map((item) => [item.name, item.sourcePath] as const)
    );

    const summary = await syncManagedDir(newManagedDir, desiredSkills, "link");
    expect(summary.added).toEqual(["another-skill", "my-skill"]);
    expect(summary.updated).toEqual([]);

    const newEntries = await readdir(newManagedDir);
    expect(newEntries.sort()).toEqual(["another-skill", "my-skill"]);
  });
});
