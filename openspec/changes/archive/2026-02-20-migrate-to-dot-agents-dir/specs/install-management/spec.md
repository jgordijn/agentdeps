## MODIFIED Requirements

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
