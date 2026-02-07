## ADDED Requirements

### Requirement: Global config stores user preferences
The global config file at `~/.config/agentdeps/config.yaml` (using `os.UserConfigDir()`) SHALL store the user's clone method and target agents.

#### Scenario: Config file structure
- **WHEN** the global config exists
- **THEN** it contains `clone_method` (either `ssh` or `https`) and `agents` (a list of agent identifiers)

#### Scenario: Config location follows OS conventions
- **WHEN** the tool resolves the config directory
- **THEN** it uses `os.UserConfigDir()` which returns `~/.config` on Linux, `~/Library/Application Support` on macOS, and `%APPDATA%` on Windows

### Requirement: Global agents.yaml provides personal dependencies
A global `agents.yaml` at `~/.config/agentdeps/agents.yaml` SHALL define personal skill dependencies that are installed to global agent paths.

#### Scenario: Global dependencies installed to global agent paths
- **WHEN** the global `agents.yaml` contains dependencies
- **THEN** skills are symlinked to the global skill directories for each configured agent (e.g., `~/.pi/agent/skills/managed/` for pi)

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

### Requirement: Agents list determines symlink targets
The `agents` list in global config SHALL determine which agent skill directories receive symlinks.

#### Scenario: Multiple agents configured
- **WHEN** global config has `agents: [pi, opencode]`
- **THEN** skills are symlinked to both `.pi/skills/managed/` and `.agents/skills/managed/` (for project scope) or their respective global paths

#### Scenario: Single agent configured
- **WHEN** global config has `agents: [pi]`
- **THEN** skills are only symlinked to pi's skill directory
