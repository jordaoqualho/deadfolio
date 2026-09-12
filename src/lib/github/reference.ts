const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPOSITORY = /^[A-Za-z0-9_.-]{1,100}$/;

export function validUsername(value: string) {
  return USERNAME.test(value);
}
export function validRepositoryName(value: string) {
  return REPOSITORY.test(value) && value !== "." && value !== "..";
}

/** Accepts a login or a profile URL and returns the bare login, or null. */
export function parseUsername(input: string) {
  const login = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
  return validUsername(login) ? login : null;
}

/**
 * Accepts `https://github.com/owner/repo`, `github.com/owner/repo(.git)`,
 * `owner/repo` and tolerates trailing paths like `/tree/main`.
 */
export function parseRepositoryReference(
  input: string,
): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let path = trimmed;
  if (/^(https?:\/\/|git@|www\.|github\.com)/i.test(trimmed)) {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : trimmed.startsWith("git@")
        ? `https://${trimmed.replace(/^git@/, "").replace(":", "/")}`
        : `https://${trimmed}`;
    try {
      const url = new URL(withScheme);
      if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;
      path = url.pathname;
    } catch {
      return null;
    }
  } else if (/^[a-z]+:\/\//i.test(trimmed)) {
    return null;
  }
  const [owner, rawRepo] = path.replace(/^\/+/, "").split("/");
  const repo = rawRepo?.replace(/\.git$/i, "") ?? "";
  if (!owner || !repo) return null;
  if (!validUsername(owner) || !validRepositoryName(repo)) return null;
  return { owner, repo };
}
