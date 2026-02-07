## ADDED Requirements

### Requirement: Global config stores user preferences
The global config file at `~/.config/agentdeps/config.yaml` SHALL store the user's clone method, target agents, install method, and custom agent definitions.

#### Scenario: Config file structure
- **WHEN** the global config exists
- **THEN** it contains `clone_method` (either `ssh` or `https`), `agents` (a list of agent identifiers), `install_method` (either `link` or `copy`, default `link`), and optionally `custom_agents` (a map of custom agent definitions)

#### Scenario: Config location follows OS conventions
- **WHEN** the tool resolves the config directory
- **THEN** it uses platform-appropriate paths: `~/.config` on Linux, `~/Library/Application Support` on macOS, and `%APPDATA%` on Windows

### Requirement: Global agents.yaml provides personal dependencies
A global `agents.yaml` at `~/.config/agentdeps/agents.yaml` SHALL define personal dependencies that are installed to global agent paths.

#### Scenario: Global dependencies installed to global agent paths
- **WHEN** the global `agents.yaml` contains dependencies
- **THEN** skills and subagents are installed to the global directories for each configured agent (e.g., `~/.pi/agent/skills/_agentdeps_managed/` and `~/.pi/agent/agents/_agentdeps_managed/` for pi)

#### Scenario: Global dependencies installed implicitly
- **WHEN** user runs `agentdeps install` in any directory
- **THEN** the global `agents.yaml` is processed first, before any project-level `agents.yaml`

#### Scenario: No global agents.yaml
- **WHEN** no `~/.config/agentdeps/agents.yaml` exists
- **THEN** the tool skips global dependency processing without error

### Requirement: Clone method determines URL expansion
The `clone_method` setting SHALL control how shorthand repo references are expanded to full git URLs.

#### Scenario: SSH clone method
- **WHEN** `clone_method` is `ssh` and a dependency uses shorthand `owner/repo`
- **THEN** the repo URL is expanded to `git@github.com:owner/repo.git`

#### Scenario: HTTPS clone method
- **WHEN** `clone_method` is `https` and a dependency uses shorthand `owner/repo`
- **THEN** the repo URL is expanded to `https://github.com/owner/repo.git`

### Requirement: Agents list determines install targets
The `agents` list in global config SHALL determine which agent directories receive installed items.

#### Scenario: Multiple agents configured
- **WHEN** global config has `agents: [pi, opencode]`
- **THEN** items are installed to both pi's directories (`.pi/skills/_agentdeps_managed/`, `.pi/agents/_agentdeps_managed/`) and opencode's directories (`.agents/skills/_agentdeps_managed/`, `.agents/agents/_agentdeps_managed/`) for project scope, or their respective global paths

#### Scenario: Single agent configured
- **WHEN** global config has `agents: [pi]`
- **THEN** items are only installed to pi's directories

### Requirement: Install method determines how items are placed
The `install_method` setting SHALL control whether items are symlinked or copied.

#### Scenario: Link install method
- **WHEN** `install_method` is `link` (or omitted, as it is the default)
- **THEN** items are symlinked from `_agentdeps_managed/` to the cached repo

#### Scenario: Copy install method
- **WHEN** `install_method` is `copy`
- **THEN** items are copied from the cached repo into `_agentdeps_managed/` using smart sync (add new, update changed, remove deleted)

### Requirement: Custom agents in global config
The `custom_agents` section SHALL allow users to define additional agents with custom paths.

#### Scenario: Custom agent definition
- **WHEN** the global config contains:
  ```yaml
  custom_agents:
    my-agent:
      project_skills: .my-agent/skills
      project_agents: .my-agent/agents
      global_skills: ~/.my-agent/skills
      global_agents: ~/.my-agent/agents
  ```
- **THEN** `my-agent` can be listed in the `agents` array and will receive installed items at those paths

#### Scenario: Custom agent overrides built-in
- **WHEN** a custom agent has the same name as a built-in agent
- **THEN** the custom paths take precedence over the built-in paths
