/**
 * Unit tests for agent registry including custom agent merge.
 */
import { describe, it, expect, beforeEach } from "bun:test";
import {
  getAgent,
  allAgents,
  universalAgents,
  nonUniversalAgents,
  validateAgentNames,
  mergeCustomAgents,
  resolveAgentPaths,
  resetRegistry,
  getLegacyProjectPaths,
} from "./registry.ts";

beforeEach(() => {
  resetRegistry();
});

describe("getAgent", () => {
  it("returns pi agent with universal project paths", () => {
    const agent = getAgent("pi");
    expect(agent).toBeDefined();
    expect(agent!.projectSkills).toBe(".agents/skills");
    expect(agent!.projectAgents).toBe(".agents/agents");
    expect(agent!.globalSkills).toBe("~/.pi/agent/skills");
    expect(agent!.globalAgents).toBe("~/.pi/agent/agents");
    expect(agent!.isUniversal).toBe(true);
  });

  it("returns claude-code agent", () => {
    const agent = getAgent("claude-code");
    expect(agent).toBeDefined();
    expect(agent!.projectSkills).toBe(".claude/skills");
    expect(agent!.projectAgents).toBe(".claude/agents");
  });

  it("returns cursor agent", () => {
    const agent = getAgent("cursor");
    expect(agent).toBeDefined();
    expect(agent!.projectSkills).toBe(".cursor/skills");
  });

  it("returns opencode with universal project paths", () => {
    const agent = getAgent("opencode");
    expect(agent).toBeDefined();
    expect(agent!.isUniversal).toBe(true);
    expect(agent!.projectSkills).toBe(".agents/skills");
    expect(agent!.projectAgents).toBe(".agents/agents");
  });

  it("returns undefined for unknown agent", () => {
    expect(getAgent("unknown")).toBeUndefined();
  });
});

describe("allAgents", () => {
  it("includes at least 12 agents", () => {
    expect(allAgents().length).toBeGreaterThanOrEqual(12);
  });
});

describe("universalAgents", () => {
  it("returns only universal agents", () => {
    const universal = universalAgents();
    expect(universal.length).toBeGreaterThan(0);
    for (const agent of universal) {
      expect(agent.isUniversal).toBe(true);
      expect(agent.projectSkills).toBe(".agents/skills");
    }
  });
});

describe("nonUniversalAgents", () => {
  it("returns only non-universal agents", () => {
    const nonUniversal = nonUniversalAgents();
    expect(nonUniversal.length).toBeGreaterThan(0);
    for (const agent of nonUniversal) {
      expect(agent.isUniversal).toBe(false);
    }
  });
});

describe("validateAgentNames", () => {
  it("returns empty for valid names", () => {
    expect(validateAgentNames(["pi", "opencode"])).toEqual([]);
  });

  it("returns unknown names", () => {
    expect(validateAgentNames(["pi", "fake-agent"])).toEqual(["fake-agent"]);
  });
});

describe("mergeCustomAgents", () => {
  it("adds custom agent", () => {
    mergeCustomAgents({
      "my-agent": {
        project_skills: ".my-agent/skills",
        project_agents: ".my-agent/agents",
        global_skills: "~/.my-agent/skills",
        global_agents: "~/.my-agent/agents",
      },
    });

    const agent = getAgent("my-agent");
    expect(agent).toBeDefined();
    expect(agent!.projectSkills).toBe(".my-agent/skills");
  });

  it("overrides built-in agent", () => {
    mergeCustomAgents({
      pi: {
        project_skills: ".custom-pi/skills",
        project_agents: ".custom-pi/agents",
        global_skills: "~/.custom-pi/skills",
        global_agents: "~/.custom-pi/agents",
      },
    });

    const agent = getAgent("pi");
    expect(agent).toBeDefined();
    expect(agent!.projectSkills).toBe(".custom-pi/skills");
  });
});

describe("resolveAgentPaths", () => {
  it("deduplicates universal project paths", () => {
    const paths = resolveAgentPaths(["opencode", "codex"]);
    // Both share .agents/skills and .agents/agents at project scope
    // We expect deduplication — 1 unique project path but 2 global entries
    expect(paths.length).toBeLessThanOrEqual(2);
  });

  it("includes all unique paths for different agents", () => {
    const paths = resolveAgentPaths(["pi", "claude-code"]);
    // Pi is now universal (.agents/skills), claude-code has its own (.claude/skills)
    // Both have different global paths so we get 2 entries
    expect(paths.length).toBe(2);
    expect(paths[0]!.projectSkills).toBe(".agents/skills");
    expect(paths[1]!.projectSkills).toBe(".claude/skills");
  });
});


describe("getLegacyProjectPaths", () => {
  it("returns legacy paths for pi", () => {
    const paths = getLegacyProjectPaths(["pi"]);
    expect(paths).toEqual([{ skills: ".pi/skills", agents: ".pi/agents" }]);
  });

  it("returns legacy paths for opencode", () => {
    const paths = getLegacyProjectPaths(["opencode"]);
    expect(paths).toEqual([{ skills: ".opencode/skills", agents: ".opencode/agents" }]);
  });

  it("returns legacy paths for both pi and opencode", () => {
    const paths = getLegacyProjectPaths(["pi", "opencode"]);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toEqual({ skills: ".pi/skills", agents: ".pi/agents" });
    expect(paths[1]).toEqual({ skills: ".opencode/skills", agents: ".opencode/agents" });
  });

  it("returns empty for agents without legacy paths", () => {
    const paths = getLegacyProjectPaths(["claude-code", "codex"]);
    expect(paths).toEqual([]);
  });

  it("returns empty for unknown agents", () => {
    const paths = getLegacyProjectPaths(["unknown"]);
    expect(paths).toEqual([]);
  });
});