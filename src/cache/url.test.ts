/**
 * Unit tests for URL resolution and cache key derivation.
 */
import { describe, it, expect } from "bun:test";
import {
  isShorthand,
  expandShorthand,
  resolveRepoUrl,
  deriveCacheKey,
} from "./url.ts";

describe("isShorthand", () => {
  it("detects owner/repo pattern", () => {
    expect(isShorthand("my-org/my-repo")).toBe(true);
    expect(isShorthand("vercel-labs/agent-skills")).toBe(true);
  });

  it("rejects HTTPS URLs", () => {
    expect(isShorthand("https://github.com/my-org/my-repo.git")).toBe(false);
  });

  it("rejects SSH URLs", () => {
    expect(isShorthand("git@github.com:my-org/my-repo.git")).toBe(false);
  });

  it("rejects paths with multiple slashes", () => {
    expect(isShorthand("a/b/c")).toBe(false);
  });

  it("rejects paths with no slash", () => {
    expect(isShorthand("my-repo")).toBe(false);
  });
});

describe("expandShorthand", () => {
  it("expands to SSH URL", () => {
    expect(expandShorthand("my-org/my-repo", "ssh")).toBe(
      "git@github.com:my-org/my-repo.git"
    );
  });

  it("expands to HTTPS URL", () => {
    expect(expandShorthand("my-org/my-repo", "https")).toBe(
      "https://github.com/my-org/my-repo.git"
    );
  });
});

describe("resolveRepoUrl", () => {
  it("expands shorthand with SSH", () => {
    expect(resolveRepoUrl("my-org/my-repo", "ssh")).toBe(
      "git@github.com:my-org/my-repo.git"
    );
  });

  it("expands shorthand with HTTPS", () => {
    expect(resolveRepoUrl("my-org/my-repo", "https")).toBe(
      "https://github.com/my-org/my-repo.git"
    );
  });

  it("passes through full SSH URL", () => {
    const url = "git@github.com:my-org/my-repo.git";
    expect(resolveRepoUrl(url, "https")).toBe(url);
  });

  it("passes through full HTTPS URL", () => {
    const url = "https://github.com/my-org/my-repo.git";
    expect(resolveRepoUrl(url, "ssh")).toBe(url);
  });
});

describe("deriveCacheKey", () => {
  it("derives from shorthand", () => {
    expect(deriveCacheKey("vercel-labs/agent-skills", "main")).toBe(
      "vercel-labs-agent-skills-main"
    );
  });

  it("derives from SSH URL", () => {
    expect(deriveCacheKey("git@github.com:my-org/skills.git", "v1.2.0")).toBe(
      "my-org-skills-v1.2.0"
    );
  });

  it("derives from HTTPS URL", () => {
    expect(
      deriveCacheKey("https://github.com/my-org/skills.git", "develop")
    ).toBe("my-org-skills-develop");
  });

  it("strips .git suffix", () => {
    expect(deriveCacheKey("my-org/skills.git", "main")).toBe(
      "my-org-skills-main"
    );
  });

  it("handles GitLab SSH URL", () => {
    expect(
      deriveCacheKey("git@gitlab.com:my-org/my-skills.git", "main")
    ).toBe("my-org-my-skills-main");
  });
});
