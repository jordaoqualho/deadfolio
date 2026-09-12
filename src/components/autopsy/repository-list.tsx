"use client";
import { ArrowUpRight, GitFork, Microscope, Star } from "lucide-react";
import { LocalLink as Link, useLocale, useTranslations } from "@/components/locale";
import { fill, formatDate, formatSpan, signalLabel } from "@/lib/autopsy/format";
import { repositoryKinds } from "@/lib/schemas/autopsy";
import { trackEvent } from "@/components/analytics";
import type { DiscoveredRepository } from "@/types/autopsy";
import type { ScanSummary as Summary } from "@/lib/github/dead-score";
import { DeadScoreLabel, VerdictBadge } from "./verdict-badge";
import { ScanSummary } from "./scan-summary";

export function RepositoryList({
  login,
  repositories,
  summary,
  truncated,
  limit,
}: {
  login: string;
  repositories: DiscoveredRepository[];
  summary: Summary;
  truncated: boolean;
  limit: number;
}) {
  const t = useTranslations();
  const forgotten = repositories.filter(
    (r) => r.deadScore.classification !== "active",
  );
  const active = repositories.filter(
    (r) => r.deadScore.classification === "active",
  );
  return (
    <section className="repo-results" aria-labelledby="scan-heading">
      <div className="repo-results-heading">
        <span className="eyebrow">
          {t("SCAN RESULTS /")} {login}
        </span>
        <h2 id="scan-heading">
          {forgotten.length > 0 ? (
            <>
              {fill(
                t(
                  forgotten.length === 1
                    ? "{n} repository looks forgotten"
                    : "{n} repositories look forgotten",
                ),
                String(forgotten.length),
              )}
              <span className="accent">.</span>
            </>
          ) : (
            <>
              {t("Everything here still has a pulse")}
              <span className="accent">.</span>
            </>
          )}
        </h2>
        <p className="mono repo-results-meta">
          {fill(t("{n} public repositories scanned"), String(repositories.length))}
          {truncated &&
            ` · ${fill(t("only the {n} most recently pushed are shown"), String(limit))}`}
          {" · "}
          {t("Scores come from GitHub metadata, not AI.")}
        </p>
      </div>
      <ScanSummary summary={summary} />
      {forgotten.length > 0 ? (
        <ul className="repo-list">
          {forgotten.map((repo) => (
            <RepositoryRow key={repo.fullName} repo={repo} />
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <p>
            {t(
              "None of these repositories look abandoned based on their metadata. Come back when one of them stops moving.",
            )}
          </p>
        </div>
      )}
      {active.length > 0 && (
        <details className="repo-active">
          <summary>
            {fill(
              t(
                active.length === 1
                  ? "{n} active repository hidden"
                  : "{n} active repositories hidden",
              ),
              String(active.length),
            )}
          </summary>
          <ul className="repo-list muted-list">
            {active.map((repo) => (
              <RepositoryRow key={repo.fullName} repo={repo} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function RepositoryRow({ repo }: { repo: DiscoveredRepository }) {
  const t = useTranslations();
  const locale = useLocale();
  const score = repo.deadScore;
  const signals = score.signals
    .filter((s) => s.code !== "recent-push" && s.code !== "inactive")
    .slice(0, 3)
    .map((s) => {
      const { key, n } = signalLabel(s);
      const spanCodes = ["short-activity", "old-and-abandoned"];
      return fill(
        t(key),
        n !== undefined && spanCodes.includes(s.code)
          ? formatSpan(Number(n), locale)
          : n,
      );
    });
  return (
    <li className={`repo-row repo-${score.classification}`}>
      <div className="repo-main">
        <div className="repo-title">
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="repo-name"
          >
            {repo.name}
            <ArrowUpRight size={15} />
          </a>
          <VerdictBadge verdict={score.classification} />
          {score.kind !== "project" && (
            <span className="repo-kind mono">{t(repositoryKinds[score.kind])}</span>
          )}
        </div>
        {repo.description && <p className="repo-description">{repo.description}</p>}
        <div className="repo-meta mono">
          {repo.language && <span>{repo.language}</span>}
          <span>
            <Star size={12} aria-hidden="true" /> {repo.stars}
          </span>
          {repo.fork && (
            <span>
              <GitFork size={12} aria-hidden="true" /> {t("fork")}
            </span>
          )}
          <span>
            {t("last push")} {formatDate(repo.pushedAt, locale)}
            {score.daysSincePush > 0 &&
              ` (${fill(t("{n} ago"), formatSpan(score.daysSincePush, locale))})`}
          </span>
          <span>
            {t("age")} {formatSpan(score.ageDays, locale)}
          </span>
        </div>
        <div className="repo-score-row">
          <DeadScoreLabel score={score.score} />
          {signals.length > 0 && (
            <ul className="repo-signals">
              {signals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Link
        href={`/autopsy/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`}
        className={`button ${score.classification === "active" ? "secondary" : "primary"} small autopsy-cta`}
        onClick={() => trackEvent("Autopsy opened")}
      >
        <Microscope size={16} aria-hidden="true" />
        {t("Run Autopsy")}
      </Link>
    </li>
  );
}
