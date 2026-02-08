/**
 * Install command — the main orchestration entry point.
 *
 * Processes global and project dependencies, caches repos,
 * discovers skills/agents, and syncs managed directories.
 */
import { Command } from "commander";
import { join } from "node:path";
import {
  requireGlobalConfig,
  globalAgentsYamlPath,
  type GlobalConfig,
} from "../config/global.ts";
import {
  loadProjectConfig,
  projectConfigExists,
  type Dependency,
} from "../config/project.ts";
import { resolveRepoUrl, deriveCacheKey } from "../cache/url.ts";
import { ensureRepo } from "../cache/cache.ts";
import {
  discoverSkills,
  discoverAgents,
  filterItems,
  warnDiscoveryIssues,
  type DiscoveredItem,
} from "../discovery/discovery.ts";
import {
  mergeCustomAgents,
  resolveAgentPathsLabeled,
  validateAgentNames,
  type LabeledAgentPaths,
} from "../registry/registry.ts";
import { syncManagedDir, expandHomePath } from "../install/managed.ts";
import { logError, printLogHint } from "../log/logger.ts";

/** Resolved items from a single dependency */
interface ResolvedDep {
  repo: string;
  cachePath: string;
  skills: DiscoveredItem[];
  agents: DiscoveredItem[];
}

/**
 * Process a list of dependencies: cache repos, discover, and filter.
 * Parallelizes repo caching for better performance with multiple deps.
 */
async function resolveDeps(
  deps: readonly Dependency[],
  cloneMethod: "ssh" | "https"
): Promise<ResolvedDep[]> {
  // Phase 1: Cache all repos in parallel
  const cacheResults = await Promise.all(
    deps.map(async (dep) => {
      const url = resolveRepoUrl(dep.repo, cloneMethod);
      const cacheKey = deriveCacheKey(dep.repo, dep.ref);
      console.log(`  📦 ${dep.repo} (${dep.ref})`);
      const result = await ensureRepo(url, dep.ref, cacheKey);
      return { dep, result };
    })
  );

  // Phase 2: Discover and filter (parallel per dep)
  const resolved = await Promise.all(
    cacheResults.map(async ({ dep, result }) => {
      if (!result.success) {
        console.error(`  ✗ Failed to cache ${dep.repo}, skipping`);
        return null;
      }

      // Discover (parallel — independent operations)
      const [discoveredSkills, discoveredAgents] = await Promise.all([
        discoverSkills(result.path),
        discoverAgents(result.path),
      ]);

      // Filter
      const skillResult = filterItems(discoveredSkills, dep.skills);
      const agentResult = filterItems(discoveredAgents, dep.agents);

      // Warn on issues
      warnDiscoveryIssues(dep.repo, "skills", discoveredSkills, dep.skills, skillResult.missing);
      warnDiscoveryIssues(dep.repo, "agents", discoveredAgents, dep.agents, agentResult.missing);

      return {
        repo: dep.repo,
        cachePath: result.path,
        skills: skillResult.selected,
        agents: agentResult.selected,
      };
    })
  );

  // Filter out failed deps
  return resolved.filter((r): r is ResolvedDep => r !== null);
}

/** Per-agent install result */
interface AgentInstallResult {
  displayNames: string[];
  skillsAdded: number;
  skillsRemoved: number;
  agentsAdded: number;
  agentsRemoved: number;
}

/**
 * Install resolved deps to a set of managed directories.
 * Returns per-agent results for clear reporting.
 * Deduplicates directories to avoid redundant installs (e.g., universal agents
 * sharing project paths but differing in global paths).
 */
async function installToManagedDirs(
  resolvedDeps: readonly ResolvedDep[],
  labeledPaths: LabeledAgentPaths[],
  scope: "project" | "global",
  installMethod: "link" | "copy"
): Promise<AgentInstallResult[]> {
  // Build desired item maps
  const desiredSkills = new Map<string, string>();
  const desiredAgents = new Map<string, string>();

  for (const dep of resolvedDeps) {
    for (const skill of dep.skills) {
      desiredSkills.set(skill.name, skill.sourcePath);
    }
    for (const agent of dep.agents) {
      desiredAgents.set(agent.name, agent.sourcePath);
    }
  }

  // Deduplicate by actual target directories for the given scope,
  // merging display names when multiple agents share the same dirs.
  const dedupMap = new Map<string, { skillsDir: string; agentsDir: string; displayNames: string[] }>();
  for (const labeled of labeledPaths) {
    const skillsDir = scope === "global"
      ? expandHomePath(labeled.globalSkills)
      : labeled.projectSkills;
    const agentsDir = scope === "global"
      ? expandHomePath(labeled.globalAgents)
      : labeled.projectAgents;

    const key = `${skillsDir}|${agentsDir}`;
    const existing = dedupMap.get(key);
    if (existing) {
      existing.displayNames.push(...labeled.displayNames);
    } else {
      dedupMap.set(key, { skillsDir, agentsDir, displayNames: [...labeled.displayNames] });
    }
  }

  const results: AgentInstallResult[] = [];

  for (const { skillsDir, agentsDir, displayNames } of dedupMap.values()) {
    const managedSkillsDir = join(skillsDir, "_agentdeps_managed");
    const managedAgentsDir = join(agentsDir, "_agentdeps_managed");

    const skillSummary = await syncManagedDir(managedSkillsDir, desiredSkills, installMethod);
    const agentSummary = await syncManagedDir(managedAgentsDir, desiredAgents, installMethod);

    results.push({
      displayNames,
      skillsAdded: skillSummary.added.length,
      skillsRemoved: skillSummary.removed.length,
      agentsAdded: agentSummary.added.length,
      agentsRemoved: agentSummary.removed.length,
    });
  }

  return results;
}

