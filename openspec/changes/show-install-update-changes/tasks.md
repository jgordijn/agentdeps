## 1. Add failing managed-sync tests

- [x] 1.1 Update `src/install/managed.test.ts` to cover added, updated, removed, and unchanged outcomes in link mode
- [x] 1.2 Update `src/install/copy.test.ts` and/or `src/install/managed.test.ts` to cover copy-mode targets that truly change versus targets that remain unchanged

## 2. Implement managed item change classification

- [x] 2.1 Change `src/install/copy.ts` so `smartSync()` reports whether it mutated the destination for file and directory syncs
- [x] 2.2 Extend `src/install/managed.ts` `SyncSummary` and sync logic to populate `updated` separately from `added`, `removed`, and `unchanged`
- [x] 2.3 Update any dependent types or helpers so link-mode replacements and copy-mode mutations are classified consistently

## 3. Add failing install output tests

- [x] 3.1 Add `src/commands/install.test.ts` coverage for install summaries that list non-empty added, updated, and removed groups while keeping no-op output concise
- [x] 3.2 Extend `src/integration.test.ts` to verify `agentdeps install` prints changed managed skill names after an update

## 4. Implement CLI reporting and docs

- [x] 4.1 Update `src/commands/install.ts` to carry detailed change lists through install results and print itemized output for changed targets
- [x] 4.2 Update `README.md` to document the richer install output
- [x] 4.3 Run `bunx tsc --noEmit`, `bun test`, and `bun run build`
