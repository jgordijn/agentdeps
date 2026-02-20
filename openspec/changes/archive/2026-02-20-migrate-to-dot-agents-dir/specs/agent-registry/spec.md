## MODIFIED Requirements

### Requirement: Registry maps agent names to skill and subagent paths
The tool SHALL maintain a built-in registry mapping agent identifiers to their project-scope and global-scope directory paths for both skills and subagents.

#### Scenario: Pi agent paths
- **WHEN** agent `pi` is configured
- **THEN** project paths are `.agents/skills` and `.agents/agents`, global paths are `~/.pi/agent/skills` and `~/.pi/agent/agents`

#### Scenario: OpenCode agent paths
- **WHEN** agent `opencode` is configured
- **THEN** project paths are `.agents/skills` and `.agents/agents`, global paths are `~/.config/opencode/skills` and `~/.config/opencode/agents`

#### Scenario: Claude Code agent paths
- **WHEN** agent `claude-code` is configured
- **THEN** project paths are `.claude/skills` and `.claude/agents`, global paths are `~/.claude/skills` and `~/.claude/agents`

#### Scenario: Cursor agent paths
- **WHEN** agent `cursor` is configured
- **THEN** project paths are `.cursor/skills` and `.cursor/agents`, global paths are `~/.cursor/skills` and `~/.cursor/agents`

### Requirement: Agents share universal path where applicable
Agents that use the same `.agents/skills/` and `.agents/agents/` convention SHALL be grouped as "Universal" agents in the interactive setup.

#### Scenario: Universal agents group
- **WHEN** the interactive setup displays agent choices
- **THEN** agents sharing `.agents/skills/` and `.agents/agents/` (pi, opencode, amp, codex, gemini-cli, github-copilot, kimi-cli) are grouped under "Universal (.agents/)"

#### Scenario: Deduplication of universal project paths
- **WHEN** multiple universal agents are selected (e.g., pi and codex)
- **THEN** only one set of items is installed in `.agents/skills/_agentdeps_managed/` and `.agents/agents/_agentdeps_managed/` (not duplicated)
