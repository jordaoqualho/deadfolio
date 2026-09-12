"use client";
import { useState } from "react";
import { useTranslations } from "@/components/locale";
import { SlidersHorizontal } from "lucide-react";
import type { Project } from "@/types/project";
import { statuses, causes, categories } from "@/lib/schemas/project";
import { ProjectGrid } from "./project-card";
export function ProjectFilters({ projects }: { projects: Project[] }) {
  const t = useTranslations();
  const [filters, setFilters] = useState({
    status: "",
    cause: "",
    category: "",
    technology: "",
  });
  const options = {
    status: statuses,
    cause: causes,
    category: categories,
    technology: Object.fromEntries(
      [...new Set(projects.flatMap((p) => p.technologies))]
        .sort()
        .map((t) => [t, t]),
    ),
  };
  const filtered = projects.filter(
    (p) =>
      (!filters.status || p.status === filters.status) &&
      (!filters.cause || p.primaryCauseOfDeath === filters.cause) &&
      (!filters.category || p.category === filters.category) &&
      (!filters.technology || p.technologies.includes(filters.technology)),
  );
  return (
    <>
      <div className="filters">
        <SlidersHorizontal size={18} aria-hidden="true" />
        {(Object.keys(filters) as (keyof typeof filters)[]).map((key) => (
          <label key={key}>
            <span>
              {t(
                key === "cause"
                  ? "Cause of death"
                  : key === "technology"
                    ? "Technology"
                    : key === "category"
                      ? "Category"
                      : "Status",
              )}
            </span>
            <select
              value={filters[key]}
              onChange={(e) =>
                setFilters({ ...filters, [key]: e.target.value })
              }
            >
              <option value="">
                {t(
                  key === "cause"
                    ? "All causes"
                    : key === "technology"
                      ? "All technologies"
                      : key === "category"
                        ? "All categories"
                        : "All statuses",
                )}
              </option>
              {Object.entries(options[key]).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="filter-results mono" aria-live="polite">
        <span>
          {filtered.length} {t(filtered.length === 1 ? "RECORD" : "RECORDS")}
          {t("FOUND")}{" "}
        </span>
        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() =>
              setFilters({
                status: "",
                cause: "",
                category: "",
                technology: "",
              })
            }
          >
            {t("Clear filters ×")}{" "}
          </button>
        )}
      </div>
      {!filtered.length && projects.length ? (
        <div className="empty-state">
          <h2>{t("No projects died this way.")}</h2>
          <p>{t("Try another combination of filters.")}</p>
        </div>
      ) : (
        <ProjectGrid projects={filtered} />
      )}
    </>
  );
}
