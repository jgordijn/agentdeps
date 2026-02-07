## ADDED Requirements

### Requirement: Create symlinks for project dependencies
The tool SHALL create symlinks from each configured agent's project skill directory into the cached repository's skill directory.

#### Scenario: Symlink creation for pi
- **WHEN** pi is a configured agent and skill `frontend-design` is resolved from `vercel-labs/agent-skills`
- **THEN** a symlink is created at `.pi/skills/managed/frontend-design` pointing to `<cache-dir>/agentdeps/repos/vercel-labs-agent-skills-main/skills/frontend-design`

#### Scenario: Symlink creation for opencode
- **WHEN** opencode is a configured agent and skill `frontend-design` is resolved
- **THEN** a symlink is created at `.agents/skills/managed/frontend-design` pointing to the cached skill directory

#### Scenario: Managed directory created automatically
- **WHEN** the `managed/` subdirectory does not exist under the agent's skill directory
- **THEN** the tool creates it (including parent directories) before creating symlinks

### Requirement: Create symlinks for global dependencies
The tool SHALL create symlinks from each configured agent's global skill directory for dependencies declared in the global `agents.yaml`.

#### Scenario: Global symlink for pi
- **WHEN** pi is configured and a global dependency provides skill `my-skill`
- **THEN** a symlink is created at `~/.pi/agent/skills/managed/my-skill` pointing to the cached skill directory

### Requirement: Prune stale symlinks
The tool SHALL remove symlinks from `managed/` directories that no longer correspond to any resolved dependency.

#### Scenario: Dependency removed from agents.yaml
- **WHEN** a repo is removed from `agents.yaml` and `agentdeps install` is run
- **THEN** all symlinks in `managed/` that pointed to skills from that repo are removed

#### Scenario: Skill removed from dependency list
- **WHEN** a dependency changes from `skills: "*"` to `skills: [only-this-one]`
- **THEN** symlinks for all other skills from that repo are removed from `managed/`

#### Scenario: Prune across all agents
- **WHEN** stale symlinks exist in multiple agent directories
- **THEN** the tool prunes stale symlinks from all configured agents' `managed/` directories

#### Scenario: Only managed symlinks are pruned
- **WHEN** `managed/` contains symlinks
- **THEN** the tool only removes symlinks whose targets no longer match any resolved dependency, leaving other entries untouched

### Requirement: Windows symlink fallback
On Windows, the tool SHALL fall back to directory junctions if symlink creation fails.

#### Scenario: Symlink fails on Windows
- **WHEN** `os.Symlink` fails on Windows (e.g., Developer Mode not enabled)
- **THEN** the tool attempts to create a directory junction using `mklink /J`

#### Scenario: Junction also fails
- **WHEN** both symlink and directory junction creation fail on Windows
- **THEN** the tool prints a clear error explaining how to enable Developer Mode and exits with a non-zero status code

### Requirement: Idempotent symlink creation
The tool SHALL handle the case where a symlink already exists and points to the correct target.

#### Scenario: Symlink already correct
- **WHEN** a symlink at the expected path already points to the correct cached skill directory
- **THEN** the tool leaves it as-is without error

#### Scenario: Symlink points to wrong target
- **WHEN** a symlink exists but points to a different target (e.g., ref changed)
- **THEN** the tool removes the old symlink and creates a new one pointing to the correct target
