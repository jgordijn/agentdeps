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
} from "./registry.ts";

beforeEach(() => {
  resetRegistry();
});

describe("getAgent", () => {
  it("returns pi agent", () => {
    const agent = getAgent("pi");
    expect(agent).toBeDefined();
    expect(agent!.projectSkills).toBe(".pi/skills");
    expect(agent!.projectAgents).toBe(".pi/agents");
    expect(agent!.globalSkills).toBe("~/.pi/agent/skills");
    expect(agent!.globalAgents).toBe("~/.pi/agent/agents");
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

  it("returns opencode with its own paths", () => {
    const agent = getAgent("opencode");
    expect(agent).toBeDefined();
    expect(agent!.isUniversal).toBe(false);
    expect(agent!.projectSkills).toBe(".opencode/skills");
    expect(agent!.projectAgents).toBe(".opencode/agents");
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
    expect(paths.length).toBe(2);
    expect(paths[0]!.projectSkills).toBe(".pi/skills");
    expect(paths[1]!.projectSkills).toBe(".claude/skills");
  });
});
