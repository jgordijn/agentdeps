## 1. Project Setup

- [x] 1.1 Initialize Bun project (`bun init`), set `name: "agentdeps"` in `package.json`, configure `bin` field for CLI entry point
- [x] 1.2 Add dependencies: `commander`, `@clack/prompts`, `yaml`
- [x] 1.3 Create directory structure: `src/`, `src/commands/`, `src/config/`, `src/registry/`, `src/cache/`, `src/discovery/`, `src/install/`, `src/setup/`
- [x] 1.4 Create `src/index.ts` entry point with shebang (`#!/usr/bin/env node`) that invokes the root commander program
- [x] 1.5 Configure `tsconfig.json` for Bun with strict mode
- [x] 1.6 Add build script to `package.json` that bundles to a single JS file for npm distribution
- [x] 1.7 Configure `package.json` for npm publishing (name, version, description, keywords, license, repository, files, bin)

## 2. Agent Registry

- [x] 2.1 Create `src/registry/registry.ts` with the `Agent` interface (name, displayName, projectSkills, projectAgents, globalSkills, globalAgents, isUniversal)
- [x] 2.2 Populate the built-in registry with all supported agents (pi, opencode, claude-code, cursor, codex, amp, gemini-cli, github-copilot, roo, cline, windsurf, kimi-cli) including both skills and agents paths
- [x] 2.3 Implement `getAgent(name)`, `allAgents()`, `universalAgents()`, `nonUniversalAgents()` functions
- [x] 2.4 Implement project path deduplication for universal agents (multiple universal agents share `.agents/skills/` and `.agents/agents/`)
- [x] 2.5 Add validation function that checks agent names against the registry
- [x] 2.6 Implement `mergeCustomAgents(builtIn, customAgents)` that overlays user-defined custom agents onto the built-in registry, with custom definitions taking precedence on name collision

## 3. Config Management

- [x] 3.1 Create `src/config/global.ts` with the `GlobalConfig` type (`cloneMethod`, `agents`, `installMethod`, `customAgents`) and YAML serialization
- [x] 3.2 Implement `loadGlobalConfig()` that reads from the platform-appropriate config dir (`~/.config` on Linux, `~/Library/Application Support` on macOS, `%APPDATA%` on Windows)
- [x] 3.3 Implement `saveGlobalConfig()` that writes to the same path, creating parent directories
- [x] 3.4 Implement `globalConfigExists()` check
- [x] 3.5 Implement `globalAgentsYamlPath()` for the global `agents.yaml` location
- [x] 3.6 Create `src/config/project.ts` with the `ProjectConfig` type (`dependencies: Dependency[]`) where `Dependency` has `repo: string`, `ref?: string` (default `"main"`), `skills?: "*" | string[] | false` (default `"*"`), `agents?: "*" | string[] | false` (default `"*"`)
- [x] 3.7 Implement `loadProjectConfig(path)` that reads and validates `agents.yaml`
- [x] 3.8 Implement `saveProjectConfig(path, config)` for writing back (used by `add`/`remove`)
- [x] 3.9 Implement validation: error on missing `repo`, warning on empty `dependencies`, apply defaults for `ref`, `skills`, `agents`

## 4. Interactive Setup

- [x] 4.1 Create `src/setup/setup.ts` with the interactive setup function using `@clack/prompts`
- [x] 4.2 Implement clone method selection (SSH / HTTPS)
- [x] 4.3 Implement agent multi-select with grouped options (Universal vs Other agents), showing paths like "Pi (.pi/skills, .pi/agents)"
- [x] 4.4 Implement install method selection (Link / Copy)
- [x] 4.5 Add validation requiring at least one agent selected
- [x] 4.6 Implement pre-population of current values when re-running via `agentdeps config`
- [x] 4.7 Include any user-defined custom agents in the selection list when re-running config
- [x] 4.8 Add TTY detection — if not interactive, print error suggesting `agentdeps config`

## 5. Repo URL Resolution

- [x] 5.1 Create `src/cache/url.ts` with URL resolution functions
- [x] 5.2 Implement shorthand detection (`owner/repo` pattern — no protocol prefix, no `@`, contains exactly one `/`)
- [x] 5.3 Implement shorthand expansion: SSH → `git@github.com:owner/repo.git`, HTTPS → `https://github.com/owner/repo.git`
- [x] 5.4 Implement full URL passthrough (if URL contains `://` or starts with `git@`, use as-is)
- [x] 5.5 Implement cache key derivation: extract `owner/repo` from any URL format, strip `.git`, replace `/` with `-`, append `-<ref>`

## 6. Repository Cache

- [x] 6.1 Create `src/cache/cache.ts` with cache management functions
- [x] 6.2 Implement `getCacheDir()` returning the platform-appropriate cache directory under `agentdeps/repos/`
- [x] 6.3 Implement `cloneRepo(url, ref, cacheKey)` — spawns `git clone --branch <ref> --single-branch <url> <path>`
- [x] 6.4 Implement `updateRepo(repoPath, ref)` — spawns `git fetch origin` then `git checkout origin/<ref>` (branch) or `git checkout <ref>` (tag/SHA)
- [x] 6.5 Implement `ensureRepo(url, ref, cacheKey)` — clone if missing, update if exists; return the cache path
- [x] 6.6 Handle clone/pull failures gracefully: print git stderr as warning, continue with remaining deps
- [x] 6.7 Implement `checkGitAvailable()` that verifies `git` is in PATH

## 7. Discovery

