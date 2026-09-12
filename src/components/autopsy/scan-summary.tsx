"use client";
import { useLocale, useTranslations } from "@/components/locale";
import { lifeStatuses, type RepositoryLifeStatus } from "@/lib/schemas/autopsy";
import { fill, formatSpan } from "@/lib/autopsy/format";
import type { ScanSummary as Summary } from "@/lib/github/dead-score";

const ORDER: RepositoryLifeStatus[] = [
  "active",
  "stale",
  "possibly-abandoned",
  "probably-abandoned",
  "likely-dead",
  "archived",
];

/** Plain counts, computed from metadata before any AI runs. */
export function ScanSummary({ summary }: { summary: Summary }) {
  const t = useTranslations();
  const locale = useLocale();
  const insights: [string, string][] = [];
  if (summary.oldestUntouched)
    insights.push([
      "Oldest untouched project",
      `${summary.oldestUntouched.name} · ${fill(t("no pushes for {n}"), formatSpan(summary.oldestUntouched.daysSincePush, locale))}`,
    ]);
  if (summary.mostRecentlyAbandoned)
    insights.push([
      "Most recently abandoned candidate",
      `${summary.mostRecentlyAbandoned.name} · ${fill(t("no pushes for {n}"), formatSpan(summary.mostRecentlyAbandoned.daysSincePush, locale))}`,
    ]);
  if (summary.averageAgeDays !== null)
    insights.push([
      "Average repository age",
      formatSpan(summary.averageAgeDays, locale),
    ]);
  insights.push([
    "Untouched for a year or more",
    String(summary.untouchedForAYear),
  ]);
  return (
    <section className="scan-summary" aria-label={t("Scan summary")}>
      <div className="scan-total">
        <strong>{summary.total}</strong>
        <span>{t("repositories analyzed")}</span>
      </div>
      <ul className="scan-counts mono">
        {ORDER.filter((status) => summary.byStatus[status] > 0).map(
          (status) => (
            <li key={status} className={`verdict-${status}`}>
              <strong>{summary.byStatus[status]}</strong>
              <span>{t(lifeStatuses[status]).toUpperCase()}</span>
            </li>
          ),
        )}
        {summary.experiments > 0 && (
          <li
            className="kind-experiment"
            title={t(
              "Experiments: all pushes happened within a week of creation and the repository has at most one star.",
            )}
          >
            <strong>{summary.experiments}</strong>
            <span>{t("EXPERIMENTS")}</span>
          </li>
        )}
        {summary.forks > 0 && (
          <li className="kind-fork">
            <strong>{summary.forks}</strong>
            <span>{t("FORKS")}</span>
          </li>
        )}
      </ul>
      <dl className="scan-insights">
        {insights.map(([label, value]) => (
          <div key={label}>
            <dt>{t(label)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="privacy-note">
        {t(
          "Counts come from public GitHub metadata only. “Untouched” means no push; it says nothing about whether the project succeeded.",
        )}
      </p>
    </section>
  );
}
