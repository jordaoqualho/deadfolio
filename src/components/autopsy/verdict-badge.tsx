"use client";
import { useTranslations } from "@/components/locale";
import { lifeStatuses, type RepositoryLifeStatus } from "@/lib/schemas/autopsy";

export const DEAD_SCORE_HINT =
  "Based on inactivity, repository age, archive status and recent development signals.";

export function VerdictBadge({ verdict }: { verdict: RepositoryLifeStatus }) {
  const t = useTranslations();
  return (
    <span className={`verdict verdict-${verdict}`}>
      <i />
      {t(lifeStatuses[verdict])}
    </span>
  );
}

/** Always "N / 100", never a percentage: the score is a heuristic, not a probability. */
export function DeadScoreLabel({ score }: { score: number }) {
  const t = useTranslations();
  return (
    <span className="dead-score mono" title={t(DEAD_SCORE_HINT)}>
      {t("Dead Score")}: <strong>{score}</strong> / 100
    </span>
  );
}
