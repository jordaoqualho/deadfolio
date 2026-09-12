import "server-only";
import { createHash } from "node:crypto";
import { AUTOPSY_MODEL, autopsyLimits } from "@/lib/autopsy/config";
import { aiConfigured } from "@/lib/ai/extract-project";
import { AutopsyGenerationError, generateAutopsy } from "@/lib/ai/autopsy";
import { collectRepositoryContext } from "@/lib/github/collect";
import { deadScore } from "@/lib/github/dead-score";
import {
  getDefaultBranchSha,
  getRepository as getGitHubRepository,
} from "@/lib/github/discovery";
import { assertRepositoryPath } from "@/lib/github/client";
import { storedAutopsySchema } from "@/lib/schemas/autopsy";
import { getStore } from "@/lib/repositories/store";
import { rateLimit } from "@/lib/security";
import type {
  AutopsyLookup,
  RepositoryFacts,
  StoredAutopsy,
} from "@/types/autopsy";

export class AutopsyServiceError extends Error {
  constructor(
    public readonly kind:
      | "ai-disabled"
      | "daily-limit"
      | "concurrent"
      | "busy"
      | "quota"
      | "transient"
      | "failed",
    message: string,
  ) {
    super(message);
    this.name = "AutopsyServiceError";
  }
}

const AUTOPSIES = "autopsies";
const LATEST = "autopsy-latest";
const QUOTA = "autopsy-quota";
const GLOBAL_PER_HOUR = 40;

export function autopsyKey(owner: string, repo: string, sha: string) {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}/${sha.toLowerCase()}`;
}
const latestKey = (owner: string, repo: string) =>
  `${owner.toLowerCase()}/${repo.toLowerCase()}`;

export async function findAutopsy(key: string) {
  const raw = await getStore().get<unknown>(AUTOPSIES, key);
  if (!raw) return null;
  const parsed = storedAutopsySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function findLatestAutopsy(owner: string, repo: string) {
  const key = await getStore().get<string>(LATEST, latestKey(owner, repo));
  return key ? findAutopsy(key) : null;
}

/** What the page can show before anyone spends AI budget. */
export async function lookupAutopsy(
  facts: RepositoryFacts,
): Promise<AutopsyLookup> {
  const currentSha = await getDefaultBranchSha(facts);
  const current = await findAutopsy(
    autopsyKey(facts.owner, facts.name, currentSha),
  );
  if (current) return { state: "ready", autopsy: current };
  const previous = await findLatestAutopsy(facts.owner, facts.name);
  if (previous) return { state: "outdated", autopsy: previous, currentSha };
  return { state: "none", currentSha };
}

const running = new Map<string, number>();
function quotaKey(client: string) {
  // Daily, salted hash: enough to count, not enough to keep an address book.
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ADMIN_PASSWORD || "deadfolio";
  return `${day}:${createHash("sha256").update(`${salt}:${day}:${client}`).digest("hex").slice(0, 32)}`;
}

/**
 * Returns the cached autopsy for the repository's current default-branch SHA or
 * runs exactly one Gemini generation and stores it under that SHA.
 */
export async function runAutopsy(input: {
  owner: string;
  repo: string;
  locale: "en" | "pt";
  client: string;
}): Promise<{ autopsy: StoredAutopsy; cached: boolean }> {
  assertRepositoryPath(input.owner, input.repo);
  const facts = await getGitHubRepository(input.owner, input.repo);
  const sha = await getDefaultBranchSha(facts);
  const key = autopsyKey(facts.owner, facts.name, sha);
  const existing = await findAutopsy(key);
  if (existing) return { autopsy: existing, cached: true };

  if (!aiConfigured())
    throw new AutopsyServiceError("ai-disabled", "AI is not configured.");
  const limits = autopsyLimits();
  const store = getStore();

  if ((running.get(input.client) ?? 0) >= limits.maxConcurrentAutopsiesPerIp)
    throw new AutopsyServiceError(
      "concurrent",
      "An autopsy is already running for this visitor.",
    );
  if (!rateLimit("autopsy-global", GLOBAL_PER_HOUR))
    throw new AutopsyServiceError("busy", "Autopsy capacity reached.");

  const quota = quotaKey(input.client);
  const used = (await store.get<{ count: number }>(QUOTA, quota))?.count ?? 0;
  if (used >= limits.maxAutopsiesPerIpPerDay)
    throw new AutopsyServiceError("daily-limit", "Daily autopsy limit reached.");

  running.set(input.client, (running.get(input.client) ?? 0) + 1);
  await store.set(QUOTA, quota, { count: used + 1 });
  try {
    // Another request may have finished while we were counting.
    const raced = await findAutopsy(key);
    if (raced) {
      await store.set(QUOTA, quota, { count: used });
      return { autopsy: raced, cached: true };
    }
    const score = deadScore(facts);
    const context = await collectRepositoryContext(facts, sha, score);
    const generated = await generateAutopsy(context, input.locale);
    const autopsy = storedAutopsySchema.parse({
      key,
      owner: facts.owner,
      repo: facts.name,
      sha,
      defaultBranch: facts.defaultBranch,
      locale: input.locale,
      model: AUTOPSY_MODEL,
      createdAt: new Date().toISOString(),
      repository: facts,
      deadScore: score,
      report: generated.report,
      filesAnalyzed: context.files.map((f) => f.path),
      usage: generated.usage,
    } satisfies StoredAutopsy);
    await store.set(AUTOPSIES, key, autopsy);
    await store.set(LATEST, latestKey(facts.owner, facts.name), key);
    return { autopsy, cached: false };
  } catch (error) {
    if (
      error instanceof AutopsyGenerationError &&
      (error.kind === "quota" || error.kind === "transient")
    ) {
      // Provider-side failures should not consume the visitor's daily budget.
      await store.set(QUOTA, quota, { count: used }).catch(() => {});
      throw new AutopsyServiceError(error.kind, error.message);
    }
    if (error instanceof AutopsyGenerationError)
      throw new AutopsyServiceError("failed", error.message);
    throw error;
  } finally {
    const count = (running.get(input.client) ?? 1) - 1;
    if (count <= 0) running.delete(input.client);
    else running.set(input.client, count);
  }
}
