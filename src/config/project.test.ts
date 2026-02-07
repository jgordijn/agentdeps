/**
 * Unit tests for project config parsing and validation.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadProjectConfig, saveProjectConfig } from "./project.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-config-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("loadProjectConfig", () => {
  it("loads minimal dependency (defaults applied)", async () => {
    const path = join(tempDir, "agents.yaml");
    await writeFile(
      path,
      `dependencies:\n  - repo: my-org/my-repo\n`
    );

    const config = await loadProjectConfig(path);
    expect(config.dependencies).toHaveLength(1);
    expect(config.dependencies[0]!.repo).toBe("my-org/my-repo");
    expect(config.dependencies[0]!.ref).toBe("main");
    expect(config.dependencies[0]!.skills).toBe("*");
    expect(config.dependencies[0]!.agents).toBe("*");
  });

  it("loads full dependency", async () => {
    const path = join(tempDir, "agents.yaml");
    await writeFile(
      path,
      `dependencies:\n  - repo: my-org/my-repo\n    ref: v1.0\n    skills:\n      - skill-a\n    agents: false\n`
    );

    const config = await loadProjectConfig(path);
    expect(config.dependencies[0]!.ref).toBe("v1.0");
    expect(config.dependencies[0]!.skills).toEqual(["skill-a"]);
    expect(config.dependencies[0]!.agents).toBe(false);
  });

  it("handles wildcard skills and agents", async () => {
    const path = join(tempDir, "agents.yaml");
    await writeFile(
      path,
      `dependencies:\n  - repo: my-org/repo\n    skills: "*"\n    agents: "*"\n`
    );

    const config = await loadProjectConfig(path);
    expect(config.dependencies[0]!.skills).toBe("*");
    expect(config.dependencies[0]!.agents).toBe("*");
  });

  it("throws on missing repo field", async () => {
    const path = join(tempDir, "agents.yaml");
    await writeFile(path, `dependencies:\n  - ref: main\n`);

    expect(loadProjectConfig(path)).rejects.toThrow("missing required 'repo' field");
  });

  it("returns empty for empty dependencies", async () => {
    const path = join(tempDir, "agents.yaml");
    await writeFile(path, `dependencies: []\n`);

    const config = await loadProjectConfig(path);
    expect(config.dependencies).toHaveLength(0);
  });

  it("returns empty for no dependencies key", async () => {
    const path = join(tempDir, "agents.yaml");
    await writeFile(path, `foo: bar\n`);

    const config = await loadProjectConfig(path);
    expect(config.dependencies).toHaveLength(0);
  });
});

describe("saveProjectConfig", () => {
  it("writes and reloads config", async () => {
    const path = join(tempDir, "agents.yaml");

    await saveProjectConfig(path, {
      dependencies: [
        { repo: "my-org/repo", ref: "develop", skills: ["a"], agents: false },
      ],
    });

    const loaded = await loadProjectConfig(path);
    expect(loaded.dependencies).toHaveLength(1);
    expect(loaded.dependencies[0]!.repo).toBe("my-org/repo");
    expect(loaded.dependencies[0]!.ref).toBe("develop");
    expect(loaded.dependencies[0]!.skills).toEqual(["a"]);
    expect(loaded.dependencies[0]!.agents).toBe(false);
  });

  it("omits default values for brevity", async () => {
    const path = join(tempDir, "agents.yaml");

    await saveProjectConfig(path, {
      dependencies: [
        { repo: "my-org/repo", ref: "main", skills: "*", agents: "*" },
      ],
    });

    const loaded = await loadProjectConfig(path);
    expect(loaded.dependencies[0]!.ref).toBe("main");
    expect(loaded.dependencies[0]!.skills).toBe("*");
    expect(loaded.dependencies[0]!.agents).toBe("*");
  });
});
