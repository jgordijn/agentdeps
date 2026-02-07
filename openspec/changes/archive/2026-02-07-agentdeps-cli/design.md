## Context

There is no existing codebase — this is a greenfield TypeScript CLI tool built with Bun and distributed via npm. The problem space is well-understood: agent skills and subagent definitions live in git repositories, and projects need a declarative way to declare, install, update, and prune them across multiple coding agent tools (pi, opencode, claude-code, etc.).

The user has `git` installed (required). The tool shells out to `git` rather than using a JS git library, which avoids authentication complexity — SSH keys, credential helpers, and `.gitconfig` all work automatically.

The Vercel `skills` CLI (npm package) is the closest prior art. It handles agent path mapping and skill discovery well, but is imperative (no dependency file). This tool takes the declarative approach while sharing the npm distribution model.

## Goals / Non-Goals

**Goals:**

- Declarative dependency management via `agents.yaml` — commit it, and any team member can reproduce the same skill and subagent setup
- Support both skills (`skills/` directory) and subagent definitions (`agents/` directory) from dependency repos
- Per-dependency control over what to install: all skills, all agents, a subset of each, or opt out of either entirely
- Global user config (which coding agents, clone method, install method) so the project file stays agent-agnostic
- Global personal dependencies (`~/.config/agentdeps/agents.yaml`) installed implicitly alongside project deps
- Automatic pruning of items removed from `agents.yaml`
- Cross-platform (Linux, macOS, Windows)
- Simple CLI: `install`, `add`, `remove`, `list`, `config`
- Fast: shallow clones where possible, git pull for updates
- Zero-install via `npx agentdeps` — no binary downloads, no install scripts
- Configurable install method: symlinks (fast, default) or copy with smart sync (portable)
- Extensible agent registry: built-in mappings for known agents, user-definable custom agents

**Non-Goals:**

- No lockfile — `ref` (branch/tag/SHA) in `agents.yaml` is sufficient for pinning
- No skill/agent registry or search — use Vercel's `skills find` or browse GitHub
- No monorepo path filtering — repos must have top-level `skills/` and/or `agents/` directories
- No MCP or tool integration — this is purely about file-based skills and subagent definitions
- No embedded git library — `git` CLI is a hard prerequisite
- No format transformation — skills and subagent definitions are installed as-is; the tool doesn't convert between agent-specific formats

## Decisions

### 1. TypeScript on Bun, distributed via npm

**Decision:** TypeScript with Bun as the runtime, published to npm.

**Rationale:** The target audience (developers using coding agents) already has Node.js/npm installed. `npx agentdeps install` gives zero-install usage — no binary downloads, no install scripts, no GoReleaser. Updates are trivial (`npm update -g agentdeps`). Bun provides fast startup and built-in TypeScript support. The tool is a thin orchestrator over `git` commands, not a performance-critical application.

Alternatives considered:
- Go — single binary but requires GoReleaser + GitHub Releases + install scripts; overkill for distribution
- Rust — same distribution overhead as Go
- Bash — fragile for complex logic, poor Windows support
- Python — requires Python runtime, venv complexity

### 2. Shell out to `git`

**Decision:** Use `Bun.spawn()` / `child_process` for all git operations.

**Rationale:** Anyone using this tool already has git installed. Shelling out gives us free support for SSH keys, credential helpers, GPG signing, `.gitconfig` proxies, and every auth mechanism git supports. JS git libraries (isomorphic-git, simple-git) have known edge cases with SSH agent forwarding and credential helpers. The downside (git must be in PATH) is acceptable — it's a hard prerequisite.

### 3. Config file format: YAML

**Decision:** Use YAML for both `agents.yaml` and `config.yaml`.

**Rationale:** YAML is the natural choice for this audience (devops, k8s, CI/CD users). It's readable, supports comments (unlike JSON), and doesn't require quoting keys (unlike TOML for nested structures). The `yaml` npm package handles parsing and serialization.

### 4. `_agentdeps_managed/` subdirectory convention

**Decision:** All tool-managed items go into `<agent-dir>/skills/_agentdeps_managed/` and `<agent-dir>/agents/_agentdeps_managed/` (e.g., `.pi/skills/_agentdeps_managed/my-skill`, `.pi/agents/_agentdeps_managed/my-agent`).

