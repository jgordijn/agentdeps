## ADDED Requirements

### Requirement: CLI provides install command
The CLI SHALL provide an `install` command that reads dependency configurations, clones/pulls repositories to the cache, discovers skills and subagents, and installs them for all configured agents.

#### Scenario: Install with project agents.yaml
- **WHEN** user runs `agentdeps install` in a directory containing `agents.yaml`
- **THEN** the tool processes all dependencies, caches repos, and installs skills into `skills/_agentdeps_managed/` and subagents into `agents/_agentdeps_managed/` for each configured agent

#### Scenario: Install without agents.yaml
- **WHEN** user runs `agentdeps install` in a directory without `agents.yaml`
- **THEN** the tool processes only the global `agents.yaml` (if it exists) and prints a message that no project dependencies were found

#### Scenario: Install without global config
- **WHEN** user runs `agentdeps install` and no `~/.config/agentdeps/config.yaml` exists
- **THEN** the tool triggers the interactive setup before proceeding with installation

#### Scenario: Install via npx
- **WHEN** user runs `npx agentdeps install`
- **THEN** the tool works identically to a globally installed version, with no additional setup required beyond the first-run config

### Requirement: CLI provides add command
The CLI SHALL provide an `add <repo>` command that adds a new dependency to `agents.yaml` and runs installation for it. By default it targets the project-local `agents.yaml`. When the `--global` (or `-g`) flag is provided, it SHALL target the global `agents.yaml` at `~/.config/agentdeps/agents.yaml` instead.

#### Scenario: Add a new dependency with shorthand
- **WHEN** user runs `agentdeps add my-org/my-repo`
- **THEN** the tool discovers available skills and subagents in the repo, prompts the user to select which to install (or all), appends the dependency to the project `agents.yaml`, and installs them

#### Scenario: Add a dependency globally
- **WHEN** user runs `agentdeps add my-org/my-repo --global`
- **THEN** the tool discovers available skills and subagents in the repo, prompts the user to select which to install (or all), appends the dependency to the global `agents.yaml` at `~/.config/agentdeps/agents.yaml`, prints a message confirming the global target, and installs them to the global managed directories

#### Scenario: Add a dependency globally with short flag
- **WHEN** user runs `agentdeps add my-org/my-repo -g`
- **THEN** the behavior SHALL be identical to using `--global`

#### Scenario: Add a dependency that already exists in global config
- **WHEN** user runs `agentdeps add my-org/my-repo --global` and that repo is already in the global `agents.yaml`
- **THEN** the tool prints an error message indicating the dependency already exists in the global config and suggests editing the global `agents.yaml` directly

#### Scenario: Add a dependency that already exists
- **WHEN** user runs `agentdeps add my-org/my-repo` and that repo is already in `agents.yaml`
- **THEN** the tool prints an error message indicating the dependency already exists and suggests editing `agents.yaml` directly

#### Scenario: Add with explicit skill selection
- **WHEN** user runs `agentdeps add my-org/my-repo --skill frontend-design --skill kotlin-conventions`
- **THEN** the tool adds the dependency with only those skills listed, agents defaults to `"*"`, and skips the interactive picker

#### Scenario: Add with all skills and no agents
- **WHEN** user runs `agentdeps add my-org/my-repo --all-skills --no-agents`
- **THEN** the tool adds the dependency with `skills: "*"` and `agents: false`

#### Scenario: Add with all items
- **WHEN** user runs `agentdeps add my-org/my-repo --all`
- **THEN** the tool adds the dependency with `skills: "*"` and `agents: "*"`, skipping the interactive picker

#### Scenario: Add globally with explicit selections
- **WHEN** user runs `agentdeps add my-org/my-repo --global --skill my-skill --no-agents`
- **THEN** the tool adds the dependency with the specified selections to the global `agents.yaml`

#### Scenario: Add globally when global agents.yaml does not exist
- **WHEN** user runs `agentdeps add my-org/my-repo --global` and no global `agents.yaml` exists
- **THEN** the tool creates the global `agents.yaml` file, adds the dependency, and installs it

### Requirement: CLI provides remove command
The CLI SHALL provide a `remove <repo>` command that removes a dependency from `agents.yaml` and cleans up its installed items.

#### Scenario: Remove an existing dependency
- **WHEN** user runs `agentdeps remove my-org/my-repo`
- **THEN** the tool removes the dependency from `agents.yaml` and deletes all installed items in `_agentdeps_managed/` directories that came from that repo

#### Scenario: Remove a non-existent dependency
- **WHEN** user runs `agentdeps remove my-org/unknown-repo`
- **THEN** the tool prints an error message indicating the dependency was not found in `agents.yaml`

### Requirement: CLI provides list command
The CLI SHALL provide a `list` command that displays all installed dependencies, showing both skills and subagents.

#### Scenario: List installed dependencies
- **WHEN** user runs `agentdeps list`
- **THEN** the tool displays each dependency repo, its ref, the skills and subagents installed from it, and which agents they are installed to

#### Scenario: List when no dependencies exist
- **WHEN** user runs `agentdeps list` and no `agents.yaml` exists (project or global)
- **THEN** the tool prints a message indicating no dependencies are configured

### Requirement: CLI provides config command
The CLI SHALL provide a `config` command that re-runs the interactive setup to modify the global configuration.

#### Scenario: Re-run config setup
- **WHEN** user runs `agentdeps config`
- **THEN** the interactive setup runs, pre-populated with current values, and saves any changes to `~/.config/agentdeps/config.yaml`

### Requirement: CLI checks for git prerequisite
The CLI SHALL verify that `git` is available in PATH before executing any command that needs it.

#### Scenario: Git not installed
- **WHEN** user runs any `agentdeps` command that requires git and `git` is not found in PATH
- **THEN** the tool prints a clear error message explaining that git is required and exits with a non-zero status code

### Requirement: CLI provides helpful error messages
The CLI SHALL provide clear, actionable error messages for all failure cases.

#### Scenario: Invalid YAML in agents.yaml
- **WHEN** user runs `agentdeps install` and `agents.yaml` contains invalid YAML
- **THEN** the tool prints an error message with the file path and the YAML parse error details

#### Scenario: Unknown command
- **WHEN** user runs `agentdeps unknown-command`
- **THEN** the tool prints usage help showing available commands
