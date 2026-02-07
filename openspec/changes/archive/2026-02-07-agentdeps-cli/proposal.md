## Why

Agent skills and agent configs are scattered across repositories, but there's no declarative way to manage them as project dependencies. The Vercel `skills` CLI is imperative — you run commands and hope everyone on the team runs the same ones. There's no `package.json` equivalent that says "this project needs these skills from these repos." When dependencies change, there's no mechanism to prune stale skills. Teams need a reproducible, declarative dependency manager for agent skills and subagent definitions.

## What Changes

- Introduce `agentdeps`, a TypeScript CLI tool (built with Bun, distributed via npm) that manages agent skill and subagent dependencies declaratively
- A project-level `agents.yaml` file defines which skills and subagents to install from which git repositories
- A global `~/.config/agentdeps/agents.yaml` provides personal/global dependencies, installed implicitly alongside project dependencies
- A global `~/.config/agentdeps/config.yaml` stores user preferences (clone method, target agents, install method, custom agent definitions), created via interactive first-run setup
- Repositories are cloned/pulled to `~/.cache/agentdeps/repos/<owner>-<repo>-<ref>/` (platform-appropriate via `env.HOME` / XDG conventions)
- Skills are installed into `<agent-dir>/skills/_agentdeps_managed/` and subagents into `<agent-dir>/agents/_agentdeps_managed/` (e.g., `.pi/skills/_agentdeps_managed/`, `.pi/agents/_agentdeps_managed/`)
- The `_agentdeps_managed/` subdirectories are fully owned by the tool — stale entries are pruned automatically on every `install`
- Cross-platform: Linux, macOS, Windows
- Zero-install usage via `npx agentdeps install` — no binary downloads needed

## Repo Layout Convention

Dependency repositories can provide skills, subagents, or both. The tool discovers them from two top-level directories:

- `skills/` — each subdirectory containing a `SKILL.md` is a skill
- `agents/` — each subdirectory containing an agent definition file (e.g., markdown with frontmatter) is a subagent

Both use the same discovery, filtering, and install mechanism.

## Dependency Selection: Skills and Agents

Each dependency in `agents.yaml` has separate `skills` and `agents` fields to control what gets installed:

```yaml
dependencies:
  # Install everything (default) — all skills and all subagents
  - repo: my-org/my-repo

  # All skills, no subagents
  - repo: my-org/skills-only
    agents: false

  # No skills, all subagents
  - repo: my-org/agents-only
    skills: false

  # Cherry-pick specific items
  - repo: my-org/mixed-repo
    skills:
      - frontend-design
      - kotlin-conventions
    agents:
      - code-reviewer

  # All skills, specific subagents
  - repo: my-org/another-repo
    skills: "*"
    agents:
      - deployment-agent
```

**Selection rules:**

| `skills` value | `agents` value | Behavior |
|---|---|---|
| omitted / `"*"` | omitted / `"*"` | Install all skills AND all subagents (default) |
| `["name1"]` | omitted / `"*"` | Only listed skills, all subagents |
| `false` | `"*"` | No skills, all subagents |
| `"*"` | `false` | All skills, no subagents |
| `["a", "b"]` | `["x"]` | Only listed skills and listed subagents |
| `false` | `false` | Nothing installed (valid but useless) |

## Agent Path Model

The application ships with a built-in agent registry that maps coding agent names to their directory paths. This is application code, not user configuration.

### Built-in Registry

Each agent in the registry defines two path pairs (project and global scope, for both skills and subagents):

- **Default convention**: Most agents use `.agents/skills/` and `.agents/agents/` (project scope). This is the universal baseline shared by opencode, codex, amp, gemini-cli, github-copilot, kimi-cli, etc.
- **Per-agent overrides**: Some agents have unique paths baked into the registry. For example:
  - Pi → `.pi/skills/`, `.pi/agents/` (project); `~/.pi/agent/skills/`, `~/.pi/agent/agents/` (global)
  - Claude Code → `.claude/skills/`, `.claude/agents/` (project); `~/.claude/skills/`, `~/.claude/agents/` (global)
  - Cursor → `.cursor/skills/`, `.cursor/agents/` (project); `~/.cursor/skills/`, `~/.cursor/agents/` (global)
