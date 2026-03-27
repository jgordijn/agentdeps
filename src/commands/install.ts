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
import { syncManagedDir, expandHomePath, type SyncSummary } from "../install/managed.ts";
import { cleanupLegacyManagedDirs } from "../install/migration.ts";
import { logError, printLogHint } from "../log/logger.ts";

interface ResolvedDep {
  repo: string;
  cachePath: string;
  skills: DiscoveredItem[];
  agents: DiscoveredItem[];
  updatedSkillNames: string[];
  updatedAgentNames: string[];
}

export interface AgentInstallResult {
  displayNames: string[];
  skills: SyncSummary;
  agents: SyncSummary;
}

function changedTopLevelItems(
  changedPaths: readonly string[],
  kind: "skills" | "agents"
): Set<string> {
  const names = new Set<string>();
  const prefix = `${kind}/`;

  for (const changedPath of changedPaths) {
    if (!changedPath.startsWith(prefix)) {
      continue;
    }

    const relativePath = changedPath.slice(prefix.length);
    const [firstSegment] = relativePath.split("/");
    if (!firstSegment) {
      continue;
    }

    if (kind === "agents" && firstSegment.endsWith(".md")) {
      names.add(firstSegment.replace(/\.md$/, ""));
    } else {
      names.add(firstSegment);
    }
  }

  return names;
}

function mergeReportedUpdates(
  summary: SyncSummary,
  updatedNames: readonly string[]
): SyncSummary {
  const added = [...summary.added];
  const updated = [...summary.updated];
  const removed = [...summary.removed];
  const unchanged = [...summary.unchanged];

  for (const name of updatedNames) {
    if (added.includes(name) || removed.includes(name) || updated.includes(name)) {
      continue;
    }

    const unchangedIndex = unchanged.indexOf(name);
    if (unchangedIndex !== -1) {
      unchanged.splice(unchangedIndex, 1);
    }
    updated.push(name);
  }

  return { added, updated, removed, unchanged };
}

function collectRepoUpdatedNames(
  resolvedDeps: readonly ResolvedDep[],
  desiredItems: Map<string, string>,
  kind: "skills" | "agents"
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const dep of resolvedDeps) {
    const items = kind === "skills" ? dep.skills : dep.agents;
    const updatedNames = new Set(
      kind === "skills" ? dep.updatedSkillNames : dep.updatedAgentNames
    );

    for (const item of items) {
      if (!updatedNames.has(item.name)) {
        continue;
      }
      if (desiredItems.get(item.name) !== item.sourcePath) {
        continue;
      }
      if (seen.has(item.name)) {
        continue;
      }

      seen.add(item.name);
      names.push(item.name);
    }
  }

  return names;
}

async function resolveDeps(
  deps: readonly Dependency[],
  cloneMethod: "ssh" | "https"
): Promise<ResolvedDep[]> {
  const cacheResults = await Promise.all(
    deps.map(async (dep) => {
      const url = resolveRepoUrl(dep.repo, cloneMethod);
      const cacheKey = deriveCacheKey(dep.repo, dep.ref);
      console.log(`  📦 ${dep.repo} (${dep.ref})`);
      const result = await ensureRepo(url, dep.ref, cacheKey);
      return { dep, result };
    })
  );

  const resolved = await Promise.all(
    cacheResults.map(async ({ dep, result }) => {
      if (!result.success) {
        console.error(`  ✗ Failed to cache ${dep.repo}, skipping`);
        return null;
      }

      const [discoveredSkills, discoveredAgents] = await Promise.all([
        discoverSkills(result.path),
        discoverAgents(result.path),
      ]);

      const skillResult = filterItems(discoveredSkills, dep.skills);
      const agentResult = filterItems(discoveredAgents, dep.agents);
      const changedSkills = changedTopLevelItems(result.changedPaths, "skills");
      const changedAgents = changedTopLevelItems(result.changedPaths, "agents");

      warnDiscoveryIssues(dep.repo, "skills", discoveredSkills, dep.skills, skillResult.missing);
      warnDiscoveryIssues(dep.repo, "agents", discoveredAgents, dep.agents, agentResult.missing);

      return {
        repo: dep.repo,
        cachePath: result.path,
        skills: skillResult.selected,
        agents: agentResult.selected,
        updatedSkillNames: skillResult.selected
          .filter((item) => changedSkills.has(item.name))
          .map((item) => item.name),
        updatedAgentNames: agentResult.selected
          .filter((item) => changedAgents.has(item.name))
          .map((item) => item.name),
      };
    })
  );

  return resolved.filter((r): r is ResolvedDep => r !== null);
}

