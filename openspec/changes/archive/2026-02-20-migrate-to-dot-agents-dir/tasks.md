## 1. Registry Changes

- [x] 1.1 In `src/registry/registry.ts`, change the Pi agent entry to use `UNIVERSAL_PROJECT_SKILLS` / `UNIVERSAL_PROJECT_AGENTS` and set `isUniversal: true`
- [x] 1.2 In `src/registry/registry.ts`, change the OpenCode agent entry to use `UNIVERSAL_PROJECT_SKILLS` / `UNIVERSAL_PROJECT_AGENTS` and set `isUniversal: true`
- [x] 1.3 Add a `legacyProjectPaths` optional field to the `Agent` interface with `{ skills: string; agents: string }` shape
- [x] 1.4 Set `legacyProjectPaths` on Pi (`{ skills: ".pi/skills", agents: ".pi/agents" }`) and OpenCode (`{ skills: ".opencode/skills", agents: ".opencode/agents" }`)
- [x] 1.5 Add a `getLegacyProjectPaths(agentNames)` export function that returns all legacy paths for the given configured agents
- [x] 1.6 Update `src/registry/registry.test.ts` — verify Pi and OpenCode now return universal project paths and correct legacy paths

## 2. Legacy Path Migration

- [x] 2.1 Create `src/install/migration.ts` with a `cleanupLegacyManagedDirs(agentNames: string[])` function that removes `_agentdeps_managed/` directories at legacy project paths for the given agents
- [x] 2.2 The function should silently skip paths that don't exist (no errors, no warnings)
- [x] 2.3 The function should only remove `_agentdeps_managed/` subdirectories, never parent directories
- [x] 2.4 Create `src/install/migration.test.ts` with tests covering: Pi legacy dirs removed, OpenCode legacy dirs removed, non-existent dirs skipped, parent dirs untouched, unconfigured agents not touched

## 3. Install Command Integration

- [x] 3.1 In `src/commands/install.ts`, call `cleanupLegacyManagedDirs(config.agents)` in `runInstall()` before processing dependencies
- [x] 3.2 Update `src/integration.test.ts` to verify that legacy managed dirs are cleaned up and skills are installed to `.agents/` for Pi and OpenCode

## 4. Spec and Doc Updates

- [x] 4.1 Update `openspec/specs/agent-registry/spec.md` — Pi and OpenCode scenarios reflect `.agents/` project paths; universal agents group includes Pi and OpenCode
- [x] 4.2 Update `openspec/specs/install-management/spec.md` — Pi and OpenCode install scenarios use `.agents/` paths
- [x] 4.3 Update `README.md` if it references Pi or OpenCode project paths
