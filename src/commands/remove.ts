/**
 * Remove command — removes a dependency from agents.yaml and prunes installed items.
 */
import { Command } from "commander";
import { join } from "node:path";
import {
  loadProjectConfig,
  saveProjectConfig,
  projectConfigExists,
} from "../config/project.ts";
import { loadGlobalConfig } from "../config/global.ts";
import { runInstall } from "./install.ts";

export const removeCommand = new Command("remove")
  .description("Remove a dependency from agents.yaml")
  .argument("<repo>", "Repository to remove (owner/repo or full URL)")
  .action(async (repo: string) => {
    const config = await loadGlobalConfig();
    if (!config) {
      console.error("No global config found. Run `agentdeps config` first.");
      process.exit(1);
    }

    const projectYamlPath = join(process.cwd(), "agents.yaml");

    if (!(await projectConfigExists(projectYamlPath))) {
      console.error("✗ No agents.yaml found in current directory");
      process.exit(1);
    }

    const projectConfig = await loadProjectConfig(projectYamlPath);

    // Find matching dependency
    const normalizedRepo = normalizeRepo(repo);
    const index = projectConfig.dependencies.findIndex(
      (d) => normalizeRepo(d.repo) === normalizedRepo
    );

    if (index === -1) {
      console.error(`✗ ${repo} not found in agents.yaml`);
      process.exit(1);
    }

    const removed = projectConfig.dependencies[index];
    projectConfig.dependencies.splice(index, 1);
    await saveProjectConfig(projectYamlPath, projectConfig);

    console.log(`✓ Removed ${removed!.repo} from agents.yaml`);

    // Run install to prune stale items
    await runInstall(config);
  });

/** Normalize repo for comparison */
function normalizeRepo(repo: string): string {
  return repo.replace(/\.git$/, "").toLowerCase();
}
