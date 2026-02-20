# Changelog

## 0.5.0

### Features

- **Pi and OpenCode now install to `.agents/`** — Both agents switched from their agent-specific project directories (`.pi/skills`, `.opencode/skills`) to the universal `.agents/skills` and `.agents/agents` convention, aligning with Codex, Amp, Gemini CLI, and other universal agents.
- **Automatic legacy path migration** — During `agentdeps install`, any existing `_agentdeps_managed/` directories at the old paths (`.pi/skills/_agentdeps_managed/`, `.pi/agents/_agentdeps_managed/`, `.opencode/skills/_agentdeps_managed/`, `.opencode/agents/_agentdeps_managed/`) are automatically cleaned up. User-created content outside managed directories is never touched.

### Notes

- Pi and OpenCode still support their own directories (`.pi/`, `.opencode/`), but `.agents/` is now the preferred install target.
- Global paths remain unchanged (`~/.pi/agent/skills`, `~/.config/opencode/skills`).
- No action required from users — the migration happens transparently on the next `agentdeps install`.

## 0.4.1

- Verify commit signing

## 0.4.0

- Read CLI version from `src/version.ts` instead of hardcoded string
- Add pre-commit hook for typecheck, tests, and build
- Add `--global`/`-g` flag to `add` command
- Support file-based agents, fix OpenCode paths, improve interactive picker
