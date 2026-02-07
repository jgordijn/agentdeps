## ADDED Requirements

### Requirement: CLI provides install command
The CLI SHALL provide an `install` command that reads dependency configurations, clones/pulls repositories to the cache, discovers skills, and creates symlinks for all configured agents.

#### Scenario: Install with project agents.yaml
- **WHEN** user runs `agentdeps install` in a directory containing `agents.yaml`
- **THEN** the tool processes all dependencies, caches repos, and creates symlinks in each configured agent's `managed/` directory

#### Scenario: Install without agents.yaml
- **WHEN** user runs `agentdeps install` in a directory without `agents.yaml`
- **THEN** the tool processes only the global `agents.yaml` (if it exists) and prints a message that no project dependencies were found

#### Scenario: Install without global config
- **WHEN** user runs `agentdeps install` and no `~/.config/agentdeps/config.yaml` exists
- **THEN** the tool triggers the interactive setup before proceeding with installation

### Requirement: CLI provides add command
The CLI SHALL provide an `add <repo>` command that adds a new dependency to the project's `agents.yaml` and runs installation for it.

#### Scenario: Add a new dependency with shorthand
- **WHEN** user runs `agentdeps add my-org/my-skills`
- **THEN** the tool discovers available skills in the repo, prompts the user to select which skills to install (or all), appends the dependency to `agents.yaml`, and creates the symlinks

#### Scenario: Add a dependency that already exists
- **WHEN** user runs `agentdeps add my-org/my-skills` and that repo is already in `agents.yaml`
- **THEN** the tool prints an error message indicating the dependency already exists and suggests editing `agents.yaml` directly

#### Scenario: Add with explicit skill selection
- **WHEN** user runs `agentdeps add my-org/my-skills --skill frontend-design --skill kotlin-conventions`
- **THEN** the tool adds the dependency with only those skills listed and skips the interactive skill picker

#### Scenario: Add with all skills
- **WHEN** user runs `agentdeps add my-org/my-skills --all`
- **THEN** the tool adds the dependency with `skills: "*"` and skips the interactive skill picker

### Requirement: CLI provides remove command
The CLI SHALL provide a `remove <repo>` command that removes a dependency from `agents.yaml` and cleans up its symlinks.

#### Scenario: Remove an existing dependency
- **WHEN** user runs `agentdeps remove my-org/my-skills`
- **THEN** the tool removes the dependency from `agents.yaml` and deletes all symlinks in `managed/` directories that pointed to skills from that repo

#### Scenario: Remove a non-existent dependency
- **WHEN** user runs `agentdeps remove my-org/unknown-repo`
- **THEN** the tool prints an error message indicating the dependency was not found in `agents.yaml`

### Requirement: CLI provides list command
The CLI SHALL provide a `list` command that displays all installed skills, grouped by source repository.

#### Scenario: List installed skills
- **WHEN** user runs `agentdeps list`
- **THEN** the tool displays each dependency repo, its ref, and the skills installed from it, along with which agents they are symlinked to

#### Scenario: List when no dependencies exist
- **WHEN** user runs `agentdeps list` and no `agents.yaml` exists (project or global)
- **THEN** the tool prints a message indicating no dependencies are configured

### Requirement: CLI provides config command
The CLI SHALL provide a `config` command that re-runs the interactive setup to modify the global configuration.

#### Scenario: Re-run config setup
- **WHEN** user runs `agentdeps config`
- **THEN** the interactive setup runs, pre-populated with current values, and saves any changes to `~/.config/agentdeps/config.yaml`

### Requirement: CLI checks for git prerequisite
The CLI SHALL verify that `git` is available in PATH before executing any command.

#### Scenario: Git not installed
- **WHEN** user runs any `agentdeps` command and `git` is not found in PATH
- **THEN** the tool prints a clear error message explaining that git is required and exits with a non-zero status code

### Requirement: CLI provides helpful error messages
The CLI SHALL provide clear, actionable error messages for all failure cases.

#### Scenario: Invalid YAML in agents.yaml
- **WHEN** user runs `agentdeps install` and `agents.yaml` contains invalid YAML
- **THEN** the tool prints an error message with the file path and the YAML parse error details

#### Scenario: Unknown command
- **WHEN** user runs `agentdeps unknown-command`
- **THEN** the tool prints usage help showing available commands
