## ADDED Requirements

### Requirement: Interactive setup on first run
The tool SHALL present an interactive TUI setup when no global config file exists, before executing any command.

#### Scenario: First run triggers setup
- **WHEN** user runs any `agentdeps` command and `~/.config/agentdeps/config.yaml` does not exist
- **THEN** the interactive setup wizard starts before the command proceeds

#### Scenario: Subsequent runs skip setup
- **WHEN** user runs `agentdeps install` and the global config already exists
- **THEN** the setup is skipped and the command executes immediately

### Requirement: Setup asks for clone method
The interactive setup SHALL ask the user to choose between SSH and HTTPS for cloning repositories.

#### Scenario: User selects SSH
- **WHEN** user selects SSH during setup
- **THEN** `clone_method: ssh` is written to the global config

#### Scenario: User selects HTTPS
- **WHEN** user selects HTTPS during setup
- **THEN** `clone_method: https` is written to the global config

### Requirement: Setup asks for target agents
The interactive setup SHALL present a multi-select list of supported agents for the user to choose which ones they use.

#### Scenario: Agent selection with grouping
- **WHEN** the agent selection prompt is displayed
- **THEN** agents are grouped into "Universal (.agents/)" agents and "Other agents" with their specific paths shown

#### Scenario: User selects multiple agents
- **WHEN** user selects pi and opencode during setup
- **THEN** `agents: [pi, opencode]` is written to the global config

#### Scenario: User selects no agents
- **WHEN** user deselects all agents and tries to confirm
- **THEN** the tool requires at least one agent to be selected before proceeding

#### Scenario: Custom agents appear in selection
- **WHEN** the user has previously defined custom agents in the global config and re-runs setup via `agentdeps config`
- **THEN** custom agents appear alongside built-in agents in the selection prompt

### Requirement: Setup asks for install method
The interactive setup SHALL ask the user to choose between link and copy install methods.

#### Scenario: User selects link
- **WHEN** user selects "Link (symlinks)" during setup
- **THEN** `install_method: link` is written to the global config

#### Scenario: User selects copy
- **WHEN** user selects "Copy (smart sync)" during setup
- **THEN** `install_method: copy` is written to the global config

### Requirement: Config command re-runs setup
The `agentdeps config` command SHALL re-run the interactive setup with current values pre-populated.

#### Scenario: Edit existing config
- **WHEN** user runs `agentdeps config` with an existing config
- **THEN** the setup wizard shows current values as defaults, and saves any modifications

### Requirement: Setup uses @clack/prompts library
The interactive setup SHALL use the `@clack/prompts` library for TUI form components.

#### Scenario: Non-interactive environment
- **WHEN** the tool detects it is running in a non-interactive terminal (no TTY)
- **THEN** the tool prints an error message explaining that initial setup requires an interactive terminal, and suggests running `agentdeps config` first
