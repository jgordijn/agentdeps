## ADDED Requirements

### Requirement: Install items for project dependencies
The tool SHALL install items from the cached repository into each configured agent's project `skills/_agentdeps_managed/` and `agents/_agentdeps_managed/` directories.

#### Scenario: Skill installation for pi
- **WHEN** pi is a configured agent and skill `frontend-design` is resolved from `vercel-labs/agent-skills`
- **THEN** `frontend-design` is installed at `.agents/skills/_agentdeps_managed/frontend-design` (via symlink or copy depending on install method)

#### Scenario: Subagent installation for pi
- **WHEN** pi is a configured agent and subagent `code-reviewer` is resolved from a dependency
- **THEN** `code-reviewer` is installed at `.agents/agents/_agentdeps_managed/code-reviewer`

#### Scenario: Skill installation for opencode
- **WHEN** opencode is a configured agent and skill `frontend-design` is resolved
- **THEN** `frontend-design` is installed at `.agents/skills/_agentdeps_managed/frontend-design`

#### Scenario: Managed directory created automatically
- **WHEN** the `_agentdeps_managed/` subdirectory does not exist under the agent's skill or agents directory
- **THEN** the tool creates it (including parent directories) before installing items

### Requirement: Install items for global dependencies
The tool SHALL install items from the cached repository into each configured agent's global `skills/_agentdeps_managed/` and `agents/_agentdeps_managed/` directories for dependencies declared in the global `agents.yaml`.

#### Scenario: Global skill for pi
- **WHEN** pi is configured and a global dependency provides skill `my-skill`
- **THEN** `my-skill` is installed at `~/.pi/agent/skills/_agentdeps_managed/my-skill`

#### Scenario: Global subagent for pi
- **WHEN** pi is configured and a global dependency provides subagent `my-agent`
- **THEN** `my-agent` is installed at `~/.pi/agent/agents/_agentdeps_managed/my-agent`

### Requirement: Link install method creates symlinks
When `install_method` is `link` (the default), the tool SHALL create symlinks pointing to the cached repository.

#### Scenario: Symlink creation
- **WHEN** install method is `link` and skill `frontend-design` is installed for pi
- **THEN** a symlink is created at `.agents/skills/_agentdeps_managed/frontend-design` pointing to `<cache-dir>/agentdeps/repos/vercel-labs-agent-skills-main/skills/frontend-design`

#### Scenario: Windows symlink fallback to junction
- **WHEN** `os.symlink` fails on Windows (e.g., Developer Mode not enabled)
- **THEN** the tool attempts to create a directory junction using `mklink /J`

#### Scenario: Windows junction also fails
- **WHEN** both symlink and directory junction creation fail on Windows
- **THEN** the tool prints a clear error suggesting to switch to `install_method: copy` or enable Developer Mode

### Requirement: Copy install method performs smart sync
When `install_method` is `copy`, the tool SHALL copy files from the cached repository and keep them in sync.

#### Scenario: Initial copy
- **WHEN** install method is `copy` and a skill is installed for the first time
- **THEN** the entire skill directory is copied from the cache into `_agentdeps_managed/`

#### Scenario: Sync adds new files
- **WHEN** a previously installed skill has new files added in the source
- **THEN** the new files are copied to the destination on the next install

#### Scenario: Sync updates changed files
- **WHEN** a previously installed skill has files modified in the source
- **THEN** the modified files are overwritten in the destination on the next install

#### Scenario: Sync removes deleted files
- **WHEN** a previously installed skill has files or directories deleted from the source
- **THEN** those files or directories are removed from the destination on the next install

#### Scenario: Sync removes deleted subdirectories
- **WHEN** a previously installed skill has an entire subdirectory deleted from the source
- **THEN** that subdirectory and all its contents are removed from the destination on the next install

### Requirement: Prune stale items
The tool SHALL remove items from `_agentdeps_managed/` directories that no longer correspond to any resolved dependency.

#### Scenario: Dependency removed from agents.yaml
- **WHEN** a repo is removed from `agents.yaml` and `agentdeps install` is run
- **THEN** all items in `_agentdeps_managed/` that came from that repo are removed

#### Scenario: Skill removed from dependency list
- **WHEN** a dependency changes from `skills: "*"` to `skills: [only-this-one]`
- **THEN** items for all other skills from that repo are removed from `skills/_agentdeps_managed/`

#### Scenario: Agent removed from dependency list
- **WHEN** a dependency changes from `agents: "*"` to `agents: false`
- **THEN** all subagents from that repo are removed from `agents/_agentdeps_managed/`

#### Scenario: Prune across all agents
- **WHEN** stale items exist in multiple agent directories
- **THEN** the tool prunes stale items from all configured agents' `_agentdeps_managed/` directories

#### Scenario: Only managed items are pruned
- **WHEN** `_agentdeps_managed/` contains entries
- **THEN** the tool only removes entries that no longer match any resolved dependency, leaving other entries untouched

### Requirement: Idempotent installation
The tool SHALL handle the case where an item already exists and is up to date.

#### Scenario: Symlink already correct (link mode)
- **WHEN** a symlink at the expected path already points to the correct cached directory
- **THEN** the tool leaves it as-is without error

#### Scenario: Symlink points to wrong target (link mode)
- **WHEN** a symlink exists but points to a different target (e.g., ref changed)
- **THEN** the tool removes the old symlink and creates a new one pointing to the correct target

#### Scenario: Copy already up to date (copy mode)
- **WHEN** all files in the destination match the source
- **THEN** the tool leaves them as-is without unnecessary writes
