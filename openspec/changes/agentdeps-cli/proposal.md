## Why

Agent skills and agent configs are scattered across repositories, but there's no declarative way to manage them as project dependencies. The Vercel `skills` CLI is imperative — you run commands and hope everyone on the team runs the same ones. There's no `package.json` equivalent that says "this project needs these skills from these repos." When dependencies change, there's no mechanism to prune stale skills. Teams need a reproducible, declarative dependency manager for agent skills.

## What Changes

- Introduce `agentdeps`, a Go CLI tool that manages agent skill dependencies declaratively
- A project-level `agents.yaml` file defines which skills to install from which git repositories
- A global `~/.config/agentdeps/agents.yaml` provides personal/global skill dependencies, installed implicitly alongside project dependencies
- A global `~/.config/agentdeps/config.yaml` stores user preferences (clone method, target agents), created via interactive first-run setup
- Repositories are cloned/pulled to `$XDG_CACHE/agentdeps/repos/<owner>-<repo>-<ref>/`
- Skills are symlinked into each configured agent's `<agent-dir>/skills/managed/` directory (e.g., `.pi/skills/managed/`, `.agents/skills/managed/`)
- The `managed/` subdirectory is fully owned by the tool — stale symlinks are pruned automatically on every `install`
- Cross-platform: Linux, macOS, Windows (with symlink fallback to directory junctions on Windows)

## Capabilities

### New Capabilities

- `cli-commands`: The CLI command structure — `install`, `add`, `remove`, `list`, `config` — including argument parsing, help text, and error handling
- `project-config`: Parsing and validation of `agents.yaml` (project-level dependency declarations with repo, ref, and skill list)
- `global-config`: Global user configuration (`~/.config/agentdeps/config.yaml`) for clone method and target agents, plus global `agents.yaml` for personal skill dependencies
- `interactive-setup`: First-run interactive TUI that asks the user for clone method (SSH/HTTPS) and which agents they use, then persists to global config
- `repo-cache`: Git clone and pull operations to `$XDG_CACHE/agentdeps/repos/`, keyed by `<owner>-<repo>-<ref>`, supporting branches, tags, and commit SHAs via the `ref` field
- `skill-discovery`: Scanning cached repositories for skills (directories containing `SKILL.md` in the `skills/` folder of the repo)
- `symlink-management`: Creating and pruning symlinks in each agent's `<agent-dir>/skills/managed/` directory, with Windows fallback to directory junctions
- `agent-registry`: Registry of supported agents and their skill directory paths (project and global), covering pi, opencode, claude-code, cursor, and others

### Modified Capabilities

_(none — greenfield project)_

## Impact

- **New project**: Entirely new Go CLI tool, no existing code affected
- **Dependencies**: Go standard library + TUI library (Charm's `huh` or `bubbletea`) + `git` CLI (shelled out, not embedded)
- **File system**: Creates `managed/` subdirectories inside agent skill folders; users should `.gitignore` these
- **Git**: Clones repositories to user cache; respects existing git credential helpers and SSH config
- **Distribution**: Cross-compiled Go binaries via GoReleaser + GitHub Releases; optionally Homebrew tap and `go install`
