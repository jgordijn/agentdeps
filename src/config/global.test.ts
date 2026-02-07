/**
 * Unit tests for global config management.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlink, copyFile } from "node:fs/promises";

import {
  getConfigDir,
  globalConfigPath,
  globalAgentsYamlPath,
  globalConfigExists,
  loadGlobalConfig,
  saveGlobalConfig,
  type GlobalConfig,
} from "./global.ts";

describe("getConfigDir", () => {
  it("returns a non-empty path containing 'agentdeps'", () => {
    const dir = getConfigDir();
    expect(dir.length).toBeGreaterThan(0);
    expect(dir).toContain("agentdeps");
  });
});

describe("globalConfigPath", () => {
  it("ends with config.yaml", () => {
    const p = globalConfigPath();
    expect(p).toEndWith("config.yaml");
  });

  it("starts with the config dir", () => {
    const p = globalConfigPath();
    expect(p).toStartWith(getConfigDir());
  });
});

describe("globalAgentsYamlPath", () => {
  it("ends with agents.yaml", () => {
    const p = globalAgentsYamlPath();
    expect(p).toEndWith("agents.yaml");
  });

  it("starts with the config dir", () => {
    const p = globalAgentsYamlPath();
    expect(p).toStartWith(getConfigDir());
  });
});

/**
 * Tests that touch the real config file on disk.
 * We back up the existing config before each test and restore it after.
 */
describe("config file operations", () => {
  const configPath = globalConfigPath();
  const backupPath = configPath + ".test-backup";
  let hadExistingConfig = false;

  beforeEach(async () => {
    hadExistingConfig = await Bun.file(configPath).exists();
    if (hadExistingConfig) {
      await copyFile(configPath, backupPath);
    }
  });

  afterEach(async () => {
    if (hadExistingConfig) {
      await copyFile(backupPath, configPath);
      await unlink(backupPath).catch(() => {});
    } else {
      // No config existed before — remove whatever the test created
      await unlink(configPath).catch(() => {});
    }
  });

  describe("globalConfigExists", () => {
    it("returns false when config file is absent", async () => {
      // Remove the file so we can test the missing case
      await unlink(configPath).catch(() => {});
      expect(await globalConfigExists()).toBe(false);
    });

    it("returns true when config file is present", async () => {
      const config: GlobalConfig = {
        clone_method: "ssh",
        agents: [],
        install_method: "link",
      };
      await saveGlobalConfig(config);
      expect(await globalConfigExists()).toBe(true);
    });
  });

  describe("loadGlobalConfig", () => {
    it("returns undefined when config file does not exist", async () => {
      await unlink(configPath).catch(() => {});
      const result = await loadGlobalConfig();
      expect(result).toBeUndefined();
    });

    it("throws on invalid clone_method", async () => {
      await Bun.write(configPath, "clone_method: ftp\nagents: []\ninstall_method: link\n");
      expect(loadGlobalConfig()).rejects.toThrow('Invalid clone_method: "ftp"');
    });

    it("throws on invalid install_method", async () => {
      await Bun.write(configPath, "clone_method: ssh\nagents: []\ninstall_method: move\n");
      expect(loadGlobalConfig()).rejects.toThrow('Invalid install_method: "move"');
    });

    it("throws when agents is not an array", async () => {
      await Bun.write(configPath, "clone_method: ssh\nagents: not-an-array\ninstall_method: link\n");
      expect(loadGlobalConfig()).rejects.toThrow("Invalid agents: expected an array");
    });

    it("applies default clone_method 'ssh' when not specified", async () => {
      await Bun.write(configPath, "agents: []\ninstall_method: link\n");
      const config = await loadGlobalConfig();
      expect(config).toBeDefined();
      expect(config!.clone_method).toBe("ssh");
    });

    it("applies default install_method 'link' when not specified", async () => {
      await Bun.write(configPath, "agents: []\nclone_method: https\n");
      const config = await loadGlobalConfig();
      expect(config).toBeDefined();
      expect(config!.install_method).toBe("link");
    });

    it("applies default empty agents array when not specified", async () => {
      await Bun.write(configPath, "clone_method: ssh\ninstall_method: copy\n");
      const config = await loadGlobalConfig();
      expect(config).toBeDefined();
      expect(config!.agents).toEqual([]);
    });

    it("loads custom_agents when present", async () => {
      const yaml = [
        "clone_method: ssh",
        "agents: []",
        "install_method: link",
        "custom_agents:",
        "  my-agent:",
        "    project_skills: .my/skills",
        "    project_agents: .my/agents",
        "    global_skills: ~/.my/skills",
        "    global_agents: ~/.my/agents",
        "",
      ].join("\n");
      await Bun.write(configPath, yaml);
      const config = await loadGlobalConfig();
      expect(config).toBeDefined();
      expect(config!.custom_agents).toBeDefined();
      expect(config!.custom_agents!["my-agent"]).toBeDefined();
      expect(config!.custom_agents!["my-agent"]!.project_skills).toBe(".my/skills");
    });

    it("returns undefined custom_agents when not present in yaml", async () => {
      await Bun.write(configPath, "clone_method: ssh\nagents: []\ninstall_method: link\n");
      const config = await loadGlobalConfig();
      expect(config).toBeDefined();
      expect(config!.custom_agents).toBeUndefined();
    });
  });

  describe("saveGlobalConfig + loadGlobalConfig round-trip", () => {
    it("round-trips a minimal config", async () => {
      const original: GlobalConfig = {
        clone_method: "https",
        agents: ["agent-a", "agent-b"],
        install_method: "copy",
      };
      await saveGlobalConfig(original);
      const loaded = await loadGlobalConfig();

      expect(loaded).toBeDefined();
      expect(loaded!.clone_method).toBe("https");
      expect(loaded!.agents).toEqual(["agent-a", "agent-b"]);
      expect(loaded!.install_method).toBe("copy");
    });

    it("round-trips a config with custom_agents", async () => {
      const original: GlobalConfig = {
        clone_method: "ssh",
        agents: ["x"],
        install_method: "link",
        custom_agents: {
          "my-custom": {
            project_skills: ".custom/skills",
            project_agents: ".custom/agents",
            global_skills: "~/.custom/skills",
            global_agents: "~/.custom/agents",
          },
        },
      };
      await saveGlobalConfig(original);
      const loaded = await loadGlobalConfig();

      expect(loaded).toBeDefined();
      expect(loaded!.custom_agents).toBeDefined();
      expect(loaded!.custom_agents!["my-custom"]).toBeDefined();
      expect(loaded!.custom_agents!["my-custom"]!.project_skills).toBe(".custom/skills");
    });

    it("round-trips a config with empty agents list", async () => {
      const original: GlobalConfig = {
        clone_method: "ssh",
        agents: [],
        install_method: "link",
      };
      await saveGlobalConfig(original);
      const loaded = await loadGlobalConfig();

      expect(loaded).toBeDefined();
      expect(loaded!.agents).toEqual([]);
    });

    it("overwrites a previous config on save", async () => {
      const first: GlobalConfig = {
        clone_method: "ssh",
        agents: ["old"],
        install_method: "link",
      };
      await saveGlobalConfig(first);

      const second: GlobalConfig = {
        clone_method: "https",
        agents: ["new-a", "new-b"],
        install_method: "copy",
      };
      await saveGlobalConfig(second);

      const loaded = await loadGlobalConfig();
      expect(loaded).toBeDefined();
      expect(loaded!.clone_method).toBe("https");
      expect(loaded!.agents).toEqual(["new-a", "new-b"]);
      expect(loaded!.install_method).toBe("copy");
    });
  });
});
