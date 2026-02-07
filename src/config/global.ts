/**
 * Global configuration management.
 *
 * Stores user preferences at the platform-appropriate config directory:
 * - Linux: ~/.config/agentdeps/config.yaml
 * - macOS: ~/Library/Application Support/agentdeps/config.yaml
 * - Windows: %APPDATA%/agentdeps/config.yaml
 */
import { parse, stringify } from "yaml";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import type { CustomAgentDef } from "../registry/registry.ts";
import { logError, printLogHint } from "../log/logger.ts";

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
    const appData = process.env["APPDATA"] ?? join(home, "AppData", "Roaming");
    return join(appData, "agentdeps");
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
  return Bun.file(globalConfigPath()).exists();
}

/** Load global config from disk. Returns undefined if file doesn't exist. */
export async function loadGlobalConfig(): Promise<GlobalConfig | undefined> {
  const path = globalConfigPath();
  const file = Bun.file(path);

  if (!(await file.exists())) {
    return undefined;
  }

  const content = await file.text();
  const raw = parse(content) as Record<string, unknown>;

  // Validate clone_method
  const cloneMethod = raw["clone_method"] ?? "ssh";
  if (cloneMethod !== "ssh" && cloneMethod !== "https") {
    throw new Error(`Invalid clone_method: "${cloneMethod}". Must be "ssh" or "https".`);
  }

  // Validate install_method
  const installMethod = raw["install_method"] ?? "link";
  if (installMethod !== "link" && installMethod !== "copy") {
    throw new Error(`Invalid install_method: "${installMethod}". Must be "link" or "copy".`);
  }

  // Validate agents
  const agents = raw["agents"] ?? [];
  if (!Array.isArray(agents)) {
    throw new Error(`Invalid agents: expected an array, got ${typeof agents}.`);
  }

  return {
    clone_method: cloneMethod,
    agents: agents as string[],
    install_method: installMethod,
    custom_agents: raw["custom_agents"] as Record<string, CustomAgentDef> | undefined,
  };
}

/**
 * Load global config with CLI-appropriate error handling.
 * Returns the config, or logs and exits on missing/invalid config.
 */
export async function requireGlobalConfig(): Promise<GlobalConfig> {
  try {
    const config = await loadGlobalConfig();
    if (!config) {
      console.error("✗ No global config found. Run `agentdeps config` first.");
      process.exit(1);
    }
    return config;
  } catch (err) {
    logError("config", err);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ Invalid config at ${globalConfigPath()}: ${msg}`);
    console.error(`  Run \`agentdeps config\` to fix it.`);
    printLogHint();
    process.exit(1);
  }
}

/** Save global config to disk, creating parent directories if needed. */
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  const dir = getConfigDir();
  await mkdir(dir, { recursive: true });

  const content = stringify(config, { lineWidth: 0 });
  await Bun.write(globalConfigPath(), content);
}
