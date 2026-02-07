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
import { loadGlobalConfig } from "../config/global.ts";
import { resolveRepoUrl, deriveCacheKey } from "../cache/url.ts";
import { ensureRepo } from "../cache/cache.ts";
import { discoverSkills, discoverAgents } from "../discovery/discovery.ts";
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
  .action(async (repo: string, options) => {
    const config = await loadGlobalConfig();
    if (!config) {
      console.error("No global config found. Run `agentdeps config` first.");
      process.exit(1);
    }

    const projectYamlPath = join(process.cwd(), "agents.yaml");

    // Check if repo already exists
    if (await projectConfigExists(projectYamlPath)) {
      const existing = await loadProjectConfig(projectYamlPath);
      const match = existing.dependencies.find(
        (d) => d.repo === repo || normalizeRepo(d.repo) === normalizeRepo(repo)
      );
      if (match) {
        console.error(
          `✗ ${repo} already exists in agents.yaml. Edit the file directly to modify it.`
        );
        process.exit(1);
      }
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

    const discoveredSkills = await discoverSkills(result.path);
    const discoveredAgents = await discoverAgents(result.path);

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
      // Interactive picker
      const result = await interactivePick(discoveredSkills, discoveredAgents);
      if (!result) {
        return; // Cancelled
      }
      skills = result.skills;
      agents = result.agents;
    }

    // Build dependency
    const dep: Dependency = {
      repo,
      ref: options.ref,
      skills,
      agents,
    };

    // Load or create project config
    let projectConfig = await projectConfigExists(projectYamlPath)
      ? await loadProjectConfig(projectYamlPath)
      : { dependencies: [] };

    projectConfig.dependencies.push(dep);
    await saveProjectConfig(projectYamlPath, projectConfig);

    console.log(`\n✓ Added ${repo} to agents.yaml`);

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

/** Interactive picker for skills and agents */
async function interactivePick(
  skills: string[],
  agents: string[]
): Promise<{ skills: "*" | string[] | false; agents: "*" | string[] | false } | undefined> {
  const result: {
    skills: "*" | string[] | false;
    agents: "*" | string[] | false;
  } = { skills: "*", agents: "*" };

  if (skills.length > 0) {
    const selected = await p.multiselect({
      message: "Select skills to install:",
      options: skills.map((s) => ({ value: s, label: s })),
      initialValues: skills,
      required: false,
    });

    if (p.isCancel(selected)) return undefined;

    if ((selected as string[]).length === skills.length) {
      result.skills = "*";
    } else if ((selected as string[]).length === 0) {
      result.skills = false;
    } else {
      result.skills = selected as string[];
    }
  } else {
    result.skills = false;
  }

  if (agents.length > 0) {
    const selected = await p.multiselect({
      message: "Select agents to install:",
      options: agents.map((a) => ({ value: a, label: a })),
      initialValues: agents,
      required: false,
    });

    if (p.isCancel(selected)) return undefined;

    if ((selected as string[]).length === agents.length) {
      result.agents = "*";
    } else if ((selected as string[]).length === 0) {
      result.agents = false;
    } else {
      result.agents = selected as string[];
    }
  } else {
    result.agents = false;
  }

  return result;
}
