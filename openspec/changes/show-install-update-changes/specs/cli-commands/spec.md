## MODIFIED Requirements

### Requirement: CLI provides install command
The CLI SHALL provide an `install` command that reads dependency configurations, clones/pulls repositories to the cache, discovers skills and subagents, installs them for all configured agents, and reports managed items that were added, updated, or removed when install changes occur.

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

#### Scenario: Install reports managed item changes after dependency updates
- **WHEN** user runs `agentdeps install` and the resolved install state changes for a managed target after dependency updates or dependency selection changes
- **THEN** the output includes non-empty added, updated, and removed groups naming the affected managed skills and agents for that target

#### Scenario: Install stays concise when nothing changed
- **WHEN** user runs `agentdeps install` and all managed items already match the resolved dependencies
- **THEN** the output indicates the relevant scope or target is up to date without printing empty change groups
