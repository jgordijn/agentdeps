## Context

There is no existing codebase — this is a greenfield Go CLI tool. The problem space is well-understood: agent skills live in git repositories, and projects need a declarative way to declare, install, update, and prune them across multiple coding agent tools (pi, opencode, claude-code, etc.).

The user has `git` installed (required). The tool shells out to `git` rather than embedding a Go git library, which avoids authentication complexity — SSH keys, credential helpers, and `.gitconfig` all work automatically.

The Vercel `skills` CLI (npm package) is the closest prior art. It handles agent path mapping and skill discovery well, but is imperative (no dependency file) and requires Node.js. This tool takes the declarative, zero-runtime-dependency approach.

## Goals / Non-Goals

**Goals:**

- Declarative dependency management via `agents.yaml` — commit it, and any team member can reproduce the same skill setup
- Global user config (which agents, clone method) so the project file stays agent-agnostic
- Global personal dependencies (`~/.config/agentdeps/agents.yaml`) installed implicitly alongside project deps
- Automatic pruning of skills removed from `agents.yaml`
- Cross-platform (Linux, macOS, Windows)
- Simple CLI: `install`, `add`, `remove`, `list`, `config`
- Fast: shallow clones where possible, git pull for updates

**Non-Goals:**

- No lockfile — `ref` (branch/tag/SHA) in `agents.yaml` is sufficient for pinning
- No skill registry or search — use Vercel's `skills find` or browse GitHub
- No agent config management (only skills in v1)
- No monorepo path filtering — repos must have a top-level `skills/` directory
- No MCP or tool integration — this is purely about file-based skills (SKILL.md)
- No embedded git library — `git` CLI is a hard prerequisite

## Decisions

### 1. Go as implementation language

**Decision:** Go with cross-compilation via GoReleaser.

**Rationale:** Single static binary, no runtime dependency. Users download and run. Alternatives:
- TypeScript/Node — requires Node.js runtime, `npx` is slow
- Rust — slower to develop, same distribution benefits
- Bash — fragile for complex logic, poor Windows support
- Python — requires Python runtime, venv complexity

### 2. Shell out to `git` instead of using `go-git`

**Decision:** Use `exec.Command("git", ...)` for all git operations.

**Rationale:** Anyone using this tool already has git installed. Shelling out gives us free support for SSH keys, credential helpers, GPG signing, `.gitconfig` proxies, and every auth mechanism git supports. `go-git` has known edge cases with SSH agent forwarding and credential helpers. The downside (git must be in PATH) is acceptable — it's a hard prerequisite.

### 3. Config file format: YAML

**Decision:** Use YAML for both `agents.yaml` and `config.yaml`.

**Rationale:** YAML is the natural choice for this audience (devops, k8s, CI/CD users). It's readable, supports comments (unlike JSON), and doesn't require quoting keys (unlike TOML for nested structures). Go has mature YAML libraries (`gopkg.in/yaml.v3`).

### 4. `managed/` subdirectory convention

**Decision:** All tool-managed symlinks go into `<agent-skills-dir>/managed/` (e.g., `.pi/skills/managed/my-skill`).

**Rationale:** This cleanly separates tool-managed skills from manually installed ones. The tool owns everything inside `managed/` and can safely prune it. Both pi and opencode support nested skill directories, so discovery works. Users `.gitignore` the `managed/` folder since symlinks point to the local cache and aren't portable.

### 5. Cache directory structure

