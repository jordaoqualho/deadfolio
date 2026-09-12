import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/dictionaries";
import { aiConfigured } from "@/lib/ai/config";
import { GitHubError } from "@/lib/github/client";
import { validRepositoryName, validUsername } from "@/lib/github/reference";
import { getRepository as getGitHubRepository } from "@/lib/github/discovery";
import { calculateDeadScore } from "@/lib/github/dead-score";
import { lookupAutopsy } from "@/lib/services/autopsy";
import { formatDate, formatSpan } from "@/lib/autopsy/format";
import { LocalLink as Link } from "@/components/locale";
import {
  DeadScoreLabel,
  VerdictBadge,
} from "@/components/autopsy/verdict-badge";
import { RunAutopsy } from "@/components/autopsy/run-autopsy";
import type { AutopsyLookup, RepositoryFacts } from "@/types/autopsy";

type Params = Promise<{ owner: string; repo: string }>;
type Search = Promise<{ run?: string | string[] }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { owner, repo } = await params;
  const locale = await getLocale();
  return pageMetadata(
    `/autopsy/${owner}/${repo}`,
    `${owner}/${repo} — ${translate(locale, "Repository Autopsy")}`,
    "An evidence-based postmortem of a public GitHub repository.",
  );
}
export const dynamic = "force-dynamic";

/** Visitor-facing copy for GitHub failures. Provider messages never leak. */
function githubProblem(error: unknown) {
  const kind = error instanceof GitHubError ? error.kind : "unavailable";
  switch (kind) {
    case "not-found":
      return "Repository not found. Check the owner and name, and make sure the repository is public.";
    case "private":
      return "This repository does not appear to be public.";
    case "invalid":
      return "That doesn’t look like a GitHub repository URL.";
    case "empty":
      return "This repository has no commits to examine.";
    case "rate-limited":
      return "GitHub is rate-limiting us right now. Try again shortly.";
    default:
      return "GitHub could not be reached. Try again shortly.";
  }
}

export default async function RepositoryAutopsyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { owner, repo } = await params;
  const run = (await searchParams).run;
  const autorun = (Array.isArray(run) ? run[0] : run) === "1";
  const t = await getTranslations();
  const locale = await getLocale();

  if (!validUsername(owner) || !validRepositoryName(repo))
    return <Problem message={t(githubProblem(new GitHubError("invalid", "")))} />;

  let facts: RepositoryFacts;
  try {
    facts = await getGitHubRepository(owner, repo);
  } catch (error) {
    return <Problem message={t(githubProblem(error))} owner={owner} />;
  }
  let lookup: AutopsyLookup | null = null;
  let problem: string | null = null;
  try {
    lookup = await lookupAutopsy(facts);
  } catch (error) {
    problem = githubProblem(error);
  }
  const score = calculateDeadScore(facts);
  return (
    <div className="shell page-space repo-autopsy-page">
      <Back owner={facts.owner} />
      <header className="repo-head">
        <span className="eyebrow">
          {t("REPOSITORY /")} {facts.fullName}
        </span>
        <div className="repo-head-row">
          <h1>
            {facts.name}
            <span className="accent">.</span>
          </h1>
          <VerdictBadge verdict={score.classification} />
        </div>
        {facts.description && <p className="repo-head-description">{facts.description}</p>}
        <div className="repo-meta mono">
          {facts.language && <span>{facts.language}</span>}
          <span>
            {t("last push")} {formatDate(facts.pushedAt, locale)}
          </span>
          <span>
            {t("age")} {formatSpan(score.ageDays, locale)}
          </span>
          <DeadScoreLabel score={score.score} />
          <a href={facts.htmlUrl} target="_blank" rel="noopener noreferrer nofollow">
            GitHub <ArrowUpRight size={13} />
          </a>
        </div>
        {score.classification === "active" && (
          <p className="notice">
            {t(
              "This repository looks active. An autopsy is still possible, but it will read as a check-up rather than a postmortem.",
            )}
          </p>
        )}
      </header>
      {lookup ? (
        <RunAutopsy
          owner={facts.owner}
          repo={facts.name}
          lookup={lookup}
          aiEnabled={aiConfigured()}
          autorun={autorun}
        />
      ) : (
        <p className="notice" role="alert">
          {t(problem ?? "GitHub could not be reached. Try again shortly.")}
        </p>
      )}
    </div>
  );
}

async function Problem({ message, owner }: { message: string; owner?: string }) {
  const t = await getTranslations();
  return (
    <div className="shell page-space">
      {owner ? (
        <Back owner={owner} />
      ) : (
        <Link href="/autopsy?mode=repo" className="back-link">
          <ArrowLeft size={16} />
          {t("Back to the autopsy")}
        </Link>
      )}
      <p className="notice" role="alert">
        {message}
      </p>
    </div>
  );
}

async function Back({ owner }: { owner: string }) {
  const t = await getTranslations();
  return (
    <Link href={`/autopsy?user=${encodeURIComponent(owner)}`} className="back-link">
      <ArrowLeft size={16} />
      {t("Back to the scan")}
    </Link>
  );
}
