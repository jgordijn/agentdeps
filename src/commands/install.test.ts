/**
 * Unit tests for install output formatting.
 */
import { describe, it, expect } from "bun:test";
import { formatInstallResults, type AgentInstallResult } from "./install.ts";

describe("formatInstallResults", () => {
  it("lists non-empty added, updated, and removed groups", () => {
    const results: AgentInstallResult[] = [
      {
        displayNames: ["Pi"],
        skills: {
          added: ["new-skill"],
          updated: ["changed-skill"],
          removed: ["old-skill"],
          unchanged: [],
        },
        agents: {
          added: ["new-agent"],
          updated: ["helper-agent"],
          removed: ["old-agent"],
          unchanged: [],
        },
      },
    ];

    const output = formatInstallResults("Project", results);

    expect(output).toContain(
      "Project (Pi): 1 skill added, 1 skill updated, 1 skill removed, 1 agent added, 1 agent updated, 1 agent removed"
    );
    expect(output).toContain("skills added: new-skill");
    expect(output).toContain("skills updated: changed-skill");
    expect(output).toContain("skills removed: old-skill");
    expect(output).toContain("agents added: new-agent");
    expect(output).toContain("agents updated: helper-agent");
    expect(output).toContain("agents removed: old-agent");
    expect(output).not.toContain("unchanged");
  });

  it("returns a nothing-to-do message when there are no targets", () => {
    expect(formatInstallResults("Project", [])).toBe("  ✓ Project: nothing to do");
  });

  it("keeps no-op output concise", () => {
    const results: AgentInstallResult[] = [
      {
        displayNames: ["Pi"],
        skills: {
          added: [],
          updated: [],
          removed: [],
          unchanged: ["my-skill"],
        },
        agents: {
          added: [],
          updated: [],
          removed: [],
          unchanged: ["helper-agent"],
        },
      },
    ];

    expect(formatInstallResults("Project", results)).toBe("  ✓ Project (Pi): up to date");
  });

  it("formats multiple targets with per-target detail", () => {
    const results: AgentInstallResult[] = [
      {
        displayNames: ["Pi"],
        skills: {
          added: [],
          updated: [],
          removed: [],
          unchanged: ["my-skill"],
        },
        agents: {
          added: [],
          updated: [],
          removed: [],
          unchanged: [],
        },
      },
      {
        displayNames: ["Claude Code"],
        skills: {
          added: [],
          updated: ["changed-skill"],
          removed: [],
          unchanged: [],
        },
        agents: {
          added: [],
          updated: [],
          removed: ["removed-agent"],
          unchanged: [],
        },
      },
    ];

    const output = formatInstallResults("Project", results);

    expect(output).toContain("  ✓ Project:");
    expect(output).toContain("Pi: up to date");
    expect(output).toContain("Claude Code: 1 skill updated, 1 agent removed");
    expect(output).toContain("skills updated: changed-skill");
    expect(output).toContain("agents removed: removed-agent");
  });
});
