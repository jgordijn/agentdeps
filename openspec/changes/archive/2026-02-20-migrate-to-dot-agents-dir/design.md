## Context

agentdeps maintains a built-in registry of coding agents, each with project-scope and global-scope paths for skills and subagents. Pi currently uses `.pi/skills` / `.pi/agents` and OpenCode uses `.opencode/skills` / `.opencode/agents` at project scope. Both are marked as non-universal agents.

Both Pi and OpenCode now support the `.agents/` directory convention alongside their existing directories. Other agents like Codex, Amp, Gemini CLI, and GitHub Copilot already use `.agents/` and are marked as universal in the registry.

Users who upgrade agentdeps will have stale `_agentdeps_managed/` directories at the old paths that need to be cleaned up.

## Goals / Non-Goals

**Goals:**

- Switch Pi and OpenCode to use `.agents/skills` and `.agents/agents` for project scope
- Automatically clean up legacy managed directories at old paths during install
- Keep global paths unchanged (Pi: `~/.pi/agent/skills`, OpenCode: `~/.config/opencode/skills`)

**Non-Goals:**

- Removing user-created (non-managed) content from `.pi/skills/` or `.opencode/skills/`
- Changing any other agent's paths
- Adding a user-facing migration command — cleanup happens transparently during `install`

## Decisions

### 1. Make Pi and OpenCode universal agents

**Decision**: Change both entries in `BUILT_IN_AGENTS` to use `UNIVERSAL_PROJECT_SKILLS` / `UNIVERSAL_PROJECT_AGENTS` and set `isUniversal: true`.

**Rationale**: Both now support `.agents/`, which is the universal convention. This aligns them with Codex, Amp, etc. and avoids installing the same skills to multiple project directories.

**Alternative considered**: Keep Pi/OpenCode non-universal but point to `.agents/` — rejected because the universal grouping and deduplication logic already handles this correctly.

### 2. Define legacy paths as a static map in the registry

**Decision**: Add a `legacyProjectPaths` field to agents that have migrated, mapping the old project skill/agent paths. This lives in `registry.ts` alongside the agent definitions.

**Rationale**: The registry already owns path knowledge. Keeping legacy paths co-located makes the migration logic self-contained and easy to remove later.

**Alternative considered**: Hardcode legacy paths in the install command — rejected because it scatters path knowledge across modules.

### 3. Run migration before install in the install command

**Decision**: Add a migration step in `runInstall()` (in `commands/install.ts`) that runs before the main install flow. It iterates configured agents, checks for legacy managed directories, and removes them.

**Rationale**: The install command already orchestrates the full flow. Adding migration as a pre-step keeps it simple and ensures cleanup happens before new installs. This avoids a separate command the user has to remember.

**Alternative considered**: Migration in `syncManagedDir` — rejected because managed.ts shouldn't need to know about legacy paths; it's a one-time concern, not ongoing sync logic.

### 4. Only remove `_agentdeps_managed/` subdirectories

**Decision**: The migration only removes `_agentdeps_managed/` directories under the old paths, never the parent directories (e.g., `.pi/skills/` itself).

**Rationale**: Users may have their own non-managed content in `.pi/skills/`. We must not touch anything outside what agentdeps owns.

## Risks / Trade-offs

- **[Risk] User has custom content in `_agentdeps_managed/`** → Unlikely since the directory is documented as fully managed. Migration removes it entirely, which is correct.
- **[Risk] Legacy paths grow over time as more agents migrate** → The static map is easy to maintain and can be removed once migration is no longer needed.
- **[Trade-off] Migration runs on every install** → The check is fast (just `readdir` attempts on a few paths). Could be optimized with a "migrated" flag later, but not worth the complexity now.