- [x] 7.1 Create `src/discovery/discovery.ts` with discovery functions
- [x] 7.2 Implement `discoverSkills(repoPath)` — scan `<repoPath>/skills/` for subdirectories containing `SKILL.md`, return list of skill names
- [x] 7.3 Implement `discoverAgents(repoPath)` — scan `<repoPath>/agents/` for subdirectories, return list of subagent names
- [x] 7.4 Implement `filterItems(discovered, selection)` — if `"*"` return all, if `false` return empty, otherwise filter to matching names and report missing
- [x] 7.5 Warn on missing directories or requested items not found in repo (but not when selection is `false`)

## 8. Install Management

- [x] 8.1 Create `src/install/link.ts` with symlink operations
- [x] 8.2 Implement `createSymlink(target, linkPath)` — create symlink, with Windows fallback to `mklink /J` directory junction
- [x] 8.3 Implement `ensureSymlink(target, linkPath)` — idempotent: skip if correct, replace if wrong target, create if missing
- [x] 8.4 Create `src/install/copy.ts` with smart copy sync operations
- [x] 8.5 Implement `smartSync(sourceDir, destDir)` — recursively sync: add new files, overwrite changed files, remove files/directories that no longer exist in source
- [x] 8.6 Create `src/install/managed.ts` with managed directory operations (shared by both link and copy)
- [x] 8.7 Implement `syncManagedDir(managedDir, desiredItems, installMethod)` where `desiredItems` is a map of `name → sourcePath`:
  - Create `managedDir` if it doesn't exist
  - Install (link or copy) all desired items
  - Remove items not in the desired set (pruning)
- [x] 8.8 Implement `expandHomePath(path)` for resolving `~` in global paths

## 9. Install Command

- [x] 9.1 Create `src/commands/install.ts` with the `install` command
- [x] 9.2 Implement the install orchestration flow:
  1. Check git prerequisite
  2. Load global config (trigger setup if missing)
  3. Merge custom agents into registry
  4. Resolve configured agents to their project/global paths (with deduplication)
  5. Process global `agents.yaml` → cache repos → discover skills and agents → sync global `_agentdeps_managed/` dirs
  6. Process project `agents.yaml` (if exists) → cache repos → discover skills and agents → sync project `_agentdeps_managed/` dirs
  7. Print summary of actions (items added, removed, unchanged)
- [x] 9.3 Handle "no project agents.yaml" case — print info message, still process global deps

## 10. Add Command

- [x] 10.1 Create `src/commands/add.ts` with the `add` command accepting `<repo>` argument
- [x] 10.2 Add `--skill` option (repeatable), `--agent` option (repeatable), `--all` flag, `--all-skills` flag, `--all-agents` flag, `--no-skills` flag, `--no-agents` flag
- [x] 10.3 Add `--ref` option (default `"main"`) for specifying the git ref
- [x] 10.4 Implement: check if repo already exists in `agents.yaml` → error if so
- [x] 10.5 Implement: clone repo to cache, discover skills and agents
- [x] 10.6 Implement interactive picker using `@clack/prompts` multi-select for both skills and agents (if no explicit flags)
- [x] 10.7 Append dependency to `agents.yaml` (create file if it doesn't exist) and run install

## 11. Remove Command

- [x] 11.1 Create `src/commands/remove.ts` with the `remove` command accepting `<repo>` argument
- [x] 11.2 Implement: find matching dependency in `agents.yaml` → error if not found
- [x] 11.3 Remove the dependency from `agents.yaml` and save
- [x] 11.4 Run install (which will prune the now-unreferenced items)

## 12. List Command

- [x] 12.1 Create `src/commands/list.ts` with the `list` command
- [x] 12.2 Load both global and project `agents.yaml`
- [x] 12.3 For each dependency, show: repo, ref, installed skills, installed agents, target coding agents
- [x] 12.4 Handle "no dependencies" case with helpful message

## 13. Config Command

- [x] 13.1 Create `src/commands/config.ts` with the `config` command
- [x] 13.2 Load existing global config (if any) and pass to interactive setup as defaults
- [x] 13.3 Save updated config (preserving `custom_agents` section if present)

## 14. Root Command and Startup

- [x] 14.1 Create `src/commands/root.ts` with the commander program, version, and help text
- [x] 14.2 Add pre-action hook that checks for `git` in PATH (skip for `config` and `help`)
- [x] 14.3 Add pre-action hook that triggers interactive setup if global config missing (skip for `config` and `help`)

## 15. Testing

- [x] 15.1 Write unit tests for URL resolution and cache key derivation (`src/cache/url.test.ts`)
- [x] 15.2 Write unit tests for discovery (`src/discovery/discovery.test.ts`) using temp dirs with mock SKILL.md files and agent dirs
- [x] 15.3 Write unit tests for symlink operations (`src/install/link.test.ts`) — create, idempotency, replace
- [x] 15.4 Write unit tests for smart copy sync (`src/install/copy.test.ts`) — add, update, delete files and directories
- [x] 15.5 Write unit tests for managed dir sync (`src/install/managed.test.ts`) — install, prune, idempotency, both link and copy modes
- [x] 15.6 Write unit tests for config parsing and validation (`src/config/project.test.ts`, `src/config/global.test.ts`)
- [x] 15.7 Write unit tests for agent registry including custom agent merge (`src/registry/registry.test.ts`)
- [x] 15.8 Write an integration test that exercises the full install flow with a local git repo (clone → discover skills + agents → install → prune)

## 16. Distribution

- [x] 16.1 Create GitHub Actions workflow for CI (test + build on push)
- [x] 16.2 Create GitHub Actions workflow for npm publish on tag push
- [x] 16.3 Write README with usage examples, `agents.yaml` format, `config.yaml` format, and installation instructions (`npx` and `npm install -g`)