/**
 * Format install results for display.
 * When all agents have the same counts, shows a single summary line.
 * Otherwise shows per-agent breakdowns.
 */
function formatInstallResults(scope: string, results: AgentInstallResult[]): string {
  if (results.length === 0) {
    return `  ✓ ${scope}: nothing to do`;
  }

  if (results.length === 1) {
    const r = results[0]!;
    const removed = r.skillsRemoved + r.agentsRemoved;
    const parts: string[] = [];
    if (r.skillsAdded > 0) parts.push(`${r.skillsAdded} skills added`);
    if (r.agentsAdded > 0) parts.push(`${r.agentsAdded} agents added`);
    if (removed > 0) parts.push(`${removed} removed`);
    if (parts.length === 0) parts.push("up to date");
    const label = r.displayNames.join(", ");
    return `  ✓ ${scope} (${label}): ${parts.join(", ")}`;
  }

  // Multiple agents — show per-agent lines
  const lines: string[] = [];
  for (const r of results) {
    const removed = r.skillsRemoved + r.agentsRemoved;
    const parts: string[] = [];
    if (r.skillsAdded > 0) parts.push(`${r.skillsAdded} skills added`);
    if (r.agentsAdded > 0) parts.push(`${r.agentsAdded} agents added`);
    if (removed > 0) parts.push(`${removed} removed`);
    if (parts.length === 0) parts.push("up to date");
    const label = r.displayNames.join(", ");
    lines.push(`      ${label}: ${parts.join(", ")}`);
  }
  return `  ✓ ${scope}:\n${lines.join("\n")}`;
}

/**
 * Run the full install flow.
 */
export async function runInstall(config: GlobalConfig): Promise<void> {
  // Merge custom agents if any
  if (config.custom_agents) {
    mergeCustomAgents(config.custom_agents);
  }

  // Validate agent names
  const unknown = validateAgentNames(config.agents);
  if (unknown.length > 0) {
    console.warn(`⚠ Unknown agents in config: ${unknown.join(", ")}`);
  }

  // Resolve agent paths (with deduplication and labels)
  const labeledPaths = resolveAgentPathsLabeled(config.agents);

  // 1. Process global agents.yaml
  const globalYamlPath = globalAgentsYamlPath();

  try {
    if (await projectConfigExists(globalYamlPath)) {
      console.log("\n🌐 Processing global dependencies...");
      const globalConfig = await loadProjectConfig(globalYamlPath);

      if (globalConfig.dependencies.length > 0) {
        const resolved = await resolveDeps(globalConfig.dependencies, config.clone_method);

        const results = await installToManagedDirs(resolved, labeledPaths, "global", config.install_method);
        console.log(formatInstallResults("Global", results));
      }
    }
  } catch (err) {
    logError("global-deps", err);
    console.warn("⚠ Failed to process global dependencies");
  }

  // 2. Process project agents.yaml
  const projectYamlPath = join(process.cwd(), "agents.yaml");

  if (await projectConfigExists(projectYamlPath)) {
    console.log("\n📁 Processing project dependencies...");
    const projectConfig = await loadProjectConfig(projectYamlPath);

    if (projectConfig.dependencies.length > 0) {
      const resolved = await resolveDeps(projectConfig.dependencies, config.clone_method);

      const results = await installToManagedDirs(resolved, labeledPaths, "project", config.install_method);
      console.log(formatInstallResults("Project", results));
    } else {
      console.log("  ℹ No project dependencies defined");
    }
  } else {
    console.log("\nℹ No project agents.yaml found — only global dependencies processed");
  }

  console.log("\n✅ Install complete");
  printLogHint();
}

export const installCommand = new Command("install")
  .description("Install dependencies from agents.yaml")
  .action(async () => {
    const config = await requireGlobalConfig();
    await runInstall(config);
  });
