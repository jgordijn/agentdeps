## Why

`agentdeps install` currently reports only aggregate added/removed counts per scope. When an existing cached repository is updated, users cannot see which managed skills changed, which makes it hard to verify a registry update or understand why a project's installed capabilities now differ.

## What Changes

- Expand `agentdeps install` reporting so updated dependency repositories produce itemized change output instead of only aggregate counts.
- Distinguish managed items that were added, updated, and removed during install, with clear skill-level reporting for repositories that changed.
- Keep the install output concise when nothing changed, while surfacing detailed change lists only when they add value.

## Capabilities

### New Capabilities

_(none — this extends existing capabilities)_

### Modified Capabilities

- `cli-commands`: The `install` command reports which managed items changed when a dependency repository update results in added, updated, or removed installs.
- `install-management`: Managed directory sync exposes added, updated, removed, and unchanged item categories so install reporting can describe concrete changes instead of only counts.

## Impact

- **Code**: `src/commands/install.ts`, `src/install/managed.ts`, and supporting tests in `src/install/managed.test.ts` and `src/integration.test.ts`.
- **Docs**: `README.md` should describe the richer install output.
- **APIs**: No external API changes; CLI output becomes more descriptive.
- **Dependencies**: None expected.
