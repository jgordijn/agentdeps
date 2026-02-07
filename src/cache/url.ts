/**
 * URL resolution and cache key derivation for git repositories.
 */

/** Check if a repo string is shorthand (owner/repo pattern) */
export function isShorthand(repo: string): boolean {
  // No protocol prefix, no @, contains exactly one /
  if (repo.includes("://")) return false;
  if (repo.startsWith("git@")) return false;
  const slashes = repo.split("/").length - 1;
  return slashes === 1;
}

/** Expand shorthand to a full git URL based on clone method */
export function expandShorthand(
  repo: string,
  cloneMethod: "ssh" | "https"
): string {
  if (cloneMethod === "ssh") {
    return `git@github.com:${repo}.git`;
  }
  return `https://github.com/${repo}.git`;
}

/** Resolve a repo string to a full git URL */
export function resolveRepoUrl(
  repo: string,
  cloneMethod: "ssh" | "https"
): string {
  if (isShorthand(repo)) {
    return expandShorthand(repo, cloneMethod);
  }
  // Full URL — use as-is
  return repo;
}

/**
 * Derive a cache key from a repo string and ref.
 *
 * Extracts owner/repo from any URL format, strips .git, replaces / with -, appends -<ref>.
 *
 * Examples:
 *   "vercel-labs/agent-skills" + "main" → "vercel-labs-agent-skills-main"
 *   "git@github.com:my-org/skills.git" + "v1.2.0" → "my-org-skills-v1.2.0"
 *   "https://github.com/my-org/skills.git" + "develop" → "my-org-skills-develop"
 */
export function deriveCacheKey(repo: string, ref: string): string {
  let ownerRepo: string;

  if (repo.startsWith("git@")) {
    // git@github.com:owner/repo.git → owner/repo
    const colonIdx = repo.indexOf(":");
    ownerRepo = repo.slice(colonIdx + 1);
  } else if (repo.includes("://")) {
    // https://github.com/owner/repo.git → owner/repo
    try {
      const url = new URL(repo);
      ownerRepo = url.pathname.slice(1); // remove leading /
    } catch {
      ownerRepo = repo;
    }
  } else {
    // Shorthand: owner/repo
    ownerRepo = repo;
  }

  // Strip .git suffix
  if (ownerRepo.endsWith(".git")) {
    ownerRepo = ownerRepo.slice(0, -4);
  }

  // Replace / with -
  const key = ownerRepo.replace(/\//g, "-");

  return `${key}-${ref}`;
}
