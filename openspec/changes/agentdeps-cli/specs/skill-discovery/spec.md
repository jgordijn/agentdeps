## ADDED Requirements

### Requirement: Discover skills in cached repos
The tool SHALL scan the `skills/` top-level directory of a cached repository for skill directories.

#### Scenario: Skills found in skills/ directory
- **WHEN** a cached repo contains `skills/frontend-design/SKILL.md` and `skills/kotlin-conventions/SKILL.md`
- **THEN** the tool discovers two skills: `frontend-design` and `kotlin-conventions`

#### Scenario: No skills directory
- **WHEN** a cached repo does not contain a `skills/` directory
- **THEN** the tool prints a warning that no skills were found in the repository and skips it

#### Scenario: Empty skills directory
- **WHEN** a cached repo contains a `skills/` directory with no subdirectories containing `SKILL.md`
- **THEN** the tool prints a warning that no skills were found

### Requirement: Skill identity is the directory name
The tool SHALL use the directory name under `skills/` as the skill identifier.

#### Scenario: Skill name derivation
- **WHEN** a skill exists at `skills/my-cool-skill/SKILL.md`
- **THEN** the skill name is `my-cool-skill`

#### Scenario: Nested directories without SKILL.md are ignored
- **WHEN** a directory under `skills/` does not contain a `SKILL.md` file
- **THEN** that directory is not treated as a skill

### Requirement: Filter skills by selection
The tool SHALL filter discovered skills based on the `skills` field in the dependency configuration.

#### Scenario: Wildcard selects all
- **WHEN** a dependency has `skills: "*"`
- **THEN** all discovered skills in the repo are included

#### Scenario: Explicit list filters
- **WHEN** a dependency has `skills: [frontend-design, kotlin-conventions]`
- **THEN** only those two skills are included, even if the repo contains more

#### Scenario: Non-existent skill in list
- **WHEN** a dependency lists `skills: [frontend-design, nonexistent-skill]`
- **THEN** `frontend-design` is installed and a warning is printed that `nonexistent-skill` was not found in the repository
