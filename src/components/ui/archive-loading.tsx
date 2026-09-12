"use client";
import { BrandMark } from "@/components/deadfolio/logo";
import { useTranslations } from "@/components/locale";

export default function Loading() {
  const t = useTranslations();
  return (
    <div className="shell page-space archive-loading" role="status">
      <div className="archive-loading-heading">
        <div className="archive-loading-mark" aria-hidden="true">
          <BrandMark className="loading-brand-mark" size={64} />
        </div>
        <div>
          <span className="eyebrow">{t("DEADFOLIO / ARCHIVE")}</span>
          <p className="archive-loading-label">
            {t("Opening the archive")}
            <span aria-hidden="true">…</span>
          </p>
        </div>
        <span className="archive-loading-code mono" aria-hidden="true">
          {t("RETRIEVING STORIES")}{" "}
        </span>
      </div>
      <div className="archive-loading-track" aria-hidden="true">
        <span />
      </div>
      <div className="project-grid" aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="archive-loading-card">
            <div className="skeleton archive-loading-cover" />
            <div className="archive-loading-body">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
