/**
 * Agent Registry — maps coding agent names to their skill and subagent directory paths.
 *
 * Uses interfaces (not type intersections) per TypeScript performance guidelines.
 * All exported functions have explicit return types.
 */

/** Agent definition with project and global paths for skills and subagents */
export interface Agent {
  readonly name: string;
  readonly displayName: string;
  readonly projectSkills: string;
  readonly projectAgents: string;
  readonly globalSkills: string;
  readonly globalAgents: string;
  readonly isUniversal: boolean;
}

/** Custom agent definition from user config */
export interface CustomAgentDef {
  readonly project_skills: string;
  readonly project_agents: string;
  readonly global_skills: string;
  readonly global_agents: string;
}

const UNIVERSAL_PROJECT_SKILLS = ".agents/skills";
const UNIVERSAL_PROJECT_AGENTS = ".agents/agents";

/**
 * Built-in registry of known coding agents.
 * Universal agents share `.agents/skills` and `.agents/agents` at project scope.
 */
const BUILT_IN_AGENTS: readonly Agent[] = [
  {
    name: "pi",
    displayName: "Pi",
    projectSkills: ".pi/skills",
    projectAgents: ".pi/agents",
    globalSkills: "~/.pi/agent/skills",
    globalAgents: "~/.pi/agent/agents",
    isUniversal: false,
  },
  {
    name: "claude-code",
    displayName: "Claude Code",
    projectSkills: ".claude/skills",
    projectAgents: ".claude/agents",
    globalSkills: "~/.claude/skills",
    globalAgents: "~/.claude/agents",
    isUniversal: false,
  },
  {
    name: "cursor",
    displayName: "Cursor",
    projectSkills: ".cursor/skills",
    projectAgents: ".cursor/agents",
    globalSkills: "~/.cursor/skills",
    globalAgents: "~/.cursor/agents",
    isUniversal: false,
  },
  {
    name: "roo",
    displayName: "Roo",
    projectSkills: ".roo/skills",
    projectAgents: ".roo/agents",
    globalSkills: "~/.roo/skills",
    globalAgents: "~/.roo/agents",
    isUniversal: false,
  },
  {
    name: "cline",
    displayName: "Cline",
    projectSkills: ".cline/skills",
    projectAgents: ".cline/agents",
    globalSkills: "~/.cline/skills",
    globalAgents: "~/.cline/agents",
    isUniversal: false,
  },
  {
    name: "windsurf",
    displayName: "Windsurf",
    projectSkills: ".windsurf/skills",
    projectAgents: ".windsurf/agents",
    globalSkills: "~/.windsurf/skills",
    globalAgents: "~/.windsurf/agents",
    isUniversal: false,
  },
  // Universal agents — all share .agents/skills and .agents/agents at project scope
  {
    name: "opencode",
    displayName: "OpenCode",
    projectSkills: ".opencode/skills",
    projectAgents: ".opencode/agents",
    globalSkills: "~/.config/opencode/skills",
    globalAgents: "~/.config/opencode/agents",
    isUniversal: false,
  },
  {
    name: "codex",
    displayName: "Codex",
    projectSkills: UNIVERSAL_PROJECT_SKILLS,
    projectAgents: UNIVERSAL_PROJECT_AGENTS,
    globalSkills: "~/.config/codex/skills",
    globalAgents: "~/.config/codex/agents",
    isUniversal: true,
  },
  {
    name: "amp",
    displayName: "Amp",
    projectSkills: UNIVERSAL_PROJECT_SKILLS,
    projectAgents: UNIVERSAL_PROJECT_AGENTS,
    globalSkills: "~/.config/amp/skills",
    globalAgents: "~/.config/amp/agents",
    isUniversal: true,
  },
  {
    name: "gemini-cli",
    displayName: "Gemini CLI",
    projectSkills: UNIVERSAL_PROJECT_SKILLS,
    projectAgents: UNIVERSAL_PROJECT_AGENTS,
    globalSkills: "~/.config/gemini-cli/skills",
    globalAgents: "~/.config/gemini-cli/agents",
    isUniversal: true,
  },
  {
    name: "github-copilot",
    displayName: "GitHub Copilot",
    projectSkills: UNIVERSAL_PROJECT_SKILLS,
    projectAgents: UNIVERSAL_PROJECT_AGENTS,
    globalSkills: "~/.config/github-copilot/skills",
    globalAgents: "~/.config/github-copilot/agents",
    isUniversal: true,
  },
  {
    name: "kimi-cli",
    displayName: "Kimi CLI",
    projectSkills: UNIVERSAL_PROJECT_SKILLS,
    projectAgents: UNIVERSAL_PROJECT_AGENTS,
    globalSkills: "~/.config/kimi-cli/skills",
    globalAgents: "~/.config/kimi-cli/agents",
    isUniversal: true,
  },
] satisfies readonly Agent[];

