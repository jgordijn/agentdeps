## 1. Project Setup

- [ ] 1.1 Initialize Bun project (`bun init`), set `name: "agentdeps"` in `package.json`, configure `bin` field for CLI entry point
- [ ] 1.2 Add dependencies: `commander`, `@clack/prompts`, `yaml`
- [ ] 1.3 Create directory structure: `src/`, `src/commands/`, `src/config/`, `src/registry/`, `src/cache/`, `src/discovery/`, `src/install/`, `src/setup/`
- [ ] 1.4 Create `src/index.ts` entry point with shebang (`#!/usr/bin/env node`) that invokes the root commander program
- [ ] 1.5 Configure `tsconfig.json` for Bun with strict mode
- [ ] 1.6 Add build script to `package.json` that bundles to a single JS file for npm distribution
- [ ] 1.7 Configure `package.json` for npm publishing (name, version, description, keywords, license, repository, files, bin)

## 2. Agent Registry

- [ ] 2.1 Create `src/registry/registry.ts` with the `Agent` interface (name, displayName, projectSkills, projectAgents, globalSkills, globalAgents, isUniversal)
- [ ] 2.2 Populate the built-in registry with all supported agents (pi, opencode, claude-code, cursor, codex, amp, gemini-cli, github-copilot, roo, cline, windsurf, kimi-cli) including both skills and agents paths
- [ ] 2.3 Implement `getAgent(name)`, `allAgents()`, `universalAgents()`, `nonUniversalAgents()` functions
- [ ] 2.4 Implement project path deduplication for universal agents (multiple universal agents share `.agents/skills/` and `.agents/agents/`)
- [ ] 2.5 Add validation function that checks agent names against the registry
- [ ] 2.6 Implement `mergeCustomAgents(builtIn, customAgents)` that overlays user-defined custom agents onto the built-in registry, with custom definitions taking precedence on name collision

## 3. Config Management

- [ ] 3.1 Create `src/config/global.ts` with the `GlobalConfig` type (`cloneMethod`, `agents`, `installMethod`, `customAgents`) and YAML serialization
- [ ] 3.2 Implement `loadGlobalConfig()` that reads from the platform-appropriate config dir (`~/.config` on Linux, `~/Library/Application Support` on macOS, `%APPDATA%` on Windows)
- [ ] 3.3 Implement `saveGlobalConfig()` that writes to the same path, creating parent directories
- [ ] 3.4 Implement `globalConfigExists()` check
- [ ] 3.5 Implement `globalAgentsYamlPath()` for the global `agents.yaml` location
- [ ] 3.6 Create `src/config/project.ts` with the `ProjectConfig` type (`dependencies: Dependency[]`) where `Dependency` has `repo: string`, `ref?: string` (default `"main"`), `skills?: "*" | string[] | false` (default `"*"`), `agents?: "*" | string[] | false` (default `"*"`)
- [ ] 3.7 Implement `loadProjectConfig(path)` that reads and validates `agents.yaml`
- [ ] 3.8 Implement `saveProjectConfig(path, config)` for writing back (used by `add`/`remove`)
- [ ] 3.9 Implement validation: error on missing `repo`, warning on empty `dependencies`, apply defaults for `ref`, `skills`, `agents`

## 4. Interactive Setup

- [ ] 4.1 Create `src/setup/setup.ts` with the interactive setup function using `@clack/prompts`
- [ ] 4.2 Implement clone method selection (SSH / HTTPS)
- [ ] 4.3 Implement agent multi-select with grouped options (Universal vs Other agents), showing paths like "Pi (.pi/skills, .pi/agents)"
- [ ] 4.4 Implement install method selection (Link / Copy)
- [ ] 4.5 Add validation requiring at least one agent selected
- [ ] 4.6 Implement pre-population of current values when re-running via `agentdeps config`
- [ ] 4.7 Include any user-defined custom agents in the selection list when re-running config
- [ ] 4.8 Add TTY detection — if not interactive, print error suggesting `agentdeps config`

## 5. Repo URL Resolution

- [ ] 5.1 Create `src/cache/url.ts` with URL resolution functions
- [ ] 5.2 Implement shorthand detection (`owner/repo` pattern — no protocol prefix, no `@`, contains exactly one `/`)
- [ ] 5.3 Implement shorthand expansion: SSH → `git@github.com:owner/repo.git`, HTTPS → `https://github.com/owner/repo.git`
- [ ] 5.4 Implement full URL passthrough (if URL contains `://` or starts with `git@`, use as-is)
- [ ] 5.5 Implement cache key derivation: extract `owner/repo` from any URL format, strip `.git`, replace `/` with `-`, append `-<ref>`

## 6. Repository Cache

- [ ] 6.1 Create `src/cache/cache.ts` with cache management functions
- [ ] 6.2 Implement `getCacheDir()` returning the platform-appropriate cache directory under `agentdeps/repos/`
- [ ] 6.3 Implement `cloneRepo(url, ref, cacheKey)` — spawns `git clone --branch <ref> --single-branch <url> <path>`
- [ ] 6.4 Implement `updateRepo(repoPath, ref)` — spawns `git fetch origin` then `git checkout origin/<ref>` (branch) or `git checkout <ref>` (tag/SHA)
- [ ] 6.5 Implement `ensureRepo(url, ref, cacheKey)` — clone if missing, update if exists; return the cache path
- [ ] 6.6 Handle clone/pull failures gracefully: print git stderr as warning, continue with remaining deps
- [ ] 6.7 Implement `checkGitAvailable()` that verifies `git` is in PATH

## 7. Discovery

