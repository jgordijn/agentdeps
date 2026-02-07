/**
 * Unit tests for discovery — uses temp dirs with mock SKILL.md files and agent dirs.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discoverSkills, discoverAgents, filterItems } from "./discovery.ts";

let tempDir: string;

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
    expect(skills).toEqual(["skill-a", "skill-b"]);
  });

  it("ignores directories without SKILL.md", async () => {
    await mkdir(join(tempDir, "skills", "has-skill"), { recursive: true });
    await mkdir(join(tempDir, "skills", "no-skill"), { recursive: true });
    await writeFile(join(tempDir, "skills", "has-skill", "SKILL.md"), "# Skill");

    const skills = await discoverSkills(tempDir);
    expect(skills).toEqual(["has-skill"]);
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
    expect(agents).toEqual(["agent-x", "agent-y"]);
  });

  it("returns empty when no agents/ directory", async () => {
    const agents = await discoverAgents(tempDir);
    expect(agents).toEqual([]);
  });
});

describe("filterItems", () => {
  const discovered = ["a", "b", "c"];

  it("returns all for wildcard", () => {
    const result = filterItems(discovered, "*");
    expect(result.selected).toEqual(["a", "b", "c"]);
    expect(result.missing).toEqual([]);
  });

  it("returns empty for false", () => {
    const result = filterItems(discovered, false);
    expect(result.selected).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it("filters to matching names", () => {
    const result = filterItems(discovered, ["a", "c"]);
    expect(result.selected).toEqual(["a", "c"]);
    expect(result.missing).toEqual([]);
  });

  it("reports missing items", () => {
    const result = filterItems(discovered, ["a", "nonexistent"]);
    expect(result.selected).toEqual(["a"]);
    expect(result.missing).toEqual(["nonexistent"]);
  });
});
