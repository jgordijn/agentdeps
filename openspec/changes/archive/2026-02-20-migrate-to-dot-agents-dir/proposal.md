## Why

Both Pi and OpenCode now support the `.agents/` directory convention for project-scope skills and subagents in addition to their own directories (`.pi/` and `.opencode/`). Since `.agents/` is the emerging universal standard, agentdeps should switch to installing there for Pi and OpenCode. Users who already have skills installed at the old paths (`.pi/skills/_agentdeps_managed/`, `.opencode/skills/_agentdeps_managed/`) need those cleaned up to avoid duplicates.

## What Changes

- Pi project paths change from `.pi/skills` / `.pi/agents` to `.agents/skills` / `.agents/agents` — Pi becomes a universal agent (Pi still supports `.pi/` but `.agents/` is now preferred)
- OpenCode project paths change from `.opencode/skills` / `.opencode/agents` to `.agents/skills` / `.agents/agents` — OpenCode becomes a universal agent (OpenCode still supports `.opencode/` but `.agents/` is now preferred)
- During `install`, agentdeps detects and cleans up legacy managed directories (`.pi/skills/_agentdeps_managed/`, `.pi/agents/_agentdeps_managed/`, `.opencode/skills/_agentdeps_managed/`, `.opencode/agents/_agentdeps_managed/`) for agents that have migrated to `.agents/`
- Skills and subagents are installed to `.agents/skills/_agentdeps_managed/` and `.agents/agents/_agentdeps_managed/` for both Pi and OpenCode at project scope
- Global paths for Pi and OpenCode remain unchanged

## Capabilities

### New Capabilities

- `legacy-path-migration`: During install, detect and remove managed directories at old project paths (`.pi/skills/_agentdeps_managed/`, `.pi/agents/_agentdeps_managed/`, `.opencode/skills/_agentdeps_managed/`, `.opencode/agents/_agentdeps_managed/`) for agents that have migrated to the `.agents/` convention

### Modified Capabilities

- `agent-registry`: Pi and OpenCode switch from non-universal to universal, using `.agents/skills` and `.agents/agents` for project scope
- `install-management`: Pi and OpenCode install scenarios change to use `.agents/` project paths instead of `.pi/` and `.opencode/`

## Impact

- **`src/registry/registry.ts`**: Pi and OpenCode entries change `projectSkills`/`projectAgents` to the universal constants; `isUniversal` becomes `true`
- **`src/commands/install.ts`** or **`src/install/managed.ts`**: New migration step to clean up legacy managed dirs before installing to new paths
- **`openspec/specs/agent-registry/spec.md`**: Scenarios for Pi and OpenCode paths update
- **`openspec/specs/install-management/spec.md`**: Install scenarios for Pi and OpenCode update
- **Tests**: New tests for legacy path migration; updated tests for Pi/OpenCode path changes
- **`src/setup/setup.ts`**: Pi and OpenCode now appear in the Universal group in the interactive setup
