## Context

`agentdeps install` currently reports aggregate counts per scope by reading `SyncSummary.added` and `SyncSummary.removed` from `syncManagedDir()`. That keeps the output short, but it loses the concrete item names users care about after a repository update. It also does not model `updated` as a first-class outcome: link-mode replacements are counted as additions, and copy-mode syncs classify existing targets as unchanged even when files were overwritten or removed.

The install flow already has a natural place to surface better feedback. `src/install/managed.ts` decides whether each managed item was created, replaced, synchronized, pruned, or left alone, and `src/commands/install.ts` formats the user-facing summary. Improving those two layers keeps the change localized and avoids altering dependency resolution or registry semantics.

## Goals / Non-Goals

**Goals:**
- Distinguish top-level managed items that were added, updated, removed, or unchanged during install
- Show itemized install output when changes occur so users can see which skills changed after a repository update
- Preserve concise `up to date` output when install makes no changes
- Cover both link and copy install methods with consistent change categories

**Non-Goals:**
- Showing file-level diffs within a skill or agent
- Adding a new `--verbose` flag or other CLI surface area in this change
- Changing dependency resolution, repository caching behavior, or install destinations
- Reworking the overall install flow beyond the reporting data it already produces

## Decisions

### 1. Track `updated` as a first-class managed-item outcome

`SyncSummary` will grow from `{ added, removed, unchanged }` to `{ added, updated, removed, unchanged }`.

- In link mode, `ensureSymlink()` returning `created` maps to `added`, `replaced` maps to `updated`, and `unchanged` stays `unchanged`.
- In copy mode, an existing target that required filesystem mutations during sync maps to `updated`; an existing target with no mutations remains `unchanged`.

**Rationale:** The managed install layer already knows whether each top-level item was created, replaced, changed in place, or left alone. Making that explicit gives the CLI an accurate source of truth for user-facing reporting.

**Alternative considered:** Infer updates later from aggregate counts or cache metadata. Rejected because counts lose item identity and cache changes do not always translate directly into installed-item changes.

### 2. Make smart copy sync report whether it mutated the target

`smartSync()` will return a change indicator that tells callers whether any files or directories were added, overwritten, or removed while synchronizing an existing target.

**Rationale:** `syncManagedDir()` cannot accurately distinguish `updated` from `unchanged` in copy mode unless the copy layer reports whether it actually mutated the destination.

**Alternative considered:** Snapshot and diff destination trees before and after sync. Rejected as more complex and less efficient than returning change information from the code that already performs the mutations.

### 3. Report final installed item names at the managed-directory level

Install output will be driven by the final managed sync results per scope/agent target, not by per-repository git diffs.

**Rationale:** The install command merges resolved items across dependencies and deduplicates shared target directories before syncing. Reporting the final managed-item names is what users need to confirm what actually changed in their installed environment, and it avoids threading repository provenance through the full pipeline.

**Alternative considered:** Compute per-repository diffs from cached git state and print those. Rejected because it adds cache-layer coupling and can diverge from what was ultimately installed after filtering and deduplication.

### 4. Keep no-op installs concise and expand only changed categories

`src/commands/install.ts` will continue to emit a compact `up to date` summary when nothing changed. When a scope/agent target has changes, the output will include the change counts plus indented item lists for non-empty `added`, `updated`, and `removed` groups.

**Rationale:** This matches the user's request for more verbosity when installs change while preserving the current low-noise experience for repeat installs.

**Alternative considered:** Always print full added/updated/removed sections or add a dedicated verbosity flag. Rejected because the current request is about making changed installs more informative, not making every install noisier or expanding the CLI API.

## Risks / Trade-offs

- **[Risk] Large updates could produce long output** → Mitigation: only print non-empty change groups and keep unchanged items summarized as `up to date`.
- **[Risk] Copy-mode update classification could drift from real filesystem mutations** → Mitigation: derive `updated` directly from `smartSync()`'s actual write/remove operations instead of a second-pass guess.
- **[Trade-off] Output is grouped by final managed target, not by source repository** → Acceptable because users asked to know which installed skills changed, and the managed target is the authoritative final state.
- **[Trade-off] This adds more reporting data to tests** → Acceptable because the richer summaries should be locked down with unit and integration coverage.
