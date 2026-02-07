/**
 * Config command — re-runs the interactive setup to modify global configuration.
 */
import { Command } from "commander";
import { loadGlobalConfig, saveGlobalConfig } from "../config/global.ts";
import { mergeCustomAgents } from "../registry/registry.ts";
import { runSetup } from "../setup/setup.ts";

export const configCommand = new Command("config")
  .description("Configure agentdeps (re-run interactive setup)")
  .action(async () => {
    // Load existing config if any
    const existing = await loadGlobalConfig();

    // If custom agents exist, merge them so they appear in the selection
    if (existing?.custom_agents) {
      mergeCustomAgents(existing.custom_agents);
    }

    const result = await runSetup({ defaults: existing });
    if (!result) {
      return; // User cancelled
    }

    // Preserve custom_agents from existing config if not in result
    if (existing?.custom_agents && !result.custom_agents) {
      result.custom_agents = existing.custom_agents;
    }

    await saveGlobalConfig(result);
    console.log("\n✓ Configuration saved");
  });
