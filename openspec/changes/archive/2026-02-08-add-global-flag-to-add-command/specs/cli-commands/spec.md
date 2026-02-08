## MODIFIED Requirements

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
