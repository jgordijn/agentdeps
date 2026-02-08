/**
 * Unit tests for discovery — uses temp dirs with mock SKILL.md files and agent dirs.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discoverSkills, discoverAgents, filterItems, type DiscoveredItem } from "./discovery.ts";

let tempDir: string;

/** Helper to extract just names from DiscoveredItem[] */
function names(items: DiscoveredItem[]): string[] {
  return items.map((i) => i.name);
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentdeps-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("discoverSkills", () => {
  it("finds skills with SKILL.md", async () => {
    await mkdir(join(tempDir, "skills", "skill-a"), { recursive: true });
    await mkdir(join(tempDir, "skills", "skill-b"), { recursive: true });
    await writeFile(join(tempDir, "skills", "skill-a", "SKILL.md"), "# Skill A");
    await writeFile(join(tempDir, "skills", "skill-b", "SKILL.md"), "# Skill B");

    const skills = await discoverSkills(tempDir);
    expect(names(skills)).toEqual(["skill-a", "skill-b"]);
    expect(skills[0]!.sourcePath).toBe(join(tempDir, "skills", "skill-a"));
    expect(skills[1]!.sourcePath).toBe(join(tempDir, "skills", "skill-b"));
  });

  it("ignores directories without SKILL.md", async () => {
    await mkdir(join(tempDir, "skills", "has-skill"), { recursive: true });
    await mkdir(join(tempDir, "skills", "no-skill"), { recursive: true });
    await writeFile(join(tempDir, "skills", "has-skill", "SKILL.md"), "# Skill");

    const skills = await discoverSkills(tempDir);
    expect(names(skills)).toEqual(["has-skill"]);
  });

  it("returns empty when no skills/ directory", async () => {
    const skills = await discoverSkills(tempDir);
    expect(skills).toEqual([]);
  });

  it("returns empty when skills/ is empty", async () => {
    await mkdir(join(tempDir, "skills"), { recursive: true });
    const skills = await discoverSkills(tempDir);
    expect(skills).toEqual([]);
  });
});

describe("discoverAgents", () => {
  it("finds agent directories", async () => {
    await mkdir(join(tempDir, "agents", "agent-x"), { recursive: true });
    await mkdir(join(tempDir, "agents", "agent-y"), { recursive: true });

    const agents = await discoverAgents(tempDir);
    expect(names(agents)).toEqual(["agent-x", "agent-y"]);
    expect(agents[0]!.sourcePath).toBe(join(tempDir, "agents", "agent-x"));
  });

  it("finds file-based agents (.md files)", async () => {
    await mkdir(join(tempDir, "agents"), { recursive: true });
    await writeFile(join(tempDir, "agents", "code-reviewer.md"), "# Code Reviewer");
    await writeFile(join(tempDir, "agents", "architect.md"), "# Architect");

    const agents = await discoverAgents(tempDir);
    expect(names(agents)).toEqual(["architect", "code-reviewer"]);
    expect(agents[0]!.sourcePath).toBe(join(tempDir, "agents", "architect.md"));
    expect(agents[1]!.sourcePath).toBe(join(tempDir, "agents", "code-reviewer.md"));
  });

  it("finds both directory and file-based agents", async () => {
    await mkdir(join(tempDir, "agents", "dir-agent"), { recursive: true });
    await writeFile(join(tempDir, "agents", "file-agent.md"), "# File Agent");

    const agents = await discoverAgents(tempDir);
    expect(names(agents)).toEqual(["dir-agent", "file-agent"]);
  });

  it("ignores non-md files", async () => {
    await mkdir(join(tempDir, "agents"), { recursive: true });
    await writeFile(join(tempDir, "agents", "readme.txt"), "not an agent");
    await writeFile(join(tempDir, "agents", "agent.md"), "# Agent");

    const agents = await discoverAgents(tempDir);
    expect(names(agents)).toEqual(["agent"]);
  });

  it("returns empty when no agents/ directory", async () => {
    const agents = await discoverAgents(tempDir);
    expect(agents).toEqual([]);
  });
});

describe("filterItems", () => {
  const discovered: DiscoveredItem[] = [
    { name: "a", sourcePath: "/path/a" },
    { name: "b", sourcePath: "/path/b" },
    { name: "c", sourcePath: "/path/c" },
  ];

  it("returns all for wildcard", () => {
    const result = filterItems(discovered, "*");
    expect(names(result.selected)).toEqual(["a", "b", "c"]);
    expect(result.missing).toEqual([]);
  });

  it("returns empty for false", () => {
    const result = filterItems(discovered, false);
    expect(result.selected).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it("filters to matching names", () => {
    const result = filterItems(discovered, ["a", "c"]);
    expect(names(result.selected)).toEqual(["a", "c"]);
    expect(result.missing).toEqual([]);
  });

  it("reports missing items", () => {
    const result = filterItems(discovered, ["a", "nonexistent"]);
    expect(names(result.selected)).toEqual(["a"]);
    expect(result.missing).toEqual(["nonexistent"]);
  });
});
