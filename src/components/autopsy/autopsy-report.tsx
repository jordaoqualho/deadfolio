"use client";
import type { ReactNode } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale";
import {
  differentiations,
  problemQualities,
  revivalVerdicts,
} from "@/lib/schemas/autopsy";
import { fill, formatDate, formatSpan } from "@/lib/autopsy/format";
import type { StoredAutopsy } from "@/types/autopsy";
import { DeadScoreLabel, VerdictBadge } from "./verdict-badge";

export function AutopsyReport({
  autopsy,
  children,
}: {
  autopsy: StoredAutopsy;
  children?: ReactNode;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { report: r, repository: repo, deadScore } = autopsy;
  const scores = (
    [
      ["Architecture", r.technicalCondition.architectureScore],
      ["Maintainability", r.technicalCondition.maintainabilityScore],
      ["Completeness", r.technicalCondition.completenessScore],
      ["Documentation", r.technicalCondition.documentationScore],
    ] as [string, number | null][]
  ).filter((entry): entry is [string, number] => entry[1] !== null);
  return (
    <article className="autopsy report">
      <header className="autopsy-header">
        <div className="eyebrow">
          {t("REPOSITORY AUTOPSY /")} {repo.fullName} @ {autopsy.sha.slice(0, 7)}
        </div>
        <h2 className="report-title">
          {t("Repository Autopsy")}
          <span className="accent">.</span>
        </h2>
        <div className="autopsy-byline">
          <VerdictBadge verdict={r.repositoryStatus.verdict} />
          <span>{t(`${r.repositoryStatus.confidence} confidence`)}</span>
          <span>
            {t("Generated")} {formatDate(autopsy.createdAt, locale)} ·{" "}
            {autopsy.model} ·{" "}
            {fill(t("{n} files analyzed"), String(autopsy.filesAnalyzed.length))}
          </span>
        </div>
        {autopsy.locale !== locale && (
          <p className="report-language mono">
            {t(
              autopsy.locale === "pt"
                ? "This report was generated in Portuguese for an earlier visitor."
                : "This report was generated in English for an earlier visitor.",
            )}
          </p>
        )}
      </header>
      <div className="autopsy-layout">
        <aside className="project-facts">
          <span className="eyebrow">{t("THE RECORD")}</span>
          <dl>
            {(
              [
                ["Primary language", repo.language ?? ""],
                ["Stars", String(repo.stars)],
                ["Created", formatDate(repo.createdAt, locale)],
                ["Last push", formatDate(repo.pushedAt, locale)],
                ["License", repo.license ?? ""],
                ["Default branch", repo.defaultBranch],
              ] as [string, string][]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{t(k)}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {r.technologies.length > 0 && (
            <>
              <h2 className="eyebrow">{t("TECHNOLOGY")}</h2>
              <div className="tags">
                {r.technologies.map((tech) => (
                  <span key={tech}>{tech}</span>
                ))}
              </div>
            </>
          )}
          <div className="external-links">
            <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer nofollow">
              GitHub <ArrowUpRight size={15} />
            </a>
            {repo.homepage && /^https?:\/\//i.test(repo.homepage) && (
              <a
                href={repo.homepage}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {t("website")} <ArrowUpRight size={15} />
              </a>
            )}
          </div>
          {autopsy.filesAnalyzed.length > 0 && (
            <details className="files-analyzed">
              <summary className="eyebrow">{t("FILES ANALYZED")}</summary>
              <ul className="mono">
                {autopsy.filesAnalyzed.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </details>
          )}
        </aside>
        <div className="autopsy-story">
          <section>
            <span className="section-number">{t("01 / VERDICT")}</span>
            <h2>{t("Verdict")}</h2>
            <p className="lead verdict-line">
              <VerdictBadge verdict={r.repositoryStatus.verdict} />
            </p>
            <div className="verdict-facts mono">
              <DeadScoreLabel score={deadScore.score} />
              <span>
                {t("Last meaningful activity:")}{" "}
                {deadScore.daysSincePush < 1
                  ? t("today")
                  : fill(t("{n} ago"), formatSpan(deadScore.daysSincePush, locale))}
              </span>
            </div>
            <EvidenceList items={r.repositoryStatus.evidence} label={t("Evidence")} />
          </section>
          <section>
            <span className="section-number">{t("02 / THE OBJECT")}</span>
            <h2>{t("What Was This?")}</h2>
            <p className="lead">{r.projectSummary}</p>
            <ContentList items={r.whatWasBuilt} empty={t("Nothing observable was documented.")} />
          </section>
          <section>
            <span className="section-number">{t("03 / THE PRODUCT")}</span>
            <h2>{t("Product Assessment")}</h2>
            <p className="assessment-verdict mono">
              {t(problemQualities[r.productAssessment.problemQuality])} /{" "}
              {t(differentiations[r.productAssessment.differentiation])}
            </p>
            <p>{r.productAssessment.explanation}</p>
          </section>
          <section>
            <span className="section-number">{t("04 / THE CODE")}</span>
            <h2>{t("Technical Condition")}</h2>
            <div className="score-grid">
              <ScoreBar label={t("Overall")} value={r.technicalCondition.overallScore} primary />
              {scores.map(([label, value]) => (
                <ScoreBar key={label} label={t(label)} value={value} />
              ))}
            </div>
            {scores.length < 4 && (
              <p className="muted small-print">
                {t("Sub-scores are shown only where the repository gives enough evidence to support them.")}
              </p>
            )}
            <p>{r.technicalCondition.explanation}</p>
          </section>
          <section>
            <span className="section-number">{t("05 / THE GOOD")}</span>
            <h2>{t("What Was Good")}</h2>
            <ContentList items={r.strengths} empty={t("No clear strengths could be supported by evidence.")} />
          </section>
          <section>
            <span className="section-number">{t("06 / THE BAD")}</span>
            <h2>{t("What Looks Wrong")}</h2>
            <ContentList items={r.weaknesses} empty={t("No clear weaknesses could be supported by evidence.")} />
          </section>
          <section className="cause-block">
            <div className="cause-heading">
              <span className="section-number">{t("07 / THE END")}</span>
              <Plus size={26} />
            </div>
            <h2>{t("Possible Cause of Death")}</h2>
            <p className="inference-label mono">{t("INFERENCE, NOT EVIDENCE")}</p>
            {r.likelyCausesOfDeath.length ? (
              <ol className="cause-list">
                {r.likelyCausesOfDeath.map((c, i) => (
                  <li key={i}>
                    <div className="cause-title">
                      <strong>{c.cause}</strong>
                      <span className={`confidence confidence-${c.confidence}`}>
                        {t(`${c.confidence} confidence`)}
                      </span>
                    </div>
                    <p>{c.explanation}</p>
                    <EvidenceList items={c.evidence} label={t("Evidence")} />
                  </li>
                ))}
              </ol>
            ) : (
              <>
                <strong>{t("Unknown")}</strong>
                <p>
                  {t(
                    "The repository does not establish why development stopped. Only the creator can answer that.",
                  )}
                </p>
              </>
            )}
            <p className="cause-disclaimer mono">
              {t(
                "Inferred from repository evidence. Business outcomes and the creator's reasons are not observable here.",
              )}
            </p>
          </section>
          <section>
            <span className="section-number">{t("08 / THE REMAINS")}</span>
            <h2>{t("What Survived")}</h2>
            <ContentList items={r.survivingAssets} empty={t("Nothing was left behind.")} />
          </section>
          <section>
            <span className="section-number">{t("09 / THE FUTURE")}</span>
            <h2>{t("Revival Potential")}</h2>
            <div className="score-grid">
              <ScoreBar label={t("Revival potential")} value={r.revivalPotential.score} primary />
            </div>
            <p className="assessment-verdict mono">
              {t(revivalVerdicts[r.revivalPotential.verdict])}
            </p>
            <p className="lead">{r.revivalPotential.explanation}</p>
            {r.revivalPotential.suggestedDirection && (
              <p>
                <strong>{t("One direction:")}</strong>{" "}
                {r.revivalPotential.suggestedDirection}
              </p>
            )}
          </section>
          <section className="unknowns-block">
            <span className="section-number">{t("10 / THE GAPS")}</span>
            <h2>{t("What We Cannot Know")}</h2>
            <ContentList
              items={r.unknowns}
              empty={t(
                "Users, revenue, the creator’s motivation and the real reason development stopped cannot be determined from the repository.",
              )}
            />
          </section>
          {children}
        </div>
      </div>
    </article>
  );
}

function ScoreBar({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: number;
  primary?: boolean;
}) {
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return (
    <div className={`score-bar${primary ? " primary-score" : ""}`}>
      <div className="score-label">
        <span>{label}</span>
        <span className="mono">{shown} / 10</span>
      </div>
      <div
        className="score-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
        aria-label={label}
      >
        <span style={{ width: `${value * 10}%` }} />
      </div>
    </div>
  );
}

function ContentList({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul className="story-list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  ) : (
    <p className="muted">{empty}</p>
  );
}

function EvidenceList({ items, label }: { items: string[]; label: string }) {
  if (!items.length) return null;
  return (
    <div className="evidence">
      <span className="eyebrow">{label}</span>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
