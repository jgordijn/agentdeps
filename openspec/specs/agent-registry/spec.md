## ADDED Requirements

### Requirement: Registry maps agent names to skill and subagent paths
The tool SHALL maintain a built-in registry mapping agent identifiers to their project-scope and global-scope directory paths for both skills and subagents.

#### Scenario: Pi agent paths
- **WHEN** agent `pi` is configured
- **THEN** project paths are `.pi/skills` and `.pi/agents`, global paths are `~/.pi/agent/skills` and `~/.pi/agent/agents`

#### Scenario: OpenCode agent paths
- **WHEN** agent `opencode` is configured
- **THEN** project paths are `.agents/skills` and `.agents/agents`, global paths are `~/.config/opencode/skills` and `~/.config/opencode/agents`

#### Scenario: Claude Code agent paths
- **WHEN** agent `claude-code` is configured
- **THEN** project paths are `.claude/skills` and `.claude/agents`, global paths are `~/.claude/skills` and `~/.claude/agents`

#### Scenario: Cursor agent paths
- **WHEN** agent `cursor` is configured
- **THEN** project paths are `.cursor/skills` and `.cursor/agents`, global paths are `~/.cursor/skills` and `~/.cursor/agents`

### Requirement: Registry covers common agents
The registry SHALL include mappings for all widely-used coding agents, consistent with the Vercel skills CLI agent list.

#### Scenario: Supported agents
- **WHEN** checking the registry
- **THEN** it includes at minimum: `pi`, `opencode`, `claude-code`, `cursor`, `codex`, `amp`, `gemini-cli`, `github-copilot`, `roo`, `cline`, `windsurf`

### Requirement: Agents share universal path where applicable
Agents that use the same `.agents/skills/` and `.agents/agents/` convention SHALL be grouped as "Universal" agents in the interactive setup.

#### Scenario: Universal agents group
- **WHEN** the interactive setup displays agent choices
- **THEN** agents sharing `.agents/skills/` and `.agents/agents/` (amp, codex, gemini-cli, github-copilot, opencode, kimi-cli) are grouped under "Universal (.agents/)"

#### Scenario: Deduplication of universal project paths
- **WHEN** multiple universal agents are selected (e.g., opencode and codex)
- **THEN** only one set of items is installed in `.agents/skills/_agentdeps_managed/` and `.agents/agents/_agentdeps_managed/` (not duplicated)

### Requirement: Unknown agent identifier rejected
The tool SHALL reject unknown agent identifiers during configuration unless they are defined as custom agents.

#### Scenario: Invalid agent in config
- **WHEN** the global config contains an agent identifier not in the built-in registry and not defined as a custom agent
- **THEN** the tool prints a warning listing the unknown agent and the available agent identifiers

### Requirement: Users can define custom agents
The global config SHALL support user-defined custom agents with custom skill and subagent paths.

#### Scenario: Custom agent definition
- **WHEN** the global config contains a `custom_agents` entry with name `my-agent`, `project_skills: .my-agent/skills`, `project_agents: .my-agent/agents`, `global_skills: ~/.my-agent/skills`, `global_agents: ~/.my-agent/agents`
- **THEN** `my-agent` is available as a valid agent identifier and can be selected as a target

#### Scenario: Custom agent appears in interactive setup
- **WHEN** the user has defined custom agents in the global config
- **THEN** those custom agents appear alongside built-in agents in the agent selection prompt

#### Scenario: Custom agent overrides built-in
- **WHEN** a custom agent is defined with the same name as a built-in agent (e.g., `pi`)
- **THEN** the custom definition's paths take precedence over the built-in paths
