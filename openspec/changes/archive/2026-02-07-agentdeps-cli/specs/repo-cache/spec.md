## ADDED Requirements

### Requirement: Repositories are cached locally
The tool SHALL clone repositories to a platform-appropriate cache directory under `agentdeps/repos/`.

#### Scenario: Cache directory structure
- **WHEN** a dependency with repo `my-org/my-skills` and ref `main` is processed
- **THEN** the repository is cloned to `<cache-dir>/agentdeps/repos/my-org-my-skills-main/`

#### Scenario: Cache key from full SSH URL
- **WHEN** a dependency has `repo: git@github.com:my-org/skills.git` and `ref: v1.2.0`
- **THEN** the cache key is `my-org-skills-v1.2.0`

#### Scenario: Cache key from full HTTPS URL
- **WHEN** a dependency has `repo: https://github.com/my-org/skills.git` and `ref: develop`
- **THEN** the cache key is `my-org-skills-develop`

#### Scenario: Cache location follows OS conventions
- **WHEN** the tool resolves the cache directory
- **THEN** it uses `~/.cache` on Linux, `~/Library/Caches` on macOS, and `%LOCALAPPDATA%` on Windows

### Requirement: Clone on first use
The tool SHALL clone a repository when its cache directory does not exist.

#### Scenario: First clone of a repo
- **WHEN** a dependency is processed and its cache directory does not exist
- **THEN** the tool runs `git clone --branch <ref> --single-branch <url> <cache-dir>` to create a single-branch clone

#### Scenario: Clone failure
- **WHEN** `git clone` fails (network error, auth failure, invalid repo)
- **THEN** the tool prints the git error output and continues processing remaining dependencies (non-fatal)

### Requirement: Pull on subsequent installs
The tool SHALL update an existing cached repository by fetching and checking out the configured ref.

#### Scenario: Update existing cache
- **WHEN** a dependency is processed and its cache directory already exists
- **THEN** the tool runs `git fetch origin` and `git checkout origin/<ref>` (for branches) or `git checkout <ref>` (for tags/SHAs) in the cache directory

#### Scenario: Pull failure
- **WHEN** `git fetch` or `git checkout` fails
- **THEN** the tool prints a warning with the git error output and continues with the existing cached state

### Requirement: Cache key derivation strips git artifacts
The tool SHALL derive cache keys by extracting owner and repo name from URLs, stripping `.git` suffix, protocol prefixes, and host information.

#### Scenario: Shorthand cache key
- **WHEN** repo is `vercel-labs/agent-skills` and ref is `main`
- **THEN** cache key is `vercel-labs-agent-skills-main`

#### Scenario: SSH URL cache key
- **WHEN** repo is `git@gitlab.com:my-org/my-skills.git` and ref is `main`
- **THEN** cache key is `my-org-my-skills-main`

#### Scenario: HTTPS URL cache key
- **WHEN** repo is `https://github.com/my-org/my-skills.git` and ref is `main`
- **THEN** cache key is `my-org-my-skills-main`
