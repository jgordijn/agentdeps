## ADDED Requirements

### Requirement: Registry maps agent names to skill paths
The tool SHALL maintain a built-in registry mapping agent identifiers to their project-scope and global-scope skill directory paths.

#### Scenario: Pi agent paths
- **WHEN** agent `pi` is configured
- **THEN** project skill path is `.pi/skills` and global skill path is `~/.pi/agent/skills`

#### Scenario: OpenCode agent paths
- **WHEN** agent `opencode` is configured
- **THEN** project skill path is `.agents/skills` and global skill path is `~/.config/opencode/skills`

#### Scenario: Claude Code agent paths
- **WHEN** agent `claude-code` is configured
- **THEN** project skill path is `.claude/skills` and global skill path is `~/.claude/skills`

#### Scenario: Cursor agent paths
- **WHEN** agent `cursor` is configured
- **THEN** project skill path is `.cursor/skills` and global skill path is `~/.cursor/skills`

### Requirement: Registry covers common agents
The registry SHALL include mappings for all widely-used coding agents, consistent with the Vercel skills CLI agent list.

#### Scenario: Universal agents supported
- **WHEN** checking the registry
- **THEN** it includes at minimum: `pi`, `opencode`, `claude-code`, `cursor`, `codex`, `amp`, `gemini-cli`, `github-copilot`, `roo`, `cline`, `windsurf`

### Requirement: Agents share universal path where applicable
Agents that use the same `.agents/skills/` convention SHALL be grouped as "Universal" agents in the interactive setup.

#### Scenario: Universal agents group
- **WHEN** the interactive setup displays agent choices
- **THEN** agents sharing `.agents/skills/` (amp, codex, gemini-cli, github-copilot, opencode, kimi-cli) are grouped under "Universal (.agents/skills)"

#### Scenario: Deduplication of universal project paths
- **WHEN** multiple universal agents are selected (e.g., opencode and codex)
- **THEN** only one set of symlinks is created in `.agents/skills/managed/` (not duplicated)

### Requirement: Unknown agent identifier rejected
The tool SHALL reject unknown agent identifiers during configuration.

#### Scenario: Invalid agent in config
- **WHEN** the global config contains an agent identifier not in the registry
- **THEN** the tool prints a warning listing the unknown agent and the available agent identifiers