**Decision:** `$XDG_CACHE_HOME/agentdeps/repos/<owner>-<repo>-<ref>/` (using Go's `os.UserCacheDir()`).

**Rationale:** XDG-compliant on Linux, uses `~/Library/Caches` on macOS, `%LOCALAPPDATA%` on Windows — all via the standard library. The `<owner>-<repo>-<ref>` key is derived from the repo URL and ref. If the same repo+ref is used across multiple projects, they share the same cache entry.

Cache key derivation:
- `github.com/vercel-labs/agent-skills` + ref `main` → `vercel-labs-agent-skills-main`
- `git@github.com:my-org/skills.git` + ref `v1.2.0` → `my-org-skills-v1.2.0`

### 6. Repo URL handling and clone method

**Decision:** `agents.yaml` uses shorthand (`owner/repo`) or full URLs. The global config's `clone_method` (ssh/https) determines how shorthand is expanded.

**Rationale:** The dependency file should be team-shareable and not encode individual auth preferences. `my-org/skills` is neutral — it becomes `git@github.com:my-org/skills.git` for SSH users and `https://github.com/my-org/skills.git` for HTTPS users based on their personal global config.

Full URLs in `agents.yaml` override the clone method (if someone writes `git@github.com:...` explicitly, it's used as-is).

### 7. Interactive first-run setup using Charm's `huh` library

**Decision:** Use `charmbracelet/huh` for the interactive TUI prompts.

**Rationale:** `huh` provides form-style prompts (select, multi-select, text input) with a polished look similar to the Vercel skills CLI screenshot. It's simpler than full `bubbletea` (which is a TEA framework for complex TUIs). `huh` is built on top of `bubbletea` but provides high-level form components — exactly what we need for the setup wizard.

### 8. `install` always pulls latest

**Decision:** `agentdeps install` always does `git fetch && git checkout` for each dependency. There is no separate `update` command.

**Rationale:** Without a lockfile, `install` is inherently "get latest for the configured ref." If the ref is a branch, you get HEAD. If it's a tag or SHA, you get that exact commit. This is simple and predictable. An `update` command would be redundant. If we find later that users want "install without network" we can add `--offline`.

### 9. Skill discovery: `skills/` folder only

**Decision:** Look for skills only in the `skills/` top-level directory of a repo. Each subdirectory containing a `SKILL.md` is a skill.

**Rationale:** Keep it simple for v1. The Vercel CLI searches 30+ directories — that's because it supports many agent-specific layouts. Since we control the convention (repos meant for use with `agentdeps` put skills in `skills/`), one location is enough. This also means skill repo authors have a clear contract.

### 10. CLI framework: `cobra`

**Decision:** Use `spf13/cobra` for CLI argument parsing and command structure.

**Rationale:** Cobra is the de facto standard for Go CLIs (used by kubectl, gh, hugo, etc.). It provides subcommands, flags, help generation, and shell completion out of the box. The alternative (hand-rolling with `flag` or `os.Args`) isn't worth it for 5 commands.

## Risks / Trade-offs

**[Windows symlinks require Developer Mode or admin rights]** → Fall back to directory junctions (`os.Symlink` on directories creates junctions on Windows). If that also fails, print a clear error message explaining how to enable Developer Mode. Do not fall back to copying — that breaks the single-source-of-truth model.

**[`git` must be installed]** → Check for `git` on startup and print a helpful error if missing. This is a hard requirement, not a soft one. Every user of this tool will have git.

**[Cache can grow unbounded]** → Stale repos (from removed dependencies) remain in cache. This is harmless (it's cache) but could accumulate. Defer a `clean` command to later. Users can always `rm -rf ~/.cache/agentdeps`.

**[Shorthand `owner/repo` assumes GitHub]** → For v1, shorthand always expands to `github.com`. Full URLs support any git host (GitLab, Bitbucket, self-hosted). We can add a `default_host` config option later if needed.

**[Multiple projects sharing cache]** → Two projects using the same repo+ref share a cache entry. If one project runs `install` while another is reading, there could be a brief inconsistency during `git pull`. This is unlikely and harmless (symlinks point to directories, not individual files, and git operations are atomic at the ref level).

**[Agent path changes]** → If a coding agent changes its skill directory path in a future version, the agent registry needs updating. Mitigation: the registry is a simple map in code, easy to update. We can also look at what Vercel maintains and sync.