- [ ] 7.1 Create `src/discovery/discovery.ts` with discovery functions
- [ ] 7.2 Implement `discoverSkills(repoPath)` — scan `<repoPath>/skills/` for subdirectories containing `SKILL.md`, return list of skill names
- [ ] 7.3 Implement `discoverAgents(repoPath)` — scan `<repoPath>/agents/` for subdirectories, return list of subagent names
- [ ] 7.4 Implement `filterItems(discovered, selection)` — if `"*"` return all, if `false` return empty, otherwise filter to matching names and report missing
- [ ] 7.5 Warn on missing directories or requested items not found in repo (but not when selection is `false`)

## 8. Install Management

- [ ] 8.1 Create `src/install/link.ts` with symlink operations
- [ ] 8.2 Implement `createSymlink(target, linkPath)` — create symlink, with Windows fallback to `mklink /J` directory junction
- [ ] 8.3 Implement `ensureSymlink(target, linkPath)` — idempotent: skip if correct, replace if wrong target, create if missing
- [ ] 8.4 Create `src/install/copy.ts` with smart copy sync operations
- [ ] 8.5 Implement `smartSync(sourceDir, destDir)` — recursively sync: add new files, overwrite changed files, remove files/directories that no longer exist in source
- [ ] 8.6 Create `src/install/managed.ts` with managed directory operations (shared by both link and copy)
- [ ] 8.7 Implement `syncManagedDir(managedDir, desiredItems, installMethod)` where `desiredItems` is a map of `name → sourcePath`:
  - Create `managedDir` if it doesn't exist
  - Install (link or copy) all desired items
  - Remove items not in the desired set (pruning)
- [ ] 8.8 Implement `expandHomePath(path)` for resolving `~` in global paths

## 9. Install Command

- [ ] 9.1 Create `src/commands/install.ts` with the `install` command
- [ ] 9.2 Implement the install orchestration flow:
  1. Check git prerequisite
  2. Load global config (trigger setup if missing)
  3. Merge custom agents into registry
  4. Resolve configured agents to their project/global paths (with deduplication)
  5. Process global `agents.yaml` → cache repos → discover skills and agents → sync global `managed/` dirs
  6. Process project `agents.yaml` (if exists) → cache repos → discover skills and agents → sync project `managed/` dirs
  7. Print summary of actions (items added, removed, unchanged)
- [ ] 9.3 Handle "no project agents.yaml" case — print info message, still process global deps

## 10. Add Command

- [ ] 10.1 Create `src/commands/add.ts` with the `add` command accepting `<repo>` argument
- [ ] 10.2 Add `--skill` option (repeatable), `--agent` option (repeatable), `--all` flag, `--all-skills` flag, `--all-agents` flag, `--no-skills` flag, `--no-agents` flag
- [ ] 10.3 Add `--ref` option (default `"main"`) for specifying the git ref
- [ ] 10.4 Implement: check if repo already exists in `agents.yaml` → error if so
- [ ] 10.5 Implement: clone repo to cache, discover skills and agents
- [ ] 10.6 Implement interactive picker using `@clack/prompts` multi-select for both skills and agents (if no explicit flags)
- [ ] 10.7 Append dependency to `agents.yaml` (create file if it doesn't exist) and run install

## 11. Remove Command

- [ ] 11.1 Create `src/commands/remove.ts` with the `remove` command accepting `<repo>` argument
- [ ] 11.2 Implement: find matching dependency in `agents.yaml` → error if not found
- [ ] 11.3 Remove the dependency from `agents.yaml` and save
- [ ] 11.4 Run install (which will prune the now-unreferenced items)

## 12. List Command

- [ ] 12.1 Create `src/commands/list.ts` with the `list` command
- [ ] 12.2 Load both global and project `agents.yaml`
- [ ] 12.3 For each dependency, show: repo, ref, installed skills, installed agents, target coding agents
- [ ] 12.4 Handle "no dependencies" case with helpful message

## 13. Config Command

- [ ] 13.1 Create `src/commands/config.ts` with the `config` command
- [ ] 13.2 Load existing global config (if any) and pass to interactive setup as defaults
- [ ] 13.3 Save updated config (preserving `custom_agents` section if present)

## 14. Root Command and Startup

- [ ] 14.1 Create `src/commands/root.ts` with the commander program, version, and help text
- [ ] 14.2 Add pre-action hook that checks for `git` in PATH (skip for `config` and `help`)
- [ ] 14.3 Add pre-action hook that triggers interactive setup if global config missing (skip for `config` and `help`)

## 15. Testing

- [ ] 15.1 Write unit tests for URL resolution and cache key derivation (`src/cache/url.test.ts`)
- [ ] 15.2 Write unit tests for discovery (`src/discovery/discovery.test.ts`) using temp dirs with mock SKILL.md files and agent dirs
- [ ] 15.3 Write unit tests for symlink operations (`src/install/link.test.ts`) — create, idempotency, replace
- [ ] 15.4 Write unit tests for smart copy sync (`src/install/copy.test.ts`) — add, update, delete files and directories
- [ ] 15.5 Write unit tests for managed dir sync (`src/install/managed.test.ts`) — install, prune, idempotency, both link and copy modes
- [ ] 15.6 Write unit tests for config parsing and validation (`src/config/project.test.ts`, `src/config/global.test.ts`)
- [ ] 15.7 Write unit tests for agent registry including custom agent merge (`src/registry/registry.test.ts`)
- [ ] 15.8 Write an integration test that exercises the full install flow with a local git repo (clone → discover skills + agents → install → prune)

## 16. Distribution

- [ ] 16.1 Create GitHub Actions workflow for CI (test + build on push)
- [ ] 16.2 Create GitHub Actions workflow for npm publish on tag push
- [ ] 16.3 Write README with usage examples, `agents.yaml` format, `config.yaml` format, and installation instructions (`npx` and `npm install -g`)
