"use client";
import { useTranslations } from "@/components/locale";
import { repositoryVerdicts } from "@/lib/schemas/autopsy";
import type { RepositoryVerdict } from "@/types/autopsy";

export function VerdictBadge({
  verdict,
  score,
}: {
  verdict: RepositoryVerdict;
  score?: number;
}) {
  const t = useTranslations();
  return (
    <span className={`verdict verdict-${verdict}`}>
      <i />
      {t(repositoryVerdicts[verdict])}
      {score !== undefined && (
        <span className="verdict-score" aria-label={t("Dead score")}>
          {score}
        </span>
      )}
    </span>
  );
}
