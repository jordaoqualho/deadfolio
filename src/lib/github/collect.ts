import "server-only";
import { autopsyLimits, estimateTokens } from "@/lib/autopsy/config";
import type { DeadScore, RepositoryFacts } from "@/types/autopsy";
import { githubRequest } from "./client";
import {
  looksBinary,
  scrubSecrets,
  selectFiles,
  truncateText,
  type TreeEntry,
} from "./file-selection";

export type CollectedFile = { path: string; content: string; truncated: boolean };
export type RecentCommit = { date: string; message: string; author: string };
export type RepositoryContext = {
  facts: RepositoryFacts;
  sha: string;
  deadScore: DeadScore;
  languages: Record<string, number>;
  readme: { text: string; truncated: boolean } | null;
  tree: { paths: string[]; total: number; truncated: boolean };
  commits: {
    recent: RecentCommit[];
    distinctAuthors: number;
    oldestSampledAt: string | null;
  };
  releases: { tag: string; name: string | null; publishedAt: string | null }[];
  files: CollectedFile[];
  estimatedInputTokens: number;
};

const RAW = "application/vnd.github.raw+json";
const README_CHAR_CAP = 24000;
const FILE_CHAR_CAP = 12000;
const TREE_PATH_CAP = 350;

function repoPath(facts: RepositoryFacts, suffix: string) {
  return `/repos/${encodeURIComponent(facts.owner)}/${encodeURIComponent(facts.name)}${suffix}`;
}

async function optional<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    // Secondary signals must never block an autopsy; only rate limits propagate.
    if ((error as { kind?: string }).kind === "rate-limited") throw error;
    return fallback;
  }
}

async function fetchFile(facts: RepositoryFacts, sha: string, path: string) {
  const result = await githubRequest<string>(
    repoPath(
      facts,
      `/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${sha}`,
    ),
    { accept: RAW, allowNotFound: true, timeoutMs: 12000 },
  );
  if (!result || typeof result.data !== "string") return null;
  if (looksBinary(result.data)) return null;
  const scrubbed = scrubSecrets(result.data);
  if (scrubbed === null) return null;
  const { text, truncated } = truncateText(scrubbed, FILE_CHAR_CAP);
  return { path, content: text, truncated } satisfies CollectedFile;
}

/**
 * Gathers the evidence one Gemini call will see. Everything is public, secrets
 * are filtered at path and content level, and the total stays under the input
 * budget so a single request cannot balloon the bill.
 */
export async function collectRepositoryContext(
  facts: RepositoryFacts,
  sha: string,
  deadScore: DeadScore,
): Promise<RepositoryContext> {
  const { maxAutopsyFiles, maxAutopsyInputTokens } = autopsyLimits();
  const [languages, readmeRaw, tree, commitsRaw, releasesRaw] =
    await Promise.all([
      optional(
        async () =>
          (await githubRequest<Record<string, number>>(repoPath(facts, "/languages")))
            .data,
        {} as Record<string, number>,
      ),
      optional(
        async () =>
          (
            await githubRequest<string>(repoPath(facts, `/readme?ref=${sha}`), {
              accept: RAW,
              allowNotFound: true,
            })
          )?.data ?? null,
        null as string | null,
      ),
      optional(
        async () =>
          (
            await githubRequest<{ tree: TreeEntry[]; truncated: boolean }>(
              repoPath(facts, `/git/trees/${sha}?recursive=1`),
              { timeoutMs: 20000 },
            )
          ).data,
        { tree: [] as TreeEntry[], truncated: false },
      ),
      optional(
        async () =>
          (
            await githubRequest<
              {
                commit: {
                  author: { date: string; name: string } | null;
                  message: string;
                };
                author: { login: string } | null;
              }[]
            >(repoPath(facts, `/commits?sha=${sha}&per_page=30`))
          ).data,
        [],
      ),
      optional(
        async () =>
          (
            await githubRequest<
              { tag_name: string; name: string | null; published_at: string | null }[]
            >(repoPath(facts, "/releases?per_page=5"))
          ).data,
        [],
      ),
    ]);

  const readme = (() => {
    if (typeof readmeRaw !== "string" || looksBinary(readmeRaw)) return null;
    const scrubbed = scrubSecrets(readmeRaw);
    return scrubbed === null ? null : truncateText(scrubbed, README_CHAR_CAP);
  })();

  const blobs = tree.tree.filter((e) => e.type === "blob");
  const selected = selectFiles(blobs, maxAutopsyFiles);
  const files = (
    await Promise.all(
      selected.map((path) =>
        optional(() => fetchFile(facts, sha, path), null as CollectedFile | null),
      ),
    )
  ).filter((f): f is CollectedFile => f !== null);

  const authors = new Set<string>();
  const recent: RecentCommit[] = commitsRaw.map((c) => {
    const author = c.author?.login ?? c.commit.author?.name ?? "unknown";
    authors.add(author);
    return {
      date: c.commit.author?.date ?? "",
      message: c.commit.message.split("\n")[0].slice(0, 120),
      author,
    };
  });

  const context: RepositoryContext = {
    facts,
    sha,
    deadScore,
    languages,
    readme,
    tree: {
      paths: blobs.map((e) => e.path).slice(0, TREE_PATH_CAP),
      total: blobs.length,
      truncated: tree.truncated || blobs.length > TREE_PATH_CAP,
    },
    commits: {
      recent,
      distinctAuthors: authors.size,
      oldestSampledAt: recent.at(-1)?.date ?? null,
    },
    releases: releasesRaw.slice(0, 5).map((r) => ({
      tag: r.tag_name.slice(0, 60),
      name: r.name?.slice(0, 120) ?? null,
      publishedAt: r.published_at,
    })),
    files,
    estimatedInputTokens: 0,
  };
  return fitToBudget(context, maxAutopsyInputTokens);
}

