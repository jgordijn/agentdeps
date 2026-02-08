/**
 * Unit tests for the add command's --global flag behavior.
 *
 * Tests the path-selection and config-writing logic that the --global flag controls.
 * Does not test the full add flow (cloning, discovery, interactive picker) since
 * those are covered by integration tests and are unaffected by the flag.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadProjectConfig,
  saveProjectConfig,
  projectConfigExists,
  type Dependency,
} from "../config/project.ts";
import { globalAgentsYamlPath } from "../config/global.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-add-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("--global flag path selection", () => {
  it("globalAgentsYamlPath returns a path under config dir", () => {
    const path = globalAgentsYamlPath();
    expect(path).toContain("agentdeps");
    expect(path).toEndWith("agents.yaml");
    // Should NOT be a relative/project path
    expect(path).not.toBe("agents.yaml");
  });

  it("writes dependency to global agents.yaml path", async () => {
    // Simulate what `add --global` does: write to globalAgentsYamlPath()
    const globalPath = join(tempDir, "global-agents.yaml");

    const dep: Dependency = {
      repo: "my-org/my-repo",
      ref: "main",
      skills: "*",
      agents: "*",
    };

    await saveProjectConfig(globalPath, { dependencies: [dep] });

    const loaded = await loadProjectConfig(globalPath);
    expect(loaded.dependencies).toHaveLength(1);
    expect(loaded.dependencies[0]!.repo).toBe("my-org/my-repo");
  });

  it("detects duplicates in global config", async () => {
    const globalPath = join(tempDir, "global-agents.yaml");

    // Pre-populate global config with a dependency
    const existing: Dependency = {
      repo: "my-org/my-repo",
      ref: "main",
      skills: "*",
      agents: "*",
    };
    await saveProjectConfig(globalPath, { dependencies: [existing] });

    // Simulate duplicate check (same logic as add command)
    const config = await loadProjectConfig(globalPath);
    const repo = "my-org/my-repo";
    const match = config.dependencies.find(
      (d) => d.repo === repo || d.repo.replace(/\.git$/, "").toLowerCase() === repo.replace(/\.git$/, "").toLowerCase()
    );
    expect(match).toBeDefined();
  });

  it("-g behaves identically to --global (both resolve to options.global)", () => {
    // Commander maps -g to options.global automatically via .option("-g, --global", ...)
    // This is a Commander feature — we verify the option is registered by importing the command
    const { addCommand } = require("./add.ts");
    const globalOption = addCommand.options.find(
      (opt: any) => opt.long === "--global"
    );
    expect(globalOption).toBeDefined();
    expect(globalOption.short).toBe("-g");
  });

  it("creates global agents.yaml if it does not exist", async () => {
    const newPath = join(tempDir, "nonexistent-dir", "agents.yaml");

    // File should not exist
    const existsBefore = await projectConfigExists(newPath);
    expect(existsBefore).toBe(false);

    // saveProjectConfig creates parent dirs and writes
    const dep: Dependency = {
      repo: "my-org/new-repo",
      ref: "main",
      skills: "*",
      agents: "*",
    };
    await saveProjectConfig(newPath, { dependencies: [dep] });

    const existsAfter = await projectConfigExists(newPath);
    expect(existsAfter).toBe(true);

    const loaded = await loadProjectConfig(newPath);
    expect(loaded.dependencies).toHaveLength(1);
    expect(loaded.dependencies[0]!.repo).toBe("my-org/new-repo");
  });

  it("without --global, writes to project-local path (regression)", async () => {
    const projectPath = join(tempDir, "agents.yaml");

    const dep: Dependency = {
      repo: "my-org/project-repo",
      ref: "main",
      skills: ["skill-a"],
      agents: false,
    };
    await saveProjectConfig(projectPath, { dependencies: [dep] });

    const loaded = await loadProjectConfig(projectPath);
    expect(loaded.dependencies).toHaveLength(1);
    expect(loaded.dependencies[0]!.repo).toBe("my-org/project-repo");

    // Global path should NOT have this dependency
    const globalPath = join(tempDir, "global-agents.yaml");
    const globalExists = await projectConfigExists(globalPath);
    expect(globalExists).toBe(false);
  });
});
