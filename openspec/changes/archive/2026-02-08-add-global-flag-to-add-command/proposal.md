## Why

The `agentdeps add` command only writes to the project-local `./agents.yaml`. Users who want to add dependencies globally (to `~/.config/agentdeps/agents.yaml`) must manually edit the file. The `install` and `list` commands already support the global `agents.yaml`, but `add` has no way to target it — creating an inconsistent CLI experience.

## What Changes

- Add a `--global` / `-g` flag to the `add` command that writes the dependency to the global `agents.yaml` (`~/.config/agentdeps/agents.yaml`) instead of the project-local one.
- When `--global` is set, duplicate detection checks against the global config instead of the project config.
- After adding globally, `runInstall` is invoked as usual (it already processes both global and project configs).

## Capabilities

### New Capabilities

_(none — this extends an existing capability)_

### Modified Capabilities

- `cli-commands`: The `add` command gains a `--global` / `-g` option to target the global `agents.yaml` instead of the project-local one.

## Impact

- **Code**: `src/commands/add.ts` — add flag definition, conditional path selection, duplicate check against correct config.
- **APIs**: No API changes. CLI gains one new optional flag.
- **Dependencies**: None. Uses existing `globalAgentsYamlPath()` from `src/config/global.ts` and existing `loadProjectConfig`/`saveProjectConfig` from `src/config/project.ts`.
- **Systems**: No infrastructure changes. The global `agents.yaml` file is already created/read by `install` and `list`.
