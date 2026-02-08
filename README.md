# agentdeps

Declarative dependency manager for AI coding agent skills and subagents.

Manage skills and subagent definitions from git repositories across multiple coding agents (Pi, Claude Code, Cursor, OpenCode, Codex, Amp, and more) with a single `agents.yaml` file.

## Quick Start

```bash
# Run without installing
npx agentdeps install

# Or install globally
npm install -g agentdeps
```

## Usage

### 1. First-run setup

On first use, `agentdeps` will ask you to configure:

- **Clone method**: SSH or HTTPS
- **Target agents**: Which coding agents you use (Pi, Claude Code, Cursor, etc.)
- **Install method**: Link (symlinks, default) or Copy (smart sync)

Re-run anytime with `agentdeps config`.

### 2. Add dependencies

```bash
# Interactive — discover and pick skills/agents
agentdeps add my-org/my-skills-repo

# Install everything from a repo
agentdeps add my-org/my-skills-repo --all

# Cherry-pick specific items
agentdeps add my-org/my-repo --skill frontend-design --skill kotlin-conventions --no-agents

# Specify a git ref
agentdeps add my-org/my-repo --ref v2.0

# Add to global agents.yaml (available in every project)
agentdeps add my-org/my-repo --global
# or: agentdeps add my-org/my-repo -g
```

### 3. Install dependencies

```bash
agentdeps install
```

This clones/updates all dependency repos, discovers skills and agents, and installs them into each configured coding agent's directories.

### 4. List dependencies

```bash
agentdeps list
```

### 5. Remove a dependency

```bash
agentdeps remove my-org/my-skills-repo
```

## `agents.yaml`

The project-level dependency file:

```yaml
dependencies:
  # Install all skills and agents (default)
  - repo: my-org/my-repo

  # Pin to a specific version
  - repo: my-org/my-repo
    ref: v2.0

  # Only specific skills, no agents
  - repo: my-org/mixed-repo
    skills:
      - frontend-design
      - kotlin-conventions
    agents: false

  # All agents, no skills
  - repo: my-org/agents-only
    skills: false

  # Full URL (bypasses clone method setting)
  - repo: git@github.com:my-org/private-repo.git
    ref: develop
```

### Dependency selection

| `skills` | `agents` | Behavior |
|---|---|---|
| omitted / `"*"` | omitted / `"*"` | All skills and all agents (default) |
| `["a", "b"]` | omitted | Only listed skills, all agents |
| `false` | `"*"` | No skills, all agents |
| `"*"` | `false` | All skills, no agents |
| `["a"]` | `["x"]` | Only listed skills and agents |

## `config.yaml`

Global user config at `~/.config/agentdeps/config.yaml`:

```yaml
clone_method: ssh          # or "https"
install_method: link       # or "copy"
agents:
  - pi
  - claude-code
  - opencode

# Optional: define custom agents
custom_agents:
  my-internal-agent:
    project_skills: .my-agent/skills
    project_agents: .my-agent/agents
    global_skills: ~/.my-agent/skills
    global_agents: ~/.my-agent/agents
```

### Global Skills & Agents

Personal dependencies that should be available in **every project** go in a global `agents.yaml` alongside your config. Use `--global` (or `-g`) to add them:

```bash
agentdeps add my-org/my-skills-repo --global
```

The global file lives at:

```
~/.config/agentdeps/agents.yaml      # Linux / macOS
%APPDATA%\agentdeps\agents.yaml      # Windows
```

Same format as the project file:

```yaml
dependencies:
  - repo: my-org/my-skills-repo

  - repo: my-org/another-repo
    skills:
      - kotlin-conventions
    agents: false
```

When you run `agentdeps install`, both global and project dependencies are processed:

1. **Global deps** → installed to each agent's **global** directories (e.g., `~/.pi/agent/skills/`, `~/.claude/skills/`)
2. **Project deps** → installed to each agent's **project** directories (e.g., `.pi/skills/`, `.claude/skills/`)

Global skills are available everywhere — no need to add the same dependency to every project.

#### Global paths per agent

| Agent | Global Skills | Global Agents |
|---|---|---|
| Pi | `~/.pi/agent/skills` | `~/.pi/agent/agents` |
| Claude Code | `~/.claude/skills` | `~/.claude/agents` |
| Cursor | `~/.cursor/skills` | `~/.cursor/agents` |
| Roo | `~/.roo/skills` | `~/.roo/agents` |
| Cline | `~/.cline/skills` | `~/.cline/agents` |
| Windsurf | `~/.windsurf/skills` | `~/.windsurf/agents` |
| OpenCode | `~/.config/opencode/skills` | `~/.config/opencode/agents` |
| Codex | `~/.config/codex/skills` | `~/.config/codex/agents` |
| Amp | `~/.config/amp/skills` | `~/.config/amp/agents` |
| Gemini CLI | `~/.config/gemini-cli/skills` | `~/.config/gemini-cli/agents` |
| GitHub Copilot | `~/.config/github-copilot/skills` | `~/.config/github-copilot/agents` |
| Kimi CLI | `~/.config/kimi-cli/skills` | `~/.config/kimi-cli/agents` |

## Repo Layout Convention

Dependency repositories should provide:

```
my-skills-repo/
├── skills/
│   ├── frontend-design/
│   │   └── SKILL.md
│   └── kotlin-conventions/
│       └── SKILL.md
└── agents/
    └── code-reviewer/
        └── agent.md
```

- `skills/` — subdirectories containing `SKILL.md` are skills
- `agents/` — subdirectories are subagent definitions

## Supported Agents

| Agent | Project Paths | Type |
|---|---|---|
| Pi | `.pi/skills`, `.pi/agents` | Unique |
| Claude Code | `.claude/skills`, `.claude/agents` | Unique |
| Cursor | `.cursor/skills`, `.cursor/agents` | Unique |
| Roo | `.roo/skills`, `.roo/agents` | Unique |
| Cline | `.cline/skills`, `.cline/agents` | Unique |
| Windsurf | `.windsurf/skills`, `.windsurf/agents` | Unique |
| OpenCode | `.opencode/skills`, `.opencode/agents` | Unique |
| Codex | `.agents/skills`, `.agents/agents` | Universal |
| Amp | `.agents/skills`, `.agents/agents` | Universal |
| Gemini CLI | `.agents/skills`, `.agents/agents` | Universal |
| GitHub Copilot | `.agents/skills`, `.agents/agents` | Universal |
| Kimi CLI | `.agents/skills`, `.agents/agents` | Universal |

Universal agents share the same project paths — items are only installed once.

## Install Methods

- **Link (default)**: Symlinks from `_agentdeps_managed/` to the cached repo. Fast, no duplication.
- **Copy**: Smart sync — adds new files, updates changed files, removes deleted files. Self-contained and portable.

Both use `_agentdeps_managed/` subdirectories (e.g., `.pi/skills/_agentdeps_managed/`) which are fully owned by the tool.

## Requirements

- Node.js 18+ (for `npx`)
- `git` CLI

## License

MIT
