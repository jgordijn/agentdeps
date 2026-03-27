## ADDED Requirements

### Requirement: Managed sync classifies item outcomes
The tool SHALL classify each top-level managed skill or agent as added, updated, removed, or unchanged during sync so install reporting can describe concrete item changes.

#### Scenario: First install is classified as added
- **WHEN** a desired managed skill or agent does not yet exist in `_agentdeps_managed/`
- **THEN** the sync result classifies that item as added

#### Scenario: Replaced symlink is classified as updated
- **WHEN** link-mode install finds an existing managed symlink that points to a different target than the desired cached item
- **THEN** the sync result classifies that item as updated

#### Scenario: Copy sync mutations are classified as updated
- **WHEN** copy-mode install finds an existing managed item and smart sync overwrites, creates, or removes nested files or directories while reconciling it with the source
- **THEN** the sync result classifies that item as updated

#### Scenario: Pruned item is classified as removed
- **WHEN** an item exists in `_agentdeps_managed/` but is no longer part of the desired managed set
- **THEN** the sync result classifies that item as removed

#### Scenario: Matching item is classified as unchanged
- **WHEN** an existing managed item already matches the desired source without any filesystem mutations
- **THEN** the sync result classifies that item as unchanged
