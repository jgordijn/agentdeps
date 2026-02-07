/**
 * Global configuration management.
 *
 * Stores user preferences at the platform-appropriate config directory:
 * - Linux: ~/.config/agentdeps/config.yaml
 * - macOS: ~/Library/Application Support/agentdeps/config.yaml
 * - Windows: %APPDATA%/agentdeps/config.yaml
 */
import { parse, stringify } from "yaml";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import type { CustomAgentDef } from "../registry/registry.ts";

export interface GlobalConfig {
  clone_method: "ssh" | "https";
  agents: string[];
  install_method: "link" | "copy";
  custom_agents?: Record<string, CustomAgentDef>;
}

/** Get the platform-appropriate config directory for agentdeps */
export function getConfigDir(): string {
  const home = homedir();
  const plat = platform();

  if (plat === "darwin") {
    return join(home, "Library", "Application Support", "agentdeps");
  }
  if (plat === "win32") {
    return process.env["APPDATA"] ?? join(home, "AppData", "Roaming", "agentdeps");
  }
  // Linux and others: use XDG_CONFIG_HOME or default
  const xdg = process.env["XDG_CONFIG_HOME"];
  return join(xdg ?? join(home, ".config"), "agentdeps");
}

/** Get the path to config.yaml */
export function globalConfigPath(): string {
  return join(getConfigDir(), "config.yaml");
}

/** Get the path to the global agents.yaml */
export function globalAgentsYamlPath(): string {
  return join(getConfigDir(), "agents.yaml");
}

/** Check if the global config file exists */
export async function globalConfigExists(): Promise<boolean> {
  try {
    await access(globalConfigPath());
    return true;
  } catch {
    return false;
  }
}

/** Load global config from disk. Returns undefined if file doesn't exist. */
export async function loadGlobalConfig(): Promise<GlobalConfig | undefined> {
  try {
    const content = await readFile(globalConfigPath(), "utf-8");
    const raw = parse(content) as Record<string, unknown>;

    return {
      clone_method: (raw["clone_method"] as "ssh" | "https") ?? "ssh",
      agents: (raw["agents"] as string[]) ?? [],
      install_method: (raw["install_method"] as "link" | "copy") ?? "link",
      custom_agents: raw["custom_agents"] as Record<string, CustomAgentDef> | undefined,
    };
  } catch {
    return undefined;
  }
}

/** Save global config to disk, creating parent directories if needed. */
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  const dir = getConfigDir();
  await mkdir(dir, { recursive: true });

  const content = stringify(config, { lineWidth: 0 });
  await writeFile(globalConfigPath(), content, "utf-8");
}
