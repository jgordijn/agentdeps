## Context

The `agentdeps add` command currently writes dependencies only to the project-local `./agents.yaml`. The global `agents.yaml` at `~/.config/agentdeps/agents.yaml` is already supported by `install` (which reads and processes it) and `list` (which displays its contents), but `add` has no way to target it. Users must manually edit the global file.

The `add` command in `src/commands/add.ts` resolves its target path on line ~33 as `join(process.cwd(), 'agents.yaml')`. The `globalAgentsYamlPath()` function in `src/config/global.ts` already provides the global path. Both global and project configs use the same `ProjectConfig` type with `Dependency[]`, and `loadProjectConfig`/`saveProjectConfig` accept any file path.

## Goals / Non-Goals

**Goals:**
- Allow `agentdeps add <repo> --global` (or `-g`) to write the dependency to the global `agents.yaml`
- Duplicate detection checks the correct config (global when `--global`, project otherwise)
- After adding, the existing `runInstall` flow handles installation to the correct directories

**Non-Goals:**
- Adding `--global` to `remove` or other commands (separate change)
- Changing how `install` processes global vs project configs (already works)
- Creating the global `agents.yaml` during `agentdeps config` setup

## Decisions

### Decision 1: Flag naming — `--global` / `-g`

Use `--global` with short alias `-g`, consistent with npm (`npm install -g`) and other CLI tools. This is universally understood.

**Alternative considered**: `--scope global` — more verbose, unnecessary complexity for a boolean choice.

### Decision 2: Conditional path selection

When `--global` is set, replace the target path:
```
const targetPath = options.global
  ? globalAgentsYamlPath()
  : join(process.cwd(), 'agents.yaml');
```

All downstream operations (`loadProjectConfig`, `saveProjectConfig`, duplicate check) already accept any path, so no other changes are needed in the config layer.

**Alternative considered**: Separate `add-global` subcommand — rejected because it duplicates the entire add flow for a single path difference.

### Decision 3: Auto-create global agents.yaml if missing

When `--global` is used and no global `agents.yaml` exists yet, `saveProjectConfig` will create it (it already handles missing files). No special handling needed.

## Risks / Trade-offs

- **[Risk]** User confusion between global and project deps → **Mitigation**: The `list` command already separates global and project deps visually. The `--global` flag is explicit and opt-in.
- **[Risk]** Running `add --global` in a project directory might be unexpected → **Mitigation**: Print a clear message indicating the dependency was added to the global config, not the project config.
