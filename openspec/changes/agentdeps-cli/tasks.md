## 1. Project Setup

- [ ] 1.1 Initialize Go module (`go mod init github.com/<org>/agentdeps`)
- [ ] 1.2 Add dependencies: `spf13/cobra`, `gopkg.in/yaml.v3`, `charmbracelet/huh`
- [ ] 1.3 Create directory structure: `cmd/`, `internal/config/`, `internal/registry/`, `internal/cache/`, `internal/discovery/`, `internal/symlink/`
- [ ] 1.4 Create `main.go` entry point that invokes the root cobra command
- [ ] 1.5 Set up GoReleaser config (`.goreleaser.yaml`) for cross-platform builds (linux/darwin/windows, amd64/arm64)

## 2. Agent Registry

- [ ] 2.1 Create `internal/registry/registry.go` with the `Agent` struct (name, display name, project skill path, global skill path, is-universal flag)
- [ ] 2.2 Populate the registry with all supported agents (pi, opencode, claude-code, cursor, codex, amp, gemini-cli, github-copilot, roo, cline, windsurf, and others from Vercel's list)
- [ ] 2.3 Implement `GetAgent(name)`, `AllAgents()`, `UniversalAgents()`, `NonUniversalAgents()` functions
- [ ] 2.4 Implement project path deduplication for universal agents (multiple universal agents share `.agents/skills/`)
- [ ] 2.5 Add validation function that checks agent names against the registry

## 3. Config Management

- [ ] 3.1 Create `internal/config/global.go` with the `GlobalConfig` struct (`CloneMethod string`, `Agents []string`) and YAML marshaling
- [ ] 3.2 Implement `LoadGlobalConfig()` that reads from `os.UserConfigDir()/agentdeps/config.yaml`
- [ ] 3.3 Implement `SaveGlobalConfig()` that writes to the same path, creating parent directories
- [ ] 3.4 Implement `GlobalConfigExists()` check
- [ ] 3.5 Create `internal/config/project.go` with the `ProjectConfig` struct (`Dependencies []Dependency`) where `Dependency` has `Repo string`, `Ref string` (default "main"), `Skills interface{}` (string "*" or []string)
- [ ] 3.6 Implement `LoadProjectConfig(path)` that reads and validates `agents.yaml`
- [ ] 3.7 Implement `SaveProjectConfig(path)` for writing back (used by `add`/`remove`)
- [ ] 3.8 Implement validation: error on missing `repo`, warning on empty `dependencies`, default `ref` to "main", default `skills` to "*"

## 4. Interactive Setup

- [ ] 4.1 Create `internal/setup/setup.go` with the interactive setup function
- [ ] 4.2 Implement clone method selection using `huh.NewSelect` (SSH / HTTPS)
- [ ] 4.3 Implement agent multi-select using `huh.NewMultiSelect` with grouped options (Universal vs Other agents), showing paths like "Pi (.pi/skills)"
- [ ] 4.4 Add validation requiring at least one agent selected
- [ ] 4.5 Implement pre-population of current values when re-running via `agentdeps config`
- [ ] 4.6 Add TTY detection — if not interactive, print error suggesting `agentdeps config`

## 5. Repo URL Resolution

- [ ] 5.1 Create `internal/cache/url.go` with URL resolution functions
- [ ] 5.2 Implement shorthand detection (`owner/repo` pattern — no protocol prefix, no `@`, contains exactly one `/`)
- [ ] 5.3 Implement shorthand expansion: SSH → `git@github.com:owner/repo.git`, HTTPS → `https://github.com/owner/repo.git`
- [ ] 5.4 Implement full URL passthrough (if URL contains `://` or starts with `git@`, use as-is)
- [ ] 5.5 Implement cache key derivation: extract `owner/repo` from any URL format, strip `.git`, replace `/` with `-`, append `-<ref>`

## 6. Repository Cache

- [ ] 6.1 Create `internal/cache/cache.go` with cache management functions
- [ ] 6.2 Implement `CacheDir()` returning `os.UserCacheDir()/agentdeps/repos/`
- [ ] 6.3 Implement `CloneRepo(url, ref, cacheKey)` — runs `git clone --branch <ref> --single-branch <url> <path>`
- [ ] 6.4 Implement `UpdateRepo(path, ref)` — runs `git fetch origin` then `git checkout origin/<ref>` (branch) or `git checkout <ref>` (tag/SHA)
- [ ] 6.5 Implement `EnsureRepo(url, ref, cacheKey)` — clone if missing, update if exists; return the cache path
- [ ] 6.6 Handle clone/pull failures gracefully: print git stderr as warning, continue with remaining deps
- [ ] 6.7 Add `git` prerequisite check function (`exec.LookPath("git")`)

## 7. Skill Discovery

- [ ] 7.1 Create `internal/discovery/discovery.go` with skill discovery functions
- [ ] 7.2 Implement `DiscoverSkills(repoPath)` — scan `<repoPath>/skills/` for subdirectories containing `SKILL.md`, return list of skill names
- [ ] 7.3 Implement `FilterSkills(discovered, selection)` — if selection is `"*"` return all, otherwise filter to matching names
- [ ] 7.4 Warn on missing `skills/` directory, empty directory, or requested skills not found in repo

## 8. Symlink Management

- [ ] 8.1 Create `internal/symlink/symlink.go` with symlink operations
- [ ] 8.2 Implement `CreateSymlink(target, linkPath)` — create symlink, with Windows fallback to `mklink /J` directory junction
- [ ] 8.3 Implement `EnsureSymlink(target, linkPath)` — idempotent: skip if correct, replace if wrong target, create if missing
- [ ] 8.4 Implement `SyncManagedDir(managedDir, desiredSkills)` where `desiredSkills` is a map of `skillName → targetPath`:
  - Create `managedDir` if it doesn't exist
  - Create/update symlinks for all desired skills
  - Remove symlinks not in the desired set (pruning)
- [ ] 8.5 Implement path resolution for project scope (relative to cwd) and global scope (absolute home-based paths)

## 9. Install Command

- [ ] 9.1 Create `cmd/install.go` with the `install` cobra command
- [ ] 9.2 Implement the install orchestration flow:
  1. Check git prerequisite
  2. Load global config (trigger setup if missing)
  3. Resolve configured agents to their project/global paths (with universal deduplication)
  4. Process global `agents.yaml` → cache repos → discover skills → sync global `managed/` dirs
  5. Process project `agents.yaml` (if exists) → cache repos → discover skills → sync project `managed/` dirs
  6. Print summary of actions (skills added, removed, unchanged)
- [ ] 9.3 Handle "no project agents.yaml" case — print info message, still process global deps

## 10. Add Command

- [ ] 10.1 Create `cmd/add.go` with the `add` cobra command accepting `<repo>` argument
- [ ] 10.2 Add `--skill` flag (repeatable) and `--all` flag for non-interactive skill selection
- [ ] 10.3 Add `--ref` flag (default "main") for specifying the git ref
- [ ] 10.4 Implement: check if repo already exists in `agents.yaml` → error if so
- [ ] 10.5 Implement: clone repo to cache, discover skills
- [ ] 10.6 Implement interactive skill picker using `huh.NewMultiSelect` (if no `--skill` or `--all` flags)
- [ ] 10.7 Append dependency to `agents.yaml` (create file if it doesn't exist) and run install

## 11. Remove Command

- [ ] 11.1 Create `cmd/remove.go` with the `remove` cobra command accepting `<repo>` argument
- [ ] 11.2 Implement: find matching dependency in `agents.yaml` → error if not found
- [ ] 11.3 Remove the dependency from `agents.yaml` and save
- [ ] 11.4 Run install (which will prune the now-unreferenced symlinks)

## 12. List Command

- [ ] 12.1 Create `cmd/list.go` with the `list` cobra command
- [ ] 12.2 Load both global and project `agents.yaml`
- [ ] 12.3 For each dependency, show: repo, ref, installed skills, target agents
- [ ] 12.4 Handle "no dependencies" case with helpful message

## 13. Config Command

- [ ] 13.1 Create `cmd/config.go` with the `config` cobra command
- [ ] 13.2 Load existing global config (if any) and pass to interactive setup as defaults
- [ ] 13.3 Save updated config

## 14. Root Command and Git Check

- [ ] 14.1 Create `cmd/root.go` with the root cobra command, version flag, and help text
- [ ] 14.2 Add `PersistentPreRunE` on root that checks for `git` in PATH (skip for `config` and `help`)
- [ ] 14.3 Add `PersistentPreRunE` that triggers interactive setup if global config missing (skip for `config` and `help`)

## 15. Testing

- [ ] 15.1 Write unit tests for URL resolution and cache key derivation (`internal/cache/url_test.go`)
- [ ] 15.2 Write unit tests for skill discovery (`internal/discovery/discovery_test.go`) using temp dirs with mock SKILL.md files
- [ ] 15.3 Write unit tests for symlink sync logic (`internal/symlink/symlink_test.go`) — create, prune, idempotency
- [ ] 15.4 Write unit tests for config parsing and validation (`internal/config/project_test.go`, `internal/config/global_test.go`)
- [ ] 15.5 Write unit tests for agent registry lookup and deduplication (`internal/registry/registry_test.go`)
- [ ] 15.6 Write an integration test that exercises the full install flow with a local git repo (clone → discover → symlink → prune)

## 16. Distribution

- [ ] 16.1 Create GitHub Actions workflow for CI (test + build on push)
- [ ] 16.2 Create GitHub Actions workflow for release (GoReleaser on tag push)
- [ ] 16.3 Create install script (`install.sh`) for curl-pipe-sh installation
- [ ] 16.4 Write README with usage examples, `agents.yaml` format, and installation instructions
