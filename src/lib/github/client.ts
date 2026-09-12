import "server-only";

export class GitHubError extends Error {
  constructor(
    public readonly kind:
      | "not-found"
      | "empty"
      | "rate-limited"
      | "unavailable"
      | "invalid",
    message: string,
    public readonly resetAt?: Date,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

const API = "https://api.github.com";
const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPOSITORY = /^[A-Za-z0-9_.-]{1,100}$/;

export function validUsername(value: string) {
  return USERNAME.test(value);
}
export function validRepositoryName(value: string) {
  return REPOSITORY.test(value) && value !== "." && value !== "..";
}
export function assertRepositoryPath(owner: string, repo: string) {
  if (!validUsername(owner) || !validRepositoryName(repo))
    throw new GitHubError("invalid", "Invalid repository path.");
}

/** Remembers an exhausted quota so the app fails fast instead of burning requests. */
let exhaustedUntil = 0;

function authHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "deadfolio-autopsy",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function readRateLimit(headers: Headers) {
  const remaining = Number(headers.get("x-ratelimit-remaining"));
  const reset = Number(headers.get("x-ratelimit-reset"));
  const retryAfter = Number(headers.get("retry-after"));
  const resetAt = Number.isFinite(reset) && reset > 0 ? reset * 1000 : 0;
  return {
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetAt:
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Date.now() + retryAfter * 1000
        : resetAt,
  };
}

export type GitHubResponse<T> = {
  data: T;
  status: number;
  etag: string | null;
};

/**
 * Server-only GitHub REST call. The token never reaches the browser; callers
 * receive typed `GitHubError`s instead of provider responses.
 */
export async function githubRequest<T>(
  path: string,
  init?: { accept?: string; timeoutMs?: number; allowNotFound?: false },
): Promise<GitHubResponse<T>>;
export async function githubRequest<T>(
  path: string,
  init: { accept?: string; timeoutMs?: number; allowNotFound: true },
): Promise<GitHubResponse<T> | null>;
export async function githubRequest<T>(
  path: string,
  init: { accept?: string; timeoutMs?: number; allowNotFound?: boolean } = {},
): Promise<GitHubResponse<T> | null> {
  if (exhaustedUntil > Date.now())
    throw new GitHubError(
      "rate-limited",
      "GitHub rate limit reached.",
      new Date(exhaustedUntil),
    );
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      headers: {
        ...authHeaders(),
        ...(init.accept ? { Accept: init.accept } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs ?? 15000),
    });
  } catch {
    throw new GitHubError("unavailable", "GitHub could not be reached.");
  }
  const limit = readRateLimit(response.headers);
  if (
    response.status === 429 ||
    (response.status === 403 && limit.remaining === 0)
  ) {
    exhaustedUntil = limit.resetAt || Date.now() + 60000;
    throw new GitHubError(
      "rate-limited",
      "GitHub rate limit reached.",
      new Date(exhaustedUntil),
    );
  }
  if (response.status === 404 || response.status === 451) {
    if (init.allowNotFound) return null;
    throw new GitHubError("not-found", "Not found on GitHub.");
  }
  if (response.status === 403)
    throw new GitHubError("not-found", "This repository is not accessible.");
  if (!response.ok)
    throw new GitHubError("unavailable", `GitHub responded ${response.status}.`);
  const raw = init.accept?.includes("raw")
    ? ((await response.text()) as unknown as T)
    : ((await response.json()) as T);
  return { data: raw, status: response.status, etag: response.headers.get("etag") };
}