/** Drops the lowest-priority evidence first: trailing files, then README tail, then tree. */
function fitToBudget(context: RepositoryContext, budget: number) {
  const reserve = 2500; // system prompt + instructions
  const measure = () => estimateTokens(renderContext(context)) + reserve;
  context.estimatedInputTokens = measure();
  while (context.estimatedInputTokens > budget && context.files.length > 0) {
    context.files.pop();
    context.estimatedInputTokens = measure();
  }
  if (context.estimatedInputTokens > budget && context.readme) {
    context.readme = truncateText(context.readme.text, 6000);
    context.estimatedInputTokens = measure();
  }
  if (context.estimatedInputTokens > budget) {
    context.tree = {
      ...context.tree,
      paths: context.tree.paths.slice(0, 80),
      truncated: true,
    };
    context.estimatedInputTokens = measure();
  }
  return context;
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "unknown");

/** Plain-text rendering handed to the model as untrusted evidence. */
export function renderContext(c: RepositoryContext) {
  const f = c.facts;
  const languages = Object.entries(c.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const totalBytes = languages.reduce((s, [, b]) => s + b, 0) || 1;
  const parts = [
    `# REPOSITORY METADATA (from GitHub API)`,
    `full_name: ${f.fullName}`,
    `url: ${f.htmlUrl}`,
    `description: ${f.description ?? "(none)"}`,
    `homepage: ${f.homepage ?? "(none)"}`,
    `topics: ${f.topics.join(", ") || "(none)"}`,
    `license: ${f.license ?? "(none)"}`,
    `primary_language: ${f.language ?? "(unknown)"}`,
    `stars: ${f.stars}  forks: ${f.forks}  open_issues_and_prs: ${f.openIssues}`,
    `archived: ${f.archived}  disabled: ${f.disabled}  is_fork: ${f.fork}`,
    `created_at: ${day(f.createdAt)}  last_push: ${day(f.pushedAt)}  default_branch: ${f.defaultBranch}  head_sha: ${c.sha.slice(0, 12)}`,
    `deterministic_status_from_metadata: ${c.deadScore.classification} (dead score ${c.deadScore.score}/100; signals: ${c.deadScore.signals.map((s) => (s.value !== undefined ? `${s.code}=${s.value}` : s.code)).join(", ")})`,
    ``,
    `# LANGUAGES (bytes)`,
    languages.length
      ? languages
          .map(([l, b]) => `${l}: ${Math.round((b / totalBytes) * 100)}%`)
          .join(", ")
      : "(unavailable)",
    ``,
    `# RECENT ACTIVITY (last ${c.commits.recent.length} commits sampled, ${c.commits.distinctAuthors} distinct authors, oldest sampled ${day(c.commits.oldestSampledAt)})`,
    ...c.commits.recent
      .slice(0, 30)
      .map((k) => `${day(k.date)} ${k.author}: ${k.message}`),
    ``,
    `# RELEASES (${c.releases.length ? "latest first" : "none"})`,
    ...c.releases.map((r) => `${r.tag} ${r.name ?? ""} ${day(r.publishedAt)}`),
    ``,
    `# FILE TREE (${c.tree.total} files${c.tree.truncated ? ", listing truncated" : ""})`,
    ...c.tree.paths,
    ``,
    `# README${c.readme ? (c.readme.truncated ? " (truncated)" : "") : " (none)"}`,
    c.readme?.text ?? "",
    ``,
    `# SELECTED FILES (${c.files.length})`,
    ...c.files.flatMap((file) => [
      `--- FILE: ${file.path}${file.truncated ? " (truncated)" : ""} ---`,
      file.content,
      `--- END FILE ---`,
    ]),
  ];
  return parts.join("\n");
}
