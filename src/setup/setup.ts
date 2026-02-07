/**
 * Interactive first-run setup using @clack/prompts.
 *
 * Asks the user for:
 * 1. Clone method (SSH / HTTPS)
 * 2. Target agents (multi-select, grouped)
 * 3. Install method (Link / Copy)
 */
import * as p from "@clack/prompts";
import {
  universalAgents,
  nonUniversalAgents,
} from "../registry/registry.ts";
import type { GlobalConfig } from "../config/global.ts";

/** Check if running in an interactive terminal */
export function isInteractive(): boolean {
  return process.stdin.isTTY === true;
}

/** Options for the setup wizard */
export interface SetupOptions {
  /** Existing config to pre-populate defaults */
  defaults?: GlobalConfig;
}

/**
 * Run the interactive setup wizard.
 * Returns the config values, or undefined if the user cancelled.
 */
export async function runSetup(
  options: SetupOptions = {}
): Promise<GlobalConfig | undefined> {
  const { defaults } = options;

  p.intro("⚙️  agentdeps setup");

  // 1. Clone method
  const cloneMethod = await p.select({
    message: "How do you clone git repositories?",
    options: [
      { value: "ssh" as const, label: "SSH (git@github.com:...)" },
      { value: "https" as const, label: "HTTPS (https://github.com/...)" },
    ],
    initialValue: defaults?.clone_method ?? "ssh",
  });

  if (p.isCancel(cloneMethod)) {
    p.cancel("Setup cancelled.");
    return undefined;
  }

  // 2. Agent selection — grouped into Universal and Other
  const universal = universalAgents();
  const nonUniversal = nonUniversalAgents();

  const agentOptions: Array<{
    value: string;
    label: string;
    hint?: string;
  }> = [];

  // Add separator-style label for Universal group
  for (const agent of nonUniversal) {
    agentOptions.push({
      value: agent.name,
      label: `${agent.displayName}`,
      hint: `${agent.projectSkills}, ${agent.projectAgents}`,
    });
  }

  // Universal agents — note they share paths
  for (const agent of universal) {
    agentOptions.push({
      value: agent.name,
      label: `${agent.displayName}`,
      hint: ".agents/skills, .agents/agents (Universal)",
    });
  }

  const selectedAgents = await p.multiselect({
    message: "Which coding agents do you use? (space to select, enter to confirm)",
    options: agentOptions,
    initialValues: defaults?.agents ?? [],
    required: true,
  });

  if (p.isCancel(selectedAgents)) {
    p.cancel("Setup cancelled.");
    return undefined;
  }

  if (selectedAgents.length === 0) {
    p.log.error("At least one agent must be selected.");
    return runSetup(options);
  }

  // 3. Install method
  const installMethod = await p.select({
    message: "How should dependencies be installed?",
    options: [
      {
        value: "link" as const,
        label: "Link (symlinks)",
        hint: "Fast, no duplication — default",
      },
      {
        value: "copy" as const,
        label: "Copy (smart sync)",
        hint: "Portable, self-contained",
      },
    ],
    initialValue: defaults?.install_method ?? "link",
  });

  if (p.isCancel(installMethod)) {
    p.cancel("Setup cancelled.");
    return undefined;
  }

  p.outro("✅ Configuration saved!");

  return {
    clone_method: cloneMethod,
    agents: selectedAgents as string[],
    install_method: installMethod,
    custom_agents: defaults?.custom_agents,
  };
}
