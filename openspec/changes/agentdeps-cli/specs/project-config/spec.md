## ADDED Requirements

### Requirement: Project agents.yaml defines dependencies
The project-level `agents.yaml` file SHALL declare skill dependencies with repository, ref, and skill selection.

#### Scenario: Minimal dependency declaration
- **WHEN** `agents.yaml` contains a dependency with only `repo` specified
- **THEN** the tool uses `main` as the default ref and `"*"` (all skills) as the default skill selection

#### Scenario: Full dependency declaration
- **WHEN** `agents.yaml` contains a dependency with `repo`, `ref`, and a list of skill names
- **THEN** the tool clones/pulls that specific ref and installs only the listed skills

#### Scenario: Wildcard skill selection
- **WHEN** a dependency has `skills: "*"`
- **THEN** the tool installs all discovered skills from that repository

### Requirement: agents.yaml supports shorthand and full URLs
The `repo` field in `agents.yaml` SHALL accept both shorthand (`owner/repo`) and full git URLs.

#### Scenario: Shorthand repo reference
- **WHEN** `agents.yaml` has `repo: my-org/my-skills`
- **THEN** the tool expands it to a full URL using the clone method from global config (SSH or HTTPS) and assumes GitHub as the host

#### Scenario: Full SSH URL
- **WHEN** `agents.yaml` has `repo: git@github.com:my-org/my-skills.git`
- **THEN** the tool uses the URL as-is, ignoring the global clone method setting

#### Scenario: Full HTTPS URL
- **WHEN** `agents.yaml` has `repo: https://github.com/my-org/my-skills.git`
- **THEN** the tool uses the URL as-is, ignoring the global clone method setting

### Requirement: agents.yaml ref supports branches, tags, and SHAs
The `ref` field SHALL accept git branches, tags, and commit SHAs.

#### Scenario: Branch ref
- **WHEN** a dependency has `ref: develop`
- **THEN** the tool checks out the latest commit on that branch

#### Scenario: Tag ref
- **WHEN** a dependency has `ref: v1.2.0`
- **THEN** the tool checks out that exact tag

#### Scenario: Commit SHA ref
- **WHEN** a dependency has `ref: abc123def456`
- **THEN** the tool checks out that exact commit

### Requirement: agents.yaml validation
The tool SHALL validate `agents.yaml` and report clear errors for invalid configurations.

#### Scenario: Missing repo field
- **WHEN** a dependency entry in `agents.yaml` has no `repo` field
- **THEN** the tool prints an error identifying the invalid dependency entry

#### Scenario: Invalid skill name in list
- **WHEN** a dependency lists a skill name that does not exist in the repository
- **THEN** the tool prints a warning listing the skills that were not found, and installs the remaining valid skills

#### Scenario: Empty dependencies list
- **WHEN** `agents.yaml` has an empty `dependencies` list
- **THEN** the tool treats it as having no project dependencies and proceeds with pruning only
