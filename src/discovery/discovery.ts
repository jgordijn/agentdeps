/**
 * Discovery — scans cached repositories for skills and subagents.
 *
 * Skills: subdirectories of `skills/` containing `SKILL.md`
 * Agents: subdirectories of `agents/`, or `.md` files directly in `agents/`
 */
import { readdir, access } from "node:fs/promises";
import { join } from "node:path";

/** A discovered item with its name and source path */
export interface DiscoveredItem {
  name: string;
  sourcePath: string;
}

/** Discover skills in a cached repo — subdirs of skills/ containing SKILL.md */
export async function discoverSkills(repoPath: string): Promise<DiscoveredItem[]> {
  const skillsDir = join(repoPath, "skills");

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    // Check all SKILL.md files in parallel
    const checks = await Promise.all(
      dirs.map(async (entry) => {
        let exists: boolean;
        try {
          await access(join(skillsDir, entry.name, "SKILL.md"));
          exists = true;
        } catch {
          exists = false;
        }
        return exists
          ? { name: entry.name, sourcePath: join(skillsDir, entry.name) }
          : null;
      })
    );

    return checks
      .filter((item): item is DiscoveredItem => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // skills/ directory doesn't exist
    return [];
  }
}

/**
 * Discover subagents in a cached repo.
 *
 * Supports two layouts:
 * - Directory-based: `agents/<name>/` (any subdirectory)
 * - File-based: `agents/<name>.md` (markdown files, name = filename without extension)
 */
export async function discoverAgents(repoPath: string): Promise<DiscoveredItem[]> {
  const agentsDir = join(repoPath, "agents");

  try {
    const entries = await readdir(agentsDir, { withFileTypes: true });
    const agents: DiscoveredItem[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        agents.push({ name: entry.name, sourcePath: join(agentsDir, entry.name) });
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const name = entry.name.replace(/\.md$/, "");
        agents.push({ name, sourcePath: join(agentsDir, entry.name) });
      }
    }

    return agents.sort((a, b) => a.name.localeCompare(b.name));
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
  discovered: readonly DiscoveredItem[],
  selection: "*" | string[] | false
): { selected: DiscoveredItem[]; missing: string[] } {
  if (selection === false) {
    return { selected: [], missing: [] };
  }

  if (selection === "*") {
    return { selected: [...discovered], missing: [] };
  }

  const discoveredMap = new Map(discovered.map((item) => [item.name, item]));
  const selected: DiscoveredItem[] = [];
  const missing: string[] = [];

  for (const name of selection) {
    const item = discoveredMap.get(name);
    if (item) {
      selected.push(item);
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
  discovered: readonly DiscoveredItem[],
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
