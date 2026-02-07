/**
 * Project-level configuration (agents.yaml).
 *
 * Defines dependencies with repo, ref, skills selection, and agents selection.
 */
import { parse, stringify } from "yaml";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";
import { logWarn } from "../log/logger.ts";

/** A single dependency declaration */
export interface Dependency {
  repo: string;
  ref: string;
  skills: "*" | string[] | false;
  agents: "*" | string[] | false;
}

/** Project configuration — the parsed agents.yaml */
export interface ProjectConfig {
  dependencies: Dependency[];
}

/** Raw YAML shape before normalization */
interface RawDependency {
  repo?: string;
  ref?: string;
  skills?: "*" | string[] | boolean;
  agents?: "*" | string[] | boolean;
}

/** Normalize a raw dependency, applying defaults and validation */
function normalizeDependency(raw: RawDependency, index: number): Dependency {
  if (!raw.repo) {
    throw new Error(`Dependency at index ${index} is missing required 'repo' field`);
  }

  // Normalize skills: omitted → "*", true → "*", false → false
  let skills: "*" | string[] | false;
  if (raw.skills === undefined || raw.skills === "*" || raw.skills === true) {
    skills = "*";
  } else if (raw.skills === false) {
    skills = false;
  } else if (Array.isArray(raw.skills)) {
    skills = raw.skills;
  } else {
    logWarn("config.normalize", `Dependency "${raw.repo}" has unexpected skills value (${JSON.stringify(raw.skills)}), defaulting to "*"`);
    skills = "*";
  }

  // Normalize agents: omitted → "*", true → "*", false → false
  let agents: "*" | string[] | false;
  if (raw.agents === undefined || raw.agents === "*" || raw.agents === true) {
    agents = "*";
  } else if (raw.agents === false) {
    agents = false;
  } else if (Array.isArray(raw.agents)) {
    agents = raw.agents;
  } else {
    logWarn("config.normalize", `Dependency "${raw.repo}" has unexpected agents value (${JSON.stringify(raw.agents)}), defaulting to "*"`);
    agents = "*";
  }

  return {
    repo: raw.repo,
    ref: raw.ref ?? "main",
    skills,
    agents,
  };
}

/** Check if a project agents.yaml exists at the given path */
export async function projectConfigExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Load and validate a project agents.yaml file */
export async function loadProjectConfig(path: string): Promise<ProjectConfig> {
  const content = await readFile(path, "utf-8");
  const raw = parse(content) as Record<string, unknown> | null;

  if (!raw || !raw["dependencies"]) {
    if (raw && !raw["dependencies"]) {
      console.warn("⚠ agents.yaml has no 'dependencies' field");
    }
    return { dependencies: [] };
  }

  const rawDeps = raw["dependencies"] as RawDependency[];
  if (!Array.isArray(rawDeps)) {
    throw new Error("'dependencies' must be an array in agents.yaml");
  }

  if (rawDeps.length === 0) {
    console.warn("⚠ agents.yaml has an empty dependencies list");
    return { dependencies: [] };
  }

  const dependencies = rawDeps.map((dep, i) => normalizeDependency(dep, i));
  return { dependencies };
}

/** Save a project config to disk */
export async function saveProjectConfig(
  path: string,
  config: ProjectConfig
): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });

  // Convert back to YAML-friendly format
  const yamlObj = {
    dependencies: config.dependencies.map((dep) => {
      const entry: Record<string, unknown> = { repo: dep.repo };
      if (dep.ref !== "main") {
        entry["ref"] = dep.ref;
      }
      if (dep.skills !== "*") {
        entry["skills"] = dep.skills;
      }
      if (dep.agents !== "*") {
        entry["agents"] = dep.agents;
      }
      return entry;
    }),
  };

  const content = stringify(yamlObj, { lineWidth: 0 });
  await writeFile(path, content, "utf-8");
}