**Rationale:** This cleanly separates tool-managed items from manually installed ones. The tool owns everything inside `_agentdeps_managed/` and can safely prune it. Both pi and opencode support nested skill directories, so discovery works. Users `.gitignore` the `_agentdeps_managed/` folder when using link mode (symlinks point to the local cache and aren't portable), or may choose to commit them in copy mode.

### 5. Cache directory structure

**Decision:** `~/.cache/agentdeps/repos/<owner>-<repo>-<ref>/` using platform-appropriate cache paths.

**Rationale:** Uses `$XDG_CACHE_HOME` on Linux (defaults to `~/.cache`), `~/Library/Caches` on macOS, `%LOCALAPPDATA%` on Windows. The `<owner>-<repo>-<ref>` key is derived from the repo URL and ref. If the same repo+ref is used across multiple projects, they share the same cache entry.

Cache key derivation:
- `vercel-labs/agent-skills` + ref `main` → `vercel-labs-agent-skills-main`
- `git@github.com:my-org/skills.git` + ref `v1.2.0` → `my-org-skills-v1.2.0`

### 6. Repo URL handling and clone method

**Decision:** `agents.yaml` uses shorthand (`owner/repo`) or full URLs. The global config's `clone_method` (ssh/https) determines how shorthand is expanded.

**Rationale:** The dependency file should be team-shareable and not encode individual auth preferences. `my-org/skills` is neutral — it becomes `git@github.com:my-org/skills.git` for SSH users and `https://github.com/my-org/skills.git` for HTTPS users based on their personal global config.

Full URLs in `agents.yaml` override the clone method (if someone writes `git@github.com:...` explicitly, it's used as-is).

### 7. Interactive first-run setup using `@clack/prompts`

**Decision:** Use `@clack/prompts` for the interactive TUI prompts.

**Rationale:** `@clack/prompts` provides polished form-style prompts (select, multi-select, text input) with a clean aesthetic. It's the TypeScript equivalent of Charm's `huh` library. Lightweight, no heavy TUI framework needed.

### 8. `install` always pulls latest

**Decision:** `agentdeps install` always does `git fetch && git checkout` for each dependency. There is no separate `update` command.

**Rationale:** Without a lockfile, `install` is inherently "get latest for the configured ref." If the ref is a branch, you get HEAD. If it's a tag or SHA, you get that exact commit. This is simple and predictable. An `update` command would be redundant. If we find later that users want "install without network" we can add `--offline`.

### 9. Discovery: `skills/` and `agents/` folders

**Decision:** Look for skills in `skills/` and subagent definitions in `agents/` at the top level of a repo. Each subdirectory containing a `SKILL.md` is a skill. Each subdirectory in `agents/` containing an agent definition file is a subagent.

**Rationale:** Two well-defined locations give repo authors a clear contract. The Vercel CLI searches 30+ directories — that's because it supports many agent-specific layouts. Since we control the convention (repos meant for use with `agentdeps` put items in `skills/` and/or `agents/`), two locations are enough.

### 10. CLI framework: `commander`

**Decision:** Use `commander` for CLI argument parsing and command structure.

**Rationale:** Commander is the de facto standard for Node.js CLIs. It provides subcommands, flags, help generation, and is battle-tested. Lightweight and well-documented.

### 11. Link vs Copy install method

**Decision:** Global config `install_method` setting controls whether items are symlinked (default) or copied with smart sync.

**Rationale:** Symlinks are fast and avoid duplication, but don't work in all environments (Docker bind mounts, restrictive Windows, network filesystems). Copy mode makes `_agentdeps_managed/` self-contained and portable. Smart sync means on each install: add new files, overwrite changed files, delete files/directories that no longer exist in the source. Both methods use the same `_agentdeps_managed/` directory and pruning logic.

### 12. Built-in agent registry with user-extensible custom agents

**Decision:** The application ships with a hardcoded registry of known agents and their paths. Users can define additional custom agents (or override built-in ones) in the global config.

**Rationale:** The built-in registry is application code, not user configuration — it codifies the known directory conventions for pi, claude-code, cursor, etc. But the agent ecosystem moves fast. Custom agent definitions let users support new or private agents without waiting for an application update. If a custom agent name collides with a built-in name, the custom definition wins.

## Risks / Trade-offs

**[Node.js required]** → The target audience (developers using coding agents) universally has Node.js/npm installed. `npx` makes this a non-issue for ad-hoc use. For CI/CD, `npm install -g agentdeps` is a one-liner.

**[Windows symlinks require Developer Mode or admin rights]** → The `install_method: copy` option provides a clean fallback. When using link mode, fall back to directory junctions first. If that also fails, suggest switching to copy mode or enabling Developer Mode.

**[`git` must be installed]** → Check for `git` on startup and print a helpful error if missing. This is a hard requirement, not a soft one. Every user of this tool will have git.

**[Cache can grow unbounded]** → Stale repos (from removed dependencies) remain in cache. This is harmless (it's cache) but could accumulate. Defer a `clean` command to later. Users can always `rm -rf ~/.cache/agentdeps`.

**[Shorthand `owner/repo` assumes GitHub]** → For v1, shorthand always expands to `github.com`. Full URLs support any git host (GitLab, Bitbucket, self-hosted). We can add a `default_host` config option later if needed.

**[Multiple projects sharing cache]** → Two projects using the same repo+ref share a cache entry. If one project runs `install` while another is reading, there could be a brief inconsistency during `git pull`. This is unlikely and harmless (symlinks point to directories, not individual files, and git operations are atomic at the ref level). In copy mode, the copy happens after the git operation completes.

**[Agent path changes]** → If a coding agent changes its skill directory path in a future version, the built-in registry needs updating. Mitigation: the registry is a simple map, easy to update. Users can also use custom agent definitions to override paths immediately without waiting for a release.

**[Copy mode performance]** → Smart sync needs to diff source and destination directories on every install. For typical skill repos (small files, few directories), this is fast. For very large repos, symlinks are recommended.
