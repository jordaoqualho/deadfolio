import "server-only";
import { autopsyLimits } from "@/lib/autopsy/config";
import { repositoryFactsSchema } from "@/lib/schemas/autopsy";
import { getStore } from "@/lib/repositories/store";
import { cached } from "@/lib/repositories/kv-store";
import type { DiscoveredRepository, RepositoryFacts } from "@/types/autopsy";
import { GitHubError, githubRequest, validUsername } from "./client";
import { deadScore } from "./dead-score";

/** Subset of the GitHub REST repository object that discovery relies on. */
export type GitHubRepository = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  license: { spdx_id?: string | null; name?: string | null } | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  default_branch: string;
  created_at: string;
  pushed_at: string | null;
  updated_at: string;
  owner: { login: string };
};

export function toRepositoryFacts(repo: GitHubRepository): RepositoryFacts {
  return repositoryFactsSchema.parse({
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    description: repo.description?.slice(0, 1000) ?? null,
    homepage: repo.homepage?.trim() ? repo.homepage.slice(0, 2048) : null,
    language: repo.language,
    topics: (repo.topics ?? []).slice(0, 30),
    license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION"
      ? repo.license.spdx_id
      : (repo.license?.name ?? null),
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    size: repo.size,
    archived: repo.archived,
    disabled: repo.disabled,
    fork: repo.fork,
    defaultBranch: repo.default_branch,
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
    updatedAt: repo.updated_at,
  });
}

const REPOSITORY_LIST_TTL = 6 * 3600000;
const REPOSITORY_TTL = 30 * 60000;
const BRANCH_TTL = 10 * 60000;

export type Discovery = {
  login: string;
  repositories: DiscoveredRepository[];
  truncated: boolean;
  scannedAt: string;
};

/**
 * Lists up to MAX_REPOSITORIES_PER_SCAN public repositories a user owns and
 * scores each deterministically. Cached per login because most visitors reload
 * or return within the hour.
 */
export async function discoverRepositories(login: string): Promise<Discovery> {
  if (!validUsername(login))
    throw new GitHubError("invalid", "That is not a valid GitHub username.");
  const { maxRepositoriesPerScan } = autopsyLimits();
  const user = login.toLowerCase();
  const facts = await cached(
    getStore(),
    "github-repos",
    `${user}:${maxRepositoriesPerScan}`,
    REPOSITORY_LIST_TTL,
    async () => {
      const collected: RepositoryFacts[] = [];
      let page = 1;
      let truncated = false;
      while (collected.length < maxRepositoriesPerScan) {
        const perPage = Math.min(100, maxRepositoriesPerScan - collected.length);
        const { data } = await githubRequest<GitHubRepository[]>(
          `/users/${encodeURIComponent(login)}/repos?type=owner&sort=pushed&direction=desc&per_page=${perPage}&page=${page}`,
        );
        collected.push(...data.map(toRepositoryFacts));
        if (data.length < perPage) break;
        page++;
        if (collected.length >= maxRepositoriesPerScan) truncated = true;
      }
      return {
        login: collected[0]?.owner ?? login,
        repositories: collected.slice(0, maxRepositoriesPerScan),
        truncated,
        scannedAt: new Date().toISOString(),
      };
    },
  );
  const now = new Date();
  return {
    ...facts,
    repositories: facts.repositories
      .map((repo) => ({ ...repo, deadScore: deadScore(repo, now) }))
      .sort(
        (a, b) =>
          b.deadScore.score - a.deadScore.score ||
          (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""),
      ),
  };
}

export async function getRepository(owner: string, repo: string) {
  return cached(
    getStore(),
    "github-repo",
    `${owner}/${repo}`.toLowerCase(),
    REPOSITORY_TTL,
    async () =>
      toRepositoryFacts(
        (
          await githubRequest<GitHubRepository>(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
          )
        ).data,
      ),
  );
}

/** Commit SHA at the head of the default branch: the autopsy's cache identity. */
export async function getDefaultBranchSha(facts: RepositoryFacts) {
  return cached(
    getStore(),
    "github-branch",
    `${facts.fullName}#${facts.defaultBranch}`.toLowerCase(),
    BRANCH_TTL,
    async () => {
      const result = await githubRequest<{ commit: { sha: string } }>(
        `/repos/${encodeURIComponent(facts.owner)}/${encodeURIComponent(facts.name)}/branches/${encodeURIComponent(facts.defaultBranch)}`,
        { allowNotFound: true },
      );
      if (!result?.data.commit?.sha)
        throw new GitHubError("empty", "This repository has no commits.");
      return result.data.commit.sha.toLowerCase();
    },
  );
}