- **Deduplication**: When multiple configured agents share the same project path (e.g., opencode and codex both use `.agents/skills/`), items are only installed once to that path.

### Custom Agent Definitions

Users can define their own agents in the global config to support new or private agents not yet in the built-in registry:

```yaml
# ~/.config/agentdeps/config.yaml
custom_agents:
  my-internal-agent:
    project_skills: .my-agent/skills
    project_agents: .my-agent/agents
    global_skills: ~/.my-agent/skills
    global_agents: ~/.my-agent/agents
```

Custom agents appear alongside built-in agents in the interactive setup and can be selected as targets. If a custom agent name collides with a built-in name, the custom definition takes precedence (allowing users to override paths for built-in agents).

## Install Method: Link vs Copy

The global config has an `install_method` setting (`link` or `copy`, default `link`):

- **`link` (default)**: Items are symlinked from `_agentdeps_managed/` into the cached repo. Fast, no duplication, but symlinks may not work in all environments (e.g., some Docker setups, restrictive Windows configurations).
- **`copy`**: Items are copied from the cached repo into `_agentdeps_managed/`. The tool performs a smart sync — on each `install` it compares the source and destination, adds new files, updates changed files, and removes files/directories that no longer exist in the source. This makes `_agentdeps_managed/` self-contained and portable.

Both methods use the same `_agentdeps_managed/` directory convention and the same pruning logic for stale entries.

## Capabilities

### New Capabilities

- `cli-commands`: The CLI command structure — `install`, `add`, `remove`, `list`, `config` — including argument parsing, help text, and error handling
- `project-config`: Parsing and validation of `agents.yaml` (project-level dependency declarations with repo, ref, skills selection, and agents selection)
- `global-config`: Global user configuration (`~/.config/agentdeps/config.yaml`) for clone method, target agents, install method (link/copy), and custom agent definitions, plus global `agents.yaml` for personal dependencies
- `interactive-setup`: First-run interactive TUI that asks the user for clone method (SSH/HTTPS), which agents they use, and install method (link/copy), then persists to global config
- `repo-cache`: Git clone and pull operations to `~/.cache/agentdeps/repos/`, keyed by `<owner>-<repo>-<ref>`, supporting branches, tags, and commit SHAs via the `ref` field
- `discovery`: Scanning cached repositories for skills (`skills/` subdirectories containing `SKILL.md`) and subagents (`agents/` subdirectories containing agent definition files)
- `install-management`: Creating and pruning items in each agent's `skills/_agentdeps_managed/` and `agents/_agentdeps_managed/` directories via symlinks or smart copy sync, depending on global config
- `agent-registry`: Built-in registry of supported coding agents with their skill and subagent directory paths — defaults to `.agents/skills/` and `.agents/agents/` with per-agent overrides for pi, claude-code, cursor, etc. Users can extend with custom agent definitions in global config.

### Modified Capabilities

_(none — greenfield project)_

## Impact

- **New project**: Entirely new TypeScript CLI tool built with Bun, no existing code affected
- **Dependencies**: Bun runtime + `@clack/prompts` (interactive TUI) + `yaml` (YAML parsing) + `commander` (CLI framework) + `git` CLI (shelled out)
- **File system**: Creates `_agentdeps_managed/` subdirectories inside agent skill and subagent folders; users should `.gitignore` these (for link mode) or may choose to commit them (for copy mode)
- **Git**: Clones repositories to user cache; respects existing git credential helpers and SSH config
- **Distribution**: Published to npm as `agentdeps`; usable instantly via `npx agentdeps <command>` or installed globally via `npm install -g agentdeps`. Updates via `npm update`. No binary compilation, no install scripts, no GoReleaser needed
