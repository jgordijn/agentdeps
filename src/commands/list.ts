/**
 * List command — displays installed dependencies with their skills and agents.
 */
import { Command } from "commander";
import { join } from "node:path";
import {
  loadProjectConfig,
  projectConfigExists,
  type Dependency,
} from "../config/project.ts";
import {
  requireGlobalConfig,
  globalAgentsYamlPath,
} from "../config/global.ts";

export const listCommand = new Command("list")
  .description("List installed dependencies")
  .action(async () => {
    const config = await requireGlobalConfig();

    let hasDeps = false;

    // Global deps
    const globalYamlPath = globalAgentsYamlPath();
    if (await projectConfigExists(globalYamlPath)) {
      const globalConfig = await loadProjectConfig(globalYamlPath);
      if (globalConfig.dependencies.length > 0) {
        hasDeps = true;
        console.log("🌐 Global dependencies:\n");
        printDeps(globalConfig.dependencies, config.agents);
      }
    }

    // Project deps
    const projectYamlPath = join(process.cwd(), "agents.yaml");
    if (await projectConfigExists(projectYamlPath)) {
      const projectConfig = await loadProjectConfig(projectYamlPath);
      if (projectConfig.dependencies.length > 0) {
        hasDeps = true;
        console.log("📁 Project dependencies:\n");
        printDeps(projectConfig.dependencies, config.agents);
      }
    }

    if (!hasDeps) {
      console.log(
        "No dependencies configured.\n\n" +
          "Add one with:\n" +
          "  agentdeps add <owner/repo>\n\n" +
          "Or create agents.yaml manually."
      );
    }
  });

function printDeps(
  deps: readonly Dependency[],
  targetAgents: readonly string[]
): void {
  for (const dep of deps) {
    console.log(`  ${dep.repo} (ref: ${dep.ref})`);

    // Skills
    if (dep.skills === "*") {
      console.log("    skills: all");
    } else if (dep.skills === false) {
      console.log("    skills: none");
    } else {
      console.log(`    skills: ${dep.skills.join(", ")}`);
    }

    // Agents
    if (dep.agents === "*") {
      console.log("    agents: all");
    } else if (dep.agents === false) {
      console.log("    agents: none");
    } else {
      console.log(`    agents: ${dep.agents.join(", ")}`);
    }

    console.log(`    targets: ${targetAgents.join(", ")}`);
    console.log();
  }
}
