"use client";
import { useTranslations } from "@/components/locale";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations();
  return (
    <div className="shell page-space empty-state">
      <h1>{t("The archive couldn’t be opened.")}</h1>
      <p>{t("Something went wrong loading this page. Please try again.")}</p>
      <button className="button primary" onClick={reset}>
        {t("Try again")}{" "}
      </button>
    </div>
  );
}
