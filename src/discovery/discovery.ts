/**
 * Discovery — scans cached repositories for skills and subagents.
 *
 * Skills: subdirectories of `skills/` containing `SKILL.md`
 * Agents: subdirectories of `agents/`
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** Discover skills in a cached repo — subdirs of skills/ containing SKILL.md */
export async function discoverSkills(repoPath: string): Promise<string[]> {
  const skillsDir = join(repoPath, "skills");

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    // Check all SKILL.md files in parallel
    const checks = await Promise.all(
      dirs.map(async (entry) => {
        const exists = await Bun.file(join(skillsDir, entry.name, "SKILL.md")).exists();
        return exists ? entry.name : null;
      })
    );

    return checks.filter((name): name is string => name !== null).sort();
  } catch {
    // skills/ directory doesn't exist
    return [];
  }
}

/** Discover subagents in a cached repo — subdirs of agents/ */
export async function discoverAgents(repoPath: string): Promise<string[]> {
  const agentsDir = join(repoPath, "agents");

  try {
    const entries = await readdir(agentsDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    // agents/ directory doesn't exist
    return [];
  }
}

/**
 * Filter discovered items based on the dependency selection.
 *
 * - "*" → return all discovered items
 * - false → return empty array
 * - string[] → filter to matching names, report missing
 *
 * Returns { selected, missing } where missing lists items requested but not found.
 */
export function filterItems(
  discovered: readonly string[],
  selection: "*" | string[] | false
): { selected: string[]; missing: string[] } {
  if (selection === false) {
    return { selected: [], missing: [] };
  }

  if (selection === "*") {
    return { selected: [...discovered], missing: [] };
  }

  const discoveredSet = new Set(discovered);
  const selected: string[] = [];
  const missing: string[] = [];

  for (const name of selection) {
    if (discoveredSet.has(name)) {
      selected.push(name);
    } else {
      missing.push(name);
    }
  }

  return { selected, missing };
}

/**
 * Check discovery results and print appropriate warnings.
 */
export function warnDiscoveryIssues(
  repoName: string,
  type: "skills" | "agents",
  discovered: readonly string[],
  selection: "*" | string[] | false,
  missing: readonly string[]
): void {
  // Don't warn when selection is false (user explicitly opted out)
  if (selection === false) return;

  if (discovered.length === 0) {
    console.warn(
      `⚠ No ${type} found in ${repoName}${
        type === "skills" ? " (no skills/ directory or no SKILL.md files)" : " (no agents/ directory)"
      }`
    );
  }

  if (missing.length > 0) {
    console.warn(
      `⚠ ${type} not found in ${repoName}: ${missing.join(", ")}`
    );
  }
}
