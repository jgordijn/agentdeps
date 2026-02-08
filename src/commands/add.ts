/**
 * Add command — adds a new dependency to the project's agents.yaml.
 */
import { Command } from "commander";
import * as p from "@clack/prompts";
import { join } from "node:path";
import {
  loadProjectConfig,
  saveProjectConfig,
  projectConfigExists,
  type Dependency,
} from "../config/project.ts";
import { requireGlobalConfig, globalAgentsYamlPath } from "../config/global.ts";
import { resolveRepoUrl, deriveCacheKey } from "../cache/url.ts";
import { ensureRepo } from "../cache/cache.ts";
import { discoverSkills, discoverAgents, type DiscoveredItem } from "../discovery/discovery.ts";
import { runInstall } from "./install.ts";

export const addCommand = new Command("add")
  .description("Add a new dependency to agents.yaml")
  .argument("<repo>", "Repository (owner/repo or full URL)")
  .option("--ref <ref>", "Git ref (branch, tag, SHA)", "main")
  .option("--skill <name>", "Install specific skill (repeatable)", collect, [])
  .option("--agent <name>", "Install specific agent (repeatable)", collect, [])
  .option("--all", "Install all skills and agents")
  .option("--all-skills", "Install all skills")
  .option("--all-agents", "Install all agents")
  .option("--no-skills", "Don't install any skills")
  .option("--no-agents", "Don't install any agents")
  .option("-g, --global", "Add dependency to global agents.yaml instead of project")
  .action(async (repo: string, options) => {
    const config = await requireGlobalConfig();

    const isGlobal = !!options.global;
    const targetYamlPath = isGlobal
      ? globalAgentsYamlPath()
      : join(process.cwd(), "agents.yaml");
    const targetLabel = isGlobal ? "global" : "project";

    // Check if repo already exists (used later for pre-selection and update)
    let existingDep: Dependency | undefined;
    if (await projectConfigExists(targetYamlPath)) {
      const existing = await loadProjectConfig(targetYamlPath);
      existingDep = existing.dependencies.find(
        (d) => d.repo === repo || normalizeRepo(d.repo) === normalizeRepo(repo)
      );
    }

    // Clone repo to cache and discover
    const url = resolveRepoUrl(repo, config.clone_method);
    const cacheKey = deriveCacheKey(repo, options.ref);

    console.log(`📦 Fetching ${repo}...`);
    const result = await ensureRepo(url, options.ref, cacheKey);
    if (!result.success) {
      console.error(`✗ Failed to clone ${repo}`);
      process.exit(1);
    }

    const [discoveredSkills, discoveredAgents] = await Promise.all([
      discoverSkills(result.path),
      discoverAgents(result.path),
    ]);

    console.log(
      `  Found ${discoveredSkills.length} skill(s), ${discoveredAgents.length} agent(s)`
    );

    // Determine selection
    let skills: "*" | string[] | false;
    let agents: "*" | string[] | false;

    if (options.all) {
      skills = "*";
      agents = "*";
    } else if (
      options.skill.length > 0 ||
      options.agent.length > 0 ||
      options.allSkills ||
      options.allAgents ||
      options.skills === false ||
      options.agents === false
    ) {
      // Explicit flags provided
      if (options.skills === false) {
        skills = false;
      } else if (options.allSkills) {
        skills = "*";
      } else if (options.skill.length > 0) {
        skills = options.skill;
      } else {
        skills = "*";
      }

      if (options.agents === false) {
        agents = false;
      } else if (options.allAgents) {
        agents = "*";
      } else if (options.agent.length > 0) {
        agents = options.agent;
      } else {
        agents = "*";
      }
    } else {
      // Interactive picker (pre-select existing choices when updating)
      const pickResult = await interactivePick(discoveredSkills, discoveredAgents, existingDep);
      if (!pickResult) {
        return; // Cancelled
      }
      skills = pickResult.skills;
      agents = pickResult.agents;
    }

    // Build dependency
    const dep: Dependency = {
      repo,
      ref: options.ref,
      skills,
      agents,
    };

    // Load or create config
    let targetConfig = await projectConfigExists(targetYamlPath)
      ? await loadProjectConfig(targetYamlPath)
      : { dependencies: [] };

    if (existingDep) {
      // Update existing dependency in-place
      const idx = targetConfig.dependencies.findIndex(
        (d) => d.repo === repo || normalizeRepo(d.repo) === normalizeRepo(repo)
      );
      targetConfig.dependencies[idx] = dep;
    } else {
      targetConfig.dependencies.push(dep);
    }
    await saveProjectConfig(targetYamlPath, targetConfig);

    const verb = existingDep ? "Updated" : "Added";
    console.log(`\n✓ ${verb} ${repo} in ${targetLabel} agents.yaml`);

    // Run install
    await runInstall(config);
  });

/** Collect repeatable options into an array */
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/** Normalize repo for comparison */
function normalizeRepo(repo: string): string {
  return repo.replace(/\.git$/, "").toLowerCase();
}

/** Compute initial selection from an existing dependency config */
function initialSelection(
  names: string[],
  existing: "*" | string[] | false | undefined
): string[] {
  if (existing === undefined || existing === "*") return names;
  if (existing === false) return [];
  return existing.filter((n) => names.includes(n));
}

/** Interactive picker for skills and agents */
async function interactivePick(
  skills: DiscoveredItem[],
  agents: DiscoveredItem[],
  existingDep?: Dependency
): Promise<{ skills: "*" | string[] | false; agents: "*" | string[] | false } | undefined> {
  const result: {
    skills: "*" | string[] | false;
    agents: "*" | string[] | false;
  } = { skills: "*", agents: "*" };

  if (skills.length > 0) {
    const names = skills.map((s) => s.name);
    const selected = await p.multiselect({
      message: "Select skills to install (press 'a' to toggle all):",
      options: names.map((s) => ({ value: s, label: s })),
      initialValues: initialSelection(names, existingDep?.skills),
      required: false,
    });

    if (p.isCancel(selected)) return undefined;

    const values = selected as string[];
    if (values.length === names.length) {
      result.skills = "*";
    } else if (values.length === 0) {
      result.skills = false;
    } else {
      result.skills = values;
    }
  } else {
    result.skills = false;
  }

  if (agents.length > 0) {
    const names = agents.map((a) => a.name);
    const selected = await p.multiselect({
      message: "Select agents to install (press 'a' to toggle all):",
      options: names.map((a) => ({ value: a, label: a })),
      initialValues: initialSelection(names, existingDep?.agents),
      required: false,
    });

    if (p.isCancel(selected)) return undefined;

    const values = selected as string[];
    if (values.length === names.length) {
      result.agents = "*";
    } else if (values.length === 0) {
      result.agents = false;
    } else {
      result.agents = values;
    }
  } else {
    result.agents = false;
  }

  return result;
}
