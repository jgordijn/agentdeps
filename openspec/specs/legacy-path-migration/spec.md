## ADDED Requirements

### Requirement: Registry tracks legacy project paths for migrated agents
The registry SHALL store legacy project paths for agents that have migrated from agent-specific directories to the universal `.agents/` convention.

#### Scenario: Pi has legacy project paths
- **WHEN** querying legacy paths for agent `pi`
- **THEN** the legacy project skills path is `.pi/skills` and the legacy project agents path is `.pi/agents`

#### Scenario: OpenCode has legacy project paths
- **WHEN** querying legacy paths for agent `opencode`
- **THEN** the legacy project skills path is `.opencode/skills` and the legacy project agents path is `.opencode/agents`

#### Scenario: Non-migrated agent has no legacy paths
- **WHEN** querying legacy paths for agent `claude-code`
- **THEN** no legacy paths are returned

#### Scenario: Universal agent that was always universal has no legacy paths
- **WHEN** querying legacy paths for agent `codex`
- **THEN** no legacy paths are returned

### Requirement: Install cleans up legacy managed directories
During install, the tool SHALL detect and remove `_agentdeps_managed/` directories at legacy project paths for configured agents that have migrated to `.agents/`.

#### Scenario: Pi legacy skills directory cleaned up
- **WHEN** agent `pi` is configured and `.pi/skills/_agentdeps_managed/` exists in the project
- **THEN** `.pi/skills/_agentdeps_managed/` is removed during install

#### Scenario: Pi legacy agents directory cleaned up
- **WHEN** agent `pi` is configured and `.pi/agents/_agentdeps_managed/` exists in the project
- **THEN** `.pi/agents/_agentdeps_managed/` is removed during install

#### Scenario: OpenCode legacy skills directory cleaned up
- **WHEN** agent `opencode` is configured and `.opencode/skills/_agentdeps_managed/` exists in the project
- **THEN** `.opencode/skills/_agentdeps_managed/` is removed during install

#### Scenario: OpenCode legacy agents directory cleaned up
- **WHEN** agent `opencode` is configured and `.opencode/agents/_agentdeps_managed/` exists in the project
- **THEN** `.opencode/agents/_agentdeps_managed/` is removed during install

#### Scenario: No legacy directory exists
- **WHEN** agent `pi` is configured but `.pi/skills/_agentdeps_managed/` does not exist
- **THEN** the migration step completes without error

#### Scenario: Only managed directories are removed
- **WHEN** agent `pi` is configured and `.pi/skills/` contains both `_agentdeps_managed/` and user-created content
- **THEN** only `_agentdeps_managed/` is removed; user-created content is untouched

#### Scenario: Migration runs before install
- **WHEN** `agentdeps install` is executed
- **THEN** legacy path cleanup runs before the main install flow installs items to `.agents/`

#### Scenario: Unconfigured agent legacy paths are not touched
- **WHEN** agent `pi` is NOT in the configured agents list but `.pi/skills/_agentdeps_managed/` exists
- **THEN** the directory is NOT removed (agentdeps only cleans up agents it manages)
