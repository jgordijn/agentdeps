/**
 * Root command — the main commander program with all subcommands.
 */
import { Command } from "commander";
import { checkGitAvailable } from "../cache/cache.ts";
import {
  globalConfigExists,
  loadGlobalConfig,
  saveGlobalConfig,
} from "../config/global.ts";
import { isInteractive, runSetup } from "../setup/setup.ts";
import { installCommand } from "./install.ts";
import { addCommand } from "./add.ts";
import { removeCommand } from "./remove.ts";
import { listCommand } from "./list.ts";
import { configCommand } from "./config.ts";

export const program = new Command()
  .name("agentdeps")
  .version("0.1.0")
  .description(
    "Declarative dependency manager for AI coding agent skills and subagents"
  );

// Commands that need git and config
const commandsNeedingPrecheck = ["install", "add", "remove", "list"];

// Pre-action hook for commands that need git and config
program.hook("preAction", async (thisCommand, actionCommand) => {
  const cmdName = actionCommand.name();

  // Skip prechecks for config and help
  if (!commandsNeedingPrecheck.includes(cmdName)) {
    return;
  }

  // Check for git
  const gitAvailable = await checkGitAvailable();
  if (!gitAvailable) {
    console.error(
      "✗ git is not installed or not in PATH.\n" +
        "  agentdeps requires git to clone and update repositories.\n" +
        "  Install git: https://git-scm.com/downloads"
    );
    process.exit(1);
  }

  // Check for global config — trigger setup if missing
  const configExists = await globalConfigExists();
  if (!configExists) {
    if (!isInteractive()) {
      console.error(
        "✗ No configuration found and terminal is not interactive.\n" +
          "  Run `agentdeps config` in an interactive terminal first."
      );
      process.exit(1);
    }

    console.log("Welcome to agentdeps! Let's set up your configuration.\n");
    const result = await runSetup();
    if (!result) {
      process.exit(1);
    }
    await saveGlobalConfig(result);
  }
});

// Register subcommands
program.addCommand(installCommand);
program.addCommand(addCommand);
program.addCommand(removeCommand);
program.addCommand(listCommand);
program.addCommand(configCommand);
