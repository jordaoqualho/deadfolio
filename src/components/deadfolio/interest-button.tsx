"use client";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "@/components/locale";
import { trackEvent } from "@/components/analytics";
export function InterestButton({ url }: { url: string }) {
  const t = useTranslations();
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="button primary"
      onClick={() => trackEvent("Interest in project clicked")}
    >
      {t("I’m interested in this project")} <ArrowUpRight size={18} />
    </a>
  );
}