/** Mutable registry that can be extended with custom agents */
let registry: Agent[] = [...BUILT_IN_AGENTS];

/** Get an agent by name, or undefined if not found */
export function getAgent(name: string): Agent | undefined {
  return registry.find((a) => a.name === name);
}

/** Get all registered agents */
export function allAgents(): readonly Agent[] {
  return registry;
}

/** Get agents that share the universal `.agents/` path convention */
export function universalAgents(): readonly Agent[] {
  return registry.filter((a) => a.isUniversal);
}

/** Get agents with their own unique path conventions */
export function nonUniversalAgents(): readonly Agent[] {
  return registry.filter((a) => !a.isUniversal);
}

/**
 * Validate that all agent names exist in the registry.
 * Returns a list of unknown names.
 */
export function validateAgentNames(names: readonly string[]): string[] {
  return names.filter((name) => !getAgent(name));
}

/**
 * Deduplicate project paths across selected agents.
 * Multiple universal agents share the same project paths, so we only need
 * to install once per unique path pair.
 *
 * Returns a map of `projectSkills -> { projectSkills, projectAgents }` (deduplicated).
 */
export interface AgentPaths {
  readonly projectSkills: string;
  readonly projectAgents: string;
  readonly globalSkills: string;
  readonly globalAgents: string;
}

/** Agent paths with display names of the agents that share them */
export interface LabeledAgentPaths extends AgentPaths {
  readonly displayNames: string[];
}

export function resolveAgentPaths(agentNames: readonly string[]): AgentPaths[] {
  const seenProject = new Set<string>();
  const paths: AgentPaths[] = [];

  for (const name of agentNames) {
    const agent = getAgent(name);
    if (!agent) continue;

    // Deduplicate by project skills path (the key differentiator)
    const projectKey = `${agent.projectSkills}|${agent.projectAgents}`;
    if (seenProject.has(projectKey)) {
      // Still add global paths if they differ
      // Check if we already have these global paths
      const hasGlobal = paths.some(
        (p) =>
          p.globalSkills === agent.globalSkills &&
          p.globalAgents === agent.globalAgents
      );
      if (!hasGlobal) {
        paths.push({
          projectSkills: agent.projectSkills,
          projectAgents: agent.projectAgents,
          globalSkills: agent.globalSkills,
          globalAgents: agent.globalAgents,
        });
      }
      continue;
    }

    seenProject.add(projectKey);
    paths.push({
      projectSkills: agent.projectSkills,
      projectAgents: agent.projectAgents,
      globalSkills: agent.globalSkills,
      globalAgents: agent.globalAgents,
    });
  }

  return paths;
}

/**
 * Resolve agent paths with display name labels.
 * Groups agents that share identical path sets and returns display names
 * so install output can show which agents received which items.
 *
 * Deduplication uses the full path tuple (project + global) as the key.
 */
export function resolveAgentPathsLabeled(agentNames: readonly string[]): LabeledAgentPaths[] {
  const pathMap = new Map<string, LabeledAgentPaths>();

  for (const name of agentNames) {
    const agent = getAgent(name);
    if (!agent) continue;

    const key = `${agent.projectSkills}|${agent.projectAgents}|${agent.globalSkills}|${agent.globalAgents}`;

    const existing = pathMap.get(key);
    if (existing) {
      existing.displayNames.push(agent.displayName);
    } else {
      pathMap.set(key, {
        projectSkills: agent.projectSkills,
        projectAgents: agent.projectAgents,
        globalSkills: agent.globalSkills,
        globalAgents: agent.globalAgents,
        displayNames: [agent.displayName],
      });
    }
  }

  return Array.from(pathMap.values());
}

/**
 * Merge custom agent definitions into the registry.
 * Custom agents take precedence on name collision with built-in agents.
 */
export function mergeCustomAgents(
  customAgents: Record<string, CustomAgentDef>
): void {
  // Remove any existing agents with matching names
  const customNames = new Set(Object.keys(customAgents));
  registry = registry.filter((a) => !customNames.has(a.name));

  // Add custom agents
  for (const [name, def] of Object.entries(customAgents)) {
    registry.push({
      name,
      displayName: name,
      projectSkills: def.project_skills,
      projectAgents: def.project_agents,
      globalSkills: def.global_skills,
      globalAgents: def.global_agents,
      isUniversal: false,
    });
  }
}

/** Reset registry to built-in agents only (useful for testing) */
export function resetRegistry(): void {
  registry = [...BUILT_IN_AGENTS];
}
