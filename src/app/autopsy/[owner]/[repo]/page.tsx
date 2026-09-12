import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/dictionaries";
import { aiConfigured } from "@/lib/ai/extract-project";
import {
  GitHubError,
  validRepositoryName,
  validUsername,
} from "@/lib/github/client";
import { getRepository as getGitHubRepository } from "@/lib/github/discovery";
import { deadScore } from "@/lib/github/dead-score";
import { lookupAutopsy } from "@/lib/services/autopsy";
import { formatDate } from "@/lib/autopsy/format";
import { LocalLink as Link } from "@/components/locale";
import { VerdictBadge } from "@/components/autopsy/verdict-badge";
import { RunAutopsy } from "@/components/autopsy/run-autopsy";
import type { AutopsyLookup, RepositoryFacts } from "@/types/autopsy";

type Params = Promise<{ owner: string; repo: string }>;

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

export default async function RepositoryAutopsyPage({
  params,
}: {
  params: Params;
}) {
  const { owner, repo } = await params;
  if (!validUsername(owner) || !validRepositoryName(repo)) notFound();
  const t = await getTranslations();
  const locale = await getLocale();

  let facts: RepositoryFacts;
  let lookup: AutopsyLookup | null = null;
  let problem: GitHubError | null = null;
  try {
    facts = await getGitHubRepository(owner, repo);
  } catch (error) {
    if (error instanceof GitHubError && error.kind === "not-found") notFound();
    return (
      <div className="shell page-space">
        <Back owner={owner} />
        <p className="notice" role="alert">
          {t(
            error instanceof GitHubError && error.kind === "rate-limited"
              ? "GitHub is rate-limiting us right now. Try again shortly."
              : "GitHub could not be reached. Try again shortly.",
          )}
        </p>
      </div>
    );
  }
  try {
    lookup = await lookupAutopsy(facts);
  } catch (error) {
    problem =
      error instanceof GitHubError
        ? error
        : new GitHubError("unavailable", "Lookup failed.");
  }
  const score = deadScore(facts);
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
          <VerdictBadge verdict={score.classification} score={score.score} />
        </div>
        {facts.description && <p className="repo-head-description">{facts.description}</p>}
        <div className="repo-meta mono">
          {facts.language && <span>{facts.language}</span>}
          <span>
            {t("last push")} {formatDate(facts.pushedAt, locale)}
          </span>
          <span>
            {t("created")} {formatDate(facts.createdAt, locale)}
          </span>
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
        />
      ) : (
        <p className="notice" role="alert">
          {t(
            problem?.kind === "empty"
              ? "This repository has no commits to examine."
              : problem?.kind === "rate-limited"
                ? "GitHub is rate-limiting us right now. Try again shortly."
                : "GitHub could not be reached. Try again shortly.",
          )}
        </p>
      )}
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
