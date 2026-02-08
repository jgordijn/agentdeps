# AGENTS.md — agentdeps

## Project Overview

**agentdeps** is a declarative dependency manager for AI coding agent skills and sub-agents. It lets users define skills/agents they need in a config file (`agentdeps.yaml`) and installs them from Git-based registries into their project or global agent directory.

Repository: https://github.com/jgordijn/agentdeps

## Technology Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Language:** TypeScript (strict mode)
- **CLI Framework:** [Commander.js](https://github.com/tj/commander.js/)
- **Interactive Prompts:** [@clack/prompts](https://github.com/bombshell-dev/clack)
- **Config Parsing:** [yaml](https://github.com/eemeli/yaml)
- **Testing:** Bun's built-in test runner (`bun test`)
- **Build:** Bun bundler (single-file output to `dist/`)
- **Workflow:** [OpenSpec](https://github.com/openspec-dev/openspec) for structured change management

## Common Tasks

### Install dependencies

```bash
bun install
```

### Build

Produces a single minified file at `dist/index.js` targeting Node.js:

```bash
bun run build
```

### Run tests

```bash
bun test
```

Tests are co-located with source files using the `*.test.ts` naming convention.

### Run in development (watch mode)

```bash
bun run dev
```

### Run the CLI directly from source

```bash
bun run ./src/index.ts --help
bun run ./src/index.ts install
bun run ./src/index.ts add <package>
bun run ./src/index.ts list
bun run ./src/index.ts remove <package>
bun run ./src/index.ts config
```

### Type-check without emitting

```bash
bunx tsc --noEmit
```

> **Note:** There is no `lint` script configured. There is no formatter config (e.g. Prettier/ESLint).

## Code Architecture

```
src/
├── index.ts              # Entry point — parses CLI args via Commander
├── commands/             # CLI command definitions
│   ├── root.ts           # Top-level program setup and global options
│   ├── install.ts        # `agentdeps install` — installs all deps from config
│   ├── add.ts            # `agentdeps add` — adds a package to config + installs
│   ├── list.ts           # `agentdeps list` — lists installed packages
│   ├── remove.ts         # `agentdeps remove` — removes a package
│   └── config.ts         # `agentdeps config` — manage global configuration
├── config/
│   ├── project.ts        # Reads/writes project-level agentdeps.yaml
│   └── global.ts         # Reads/writes global config (~/.agentdeps/)
├── registry/
│   └── registry.ts       # Resolves packages from Git-based registries
├── cache/
│   ├── cache.ts          # Git repo caching (clone/pull)
│   └── url.ts            # Git URL parsing utilities
├── install/
│   ├── managed.ts        # Managed install strategy (copies + marks managed)
│   ├── copy.ts           # Copy install strategy
│   └── link.ts           # Symlink install strategy
├── discovery/
│   └── discovery.ts      # Auto-discovers agent framework (pi, claude, etc.)
├── setup/
│   └── setup.ts          # Interactive first-run setup wizard
└── log/
    └── logger.ts         # Structured logger with verbosity levels
```

### Key Concepts

- **Registry:** A Git repository containing skills and/or agents in a known directory structure. The default registry is configured globally.
- **Package:** A skill or agent that can be installed from a registry (format: `registry/package` or just `package` for the default registry).
- **Install strategies:** `managed` (copy + track for updates), `copy` (one-time copy), `link` (symlink to cache).
- **Project config** (`agentdeps.yaml`): Declares dependencies for a project.
- **Global config** (`~/.agentdeps/config.yaml`): Stores default registry, cache directory, and global settings.
- **Discovery:** Auto-detects the agent framework in use (pi, Claude Code, Cursor, etc.) to determine where to install skills/agents.

### Testing Patterns

Tests are co-located next to the files they test:

```
src/config/project.ts       →  src/config/project.test.ts
src/registry/registry.ts    →  src/registry/registry.test.ts
src/install/copy.ts         →  src/install/copy.test.ts
```

Tests use Bun's built-in test runner (`describe`, `test`, `expect`). Filesystem-dependent tests use temp directories for isolation.

There is also an integration test at `src/integration.test.ts`.

## Documentation

Always keep `README.md` up to date with the codebase. When making changes — adding features, modifying CLI flags, changing behavior, or updating configuration — update the README to reflect those changes. Documentation should never lag behind the code.

## OpenSpec Workflow

This project uses [OpenSpec](https://github.com/openspec-dev/openspec) for structured change management. OpenSpec specs live in `openspec/specs/` and track the authoritative design of each module.

### Current Specs

| Spec | Description |
|---|---|
| `agent-registry` | Git-based registry resolution |
| `cli-commands` | CLI command definitions |
| `discovery` | Agent framework auto-discovery |
| `global-config` | Global configuration management |
| `install-management` | Install strategies (managed/copy/link) |
| `interactive-setup` | First-run setup wizard |
| `project-config` | Project-level config (agentdeps.yaml) |
| `repo-cache` | Git repository caching |

### OpenSpec Commands

The workflow follows a structured progression: **new → continue → apply → verify → archive**.

1. **Start a new change:** Ask to "start a new openspec change" — creates a proposal for the change.
2. **Continue a change:** Ask to "continue the openspec change" — progresses through artifacts (proposal → design → delta-spec → tasks).
3. **Fast-forward:** Ask to "fast-forward the openspec change" — creates all remaining artifacts at once.
4. **Apply/Implement:** Ask to "apply the openspec change" — implements the tasks from the change.
5. **Verify:** Ask to "verify the openspec change" — validates implementation matches the design.
6. **Archive:** Ask to "archive the openspec change" — finalizes and moves the change to the archive.

### OpenSpec Tips

- Use **explore mode** ("let's explore...") to think through ideas before starting a change.
- Archived changes live in `openspec/changes/archive/`.
- Delta specs in a change describe what changed relative to the main specs.
- After implementation, use **sync-specs** to update main specs with delta changes.
