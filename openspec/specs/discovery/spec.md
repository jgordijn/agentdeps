## ADDED Requirements

### Requirement: Discover skills in cached repos
The tool SHALL scan the `skills/` top-level directory of a cached repository for skill directories.

#### Scenario: Skills found in skills/ directory
- **WHEN** a cached repo contains `skills/frontend-design/SKILL.md` and `skills/kotlin-conventions/SKILL.md`
- **THEN** the tool discovers two skills: `frontend-design` and `kotlin-conventions`

#### Scenario: No skills directory
- **WHEN** a cached repo does not contain a `skills/` directory
- **THEN** the tool treats the repo as having no skills (no warning if the dependency has `skills: false`)

#### Scenario: No skills directory but skills expected
- **WHEN** a cached repo does not contain a `skills/` directory and the dependency has `skills: "*"` or a list of skill names
- **THEN** the tool prints a warning that no skills were found in the repository

#### Scenario: Empty skills directory
- **WHEN** a cached repo contains a `skills/` directory with no subdirectories containing `SKILL.md`
- **THEN** the tool prints a warning that no skills were found

### Requirement: Discover subagents in cached repos
The tool SHALL scan the `agents/` top-level directory of a cached repository for subagent directories.

#### Scenario: Subagents found in agents/ directory
- **WHEN** a cached repo contains `agents/code-reviewer/` and `agents/deployment-agent/`
- **THEN** the tool discovers two subagents: `code-reviewer` and `deployment-agent`

#### Scenario: No agents directory
- **WHEN** a cached repo does not contain an `agents/` directory
- **THEN** the tool treats the repo as having no subagents (no warning if the dependency has `agents: false`)

#### Scenario: No agents directory but agents expected
- **WHEN** a cached repo does not contain an `agents/` directory and the dependency has `agents: "*"` or a list of agent names
- **THEN** the tool prints a warning that no subagents were found in the repository

### Requirement: Item identity is the directory name
The tool SHALL use the directory name under `skills/` or `agents/` as the item identifier.

#### Scenario: Skill name derivation
- **WHEN** a skill exists at `skills/my-cool-skill/SKILL.md`
- **THEN** the skill name is `my-cool-skill`

#### Scenario: Agent name derivation
- **WHEN** a subagent exists at `agents/code-reviewer/`
- **THEN** the subagent name is `code-reviewer`

#### Scenario: Nested directories without SKILL.md are ignored for skills
- **WHEN** a directory under `skills/` does not contain a `SKILL.md` file
- **THEN** that directory is not treated as a skill

### Requirement: Filter items by selection
The tool SHALL filter discovered items based on the `skills` and `agents` fields in the dependency configuration.

#### Scenario: Wildcard selects all skills
- **WHEN** a dependency has `skills: "*"`
- **THEN** all discovered skills in the repo are included

#### Scenario: Wildcard selects all agents
- **WHEN** a dependency has `agents: "*"`
- **THEN** all discovered subagents in the repo are included

#### Scenario: False disables skills
- **WHEN** a dependency has `skills: false`
- **THEN** no skills from the repo are included, regardless of what exists in `skills/`

#### Scenario: False disables agents
- **WHEN** a dependency has `agents: false`
- **THEN** no subagents from the repo are included, regardless of what exists in `agents/`

#### Scenario: Explicit list filters skills
- **WHEN** a dependency has `skills: [frontend-design, kotlin-conventions]`
- **THEN** only those two skills are included, even if the repo contains more

#### Scenario: Explicit list filters agents
- **WHEN** a dependency has `agents: [code-reviewer]`
- **THEN** only that subagent is included, even if the repo contains more

#### Scenario: Non-existent skill in list
- **WHEN** a dependency lists `skills: [frontend-design, nonexistent-skill]`
- **THEN** `frontend-design` is installed and a warning is printed that `nonexistent-skill` was not found in the repository

#### Scenario: Non-existent agent in list
- **WHEN** a dependency lists `agents: [code-reviewer, nonexistent-agent]`
- **THEN** `code-reviewer` is installed and a warning is printed that `nonexistent-agent` was not found in the repository
