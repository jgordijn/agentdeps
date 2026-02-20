/**
 * Legacy path migration — cleans up _agentdeps_managed/ directories
 * at old project paths for agents that have migrated to .agents/.
 */
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { getLegacyProjectPaths } from "../registry/registry.ts";

const MANAGED_DIR = "_agentdeps_managed";

/**
 * Remove _agentdeps_managed/ directories at legacy project paths
 * for configured agents that have migrated to the universal .agents/ convention.
 *
 * Only removes the managed subdirectory, never the parent directory.
 * Silently skips paths that don't exist.
 */
export async function cleanupLegacyManagedDirs(agentNames: readonly string[]): Promise<void> {
  const legacyPaths = getLegacyProjectPaths(agentNames);

  for (const { skills, agents } of legacyPaths) {
    await rm(join(skills, MANAGED_DIR), { recursive: true, force: true });
    await rm(join(agents, MANAGED_DIR), { recursive: true, force: true });
  }
}
