## 1. Add --global flag to add command

- [x] 1.1 Add `.option("-g, --global", "Add dependency to global agents.yaml instead of project")` to the command definition in `src/commands/add.ts`
- [x] 1.2 Replace the hardcoded `projectYamlPath` with a conditional: use `globalAgentsYamlPath()` when `options.global` is set, otherwise `join(process.cwd(), "agents.yaml")`
- [x] 1.3 Update the duplicate-check logic to load and check against the correct config (global or project) based on the flag

## 2. User feedback

- [x] 2.1 Print a confirmation message indicating whether the dependency was added to the global or project config (e.g., "Added to global agents.yaml" vs "Added to project agents.yaml")

## 3. Tests

- [x] 3.1 Add test: `agentdeps add repo --global` writes to global `agents.yaml` path
- [x] 3.2 Add test: `agentdeps add repo --global` detects duplicates in global config
- [x] 3.3 Add test: `agentdeps add repo -g` behaves identically to `--global`
- [x] 3.4 Add test: `agentdeps add repo --global` creates global `agents.yaml` if it doesn't exist
- [x] 3.5 Add test: `agentdeps add repo` (without `--global`) still writes to project-local `agents.yaml` (regression)