async function installToManagedDirs(
  resolvedDeps: readonly ResolvedDep[],
  labeledPaths: LabeledAgentPaths[],
  scope: "project" | "global",
  installMethod: "link" | "copy"
): Promise<AgentInstallResult[]> {
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

  const repoUpdatedSkills = installMethod === "link"
    ? collectRepoUpdatedNames(resolvedDeps, desiredSkills, "skills")
    : [];
  const repoUpdatedAgents = installMethod === "link"
    ? collectRepoUpdatedNames(resolvedDeps, desiredAgents, "agents")
    : [];

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
      skills: mergeReportedUpdates(skillSummary, repoUpdatedSkills),
      agents: mergeReportedUpdates(agentSummary, repoUpdatedAgents),
    });
  }

  return results;
}

function countPhrase(count: number, noun: "skill" | "agent", action: "added" | "updated" | "removed"): string {
  return `${count} ${noun}${count === 1 ? "" : "s"} ${action}`;
}

function detailLines(indent: string, kind: "skills" | "agents", summary: SyncSummary): string[] {
  const lines: string[] = [];
  if (summary.added.length > 0) lines.push(`${indent}${kind} added: ${summary.added.join(", ")}`);
  if (summary.updated.length > 0) lines.push(`${indent}${kind} updated: ${summary.updated.join(", ")}`);
  if (summary.removed.length > 0) lines.push(`${indent}${kind} removed: ${summary.removed.join(", ")}`);
  return lines;
}

function summaryParts(result: AgentInstallResult): string[] {
  const parts: string[] = [];

  if (result.skills.added.length > 0) {
    parts.push(countPhrase(result.skills.added.length, "skill", "added"));
  }
  if (result.skills.updated.length > 0) {
    parts.push(countPhrase(result.skills.updated.length, "skill", "updated"));
  }
  if (result.skills.removed.length > 0) {
    parts.push(countPhrase(result.skills.removed.length, "skill", "removed"));
  }
  if (result.agents.added.length > 0) {
    parts.push(countPhrase(result.agents.added.length, "agent", "added"));
  }
  if (result.agents.updated.length > 0) {
    parts.push(countPhrase(result.agents.updated.length, "agent", "updated"));
  }
  if (result.agents.removed.length > 0) {
    parts.push(countPhrase(result.agents.removed.length, "agent", "removed"));
  }

  return parts;
}

export function formatInstallResults(scope: string, results: AgentInstallResult[]): string {
  if (results.length === 0) {
    return `  ✓ ${scope}: nothing to do`;
  }

  if (results.length === 1) {
    const result = results[0]!;
    const label = result.displayNames.join(", ");
    const parts = summaryParts(result);
    if (parts.length === 0) {
      return `  ✓ ${scope} (${label}): up to date`;
    }

    const details = [
      ...detailLines("      ", "skills", result.skills),
      ...detailLines("      ", "agents", result.agents),
    ];
    return `  ✓ ${scope} (${label}): ${parts.join(", ")}\n${details.join("\n")}`;
  }

  const lines: string[] = [];
  for (const result of results) {
    const label = result.displayNames.join(", ");
    const parts = summaryParts(result);
    lines.push(`      ${label}: ${parts.length === 0 ? "up to date" : parts.join(", ")}`);
    lines.push(...detailLines("        ", "skills", result.skills));
    lines.push(...detailLines("        ", "agents", result.agents));
  }
  return `  ✓ ${scope}:\n${lines.join("\n")}`;
}

export async function runInstall(config: GlobalConfig): Promise<void> {
  if (config.custom_agents) {
    mergeCustomAgents(config.custom_agents);
  }

  const unknown = validateAgentNames(config.agents);
  if (unknown.length > 0) {
    console.warn(`⚠ Unknown agents in config: ${unknown.join(", ")}`);
  }

  const labeledPaths = resolveAgentPathsLabeled(config.agents);
  await cleanupLegacyManagedDirs(config.agents);

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
