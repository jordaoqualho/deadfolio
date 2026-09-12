"use client";
import { LocalLink as Link } from "@/components/locale";
import { useTranslations } from "@/components/locale";
import { ArrowUpRight, ArrowRight, Plus } from "lucide-react";
import type { Project } from "@/types/project";
import { Reveal } from "@/components/ui/reveal";
import {
  statuses,
  categories,
  causes,
  stages,
  nextSteps,
} from "@/lib/schemas/project";
export function ProjectCard({
  project: p,
  index = 0,
}: {
  project: Project;
  index?: number;
}) {
  const t = useTranslations();
  return (
    <article className="project-card">
      <Link
        href={`/projects/${p.slug}`}
        className={`card-cover cover-${index % 2}`}
        aria-label={`${t("Read project postmortem")}: ${p.title}`}
      >
        <span className="mono record-code">
          {t("PROJECT ARCHIVE /")} {String(index + 1).padStart(3, "0")}
        </span>
        <span className="cover-title">
          {p.title}
          <span>_</span>
        </span>
        <Plus className="cover-plus" size={40} strokeWidth={1} />
        <span className="cover-caption mono">
          {t(stages[p.stage])}
          <ArrowUpRight size={18} />
        </span>
        {p.isDemo && <span className="demo-label">{t("SAMPLE PROJECT")}</span>}
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span className={`status status-${p.status}`}>
            <i />
            {t(statuses[p.status])}
          </span>
          <span>{t(categories[p.category])}</span>
        </div>
        <h3>
          <Link href={`/projects/${p.slug}`}>{p.title}</Link>
        </h3>
        <p className="card-tagline">{p.tagline}</p>
        <div className="card-cause">
          <span className="eyebrow">{t("Cause of death")}</span>
          <strong>{t(causes[p.primaryCauseOfDeath])}</strong>
        </div>
        <div className="tags">
          {p.developmentDuration && <span>{p.developmentDuration}</span>}
          {p.technologies.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="card-bottom">
          <span>{t(nextSteps[p.desiredNextSteps[0]])}</span>
          <Link href={`/projects/${p.slug}`}>
            {t("Read the autopsy")} <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function ProjectGrid({ projects }: { projects: Project[] }) {
  const t = useTranslations();
  return projects.length ? (
    <div className="project-grid">
      {projects.map((p, i) => (
        <Reveal key={p.id}>
          <ProjectCard project={p} index={i} />
        </Reveal>
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <Plus size={30} />
      <h3>{t("Nothing buried here yet.")}</h3>
      <p>{t("Every archive starts with a repository. Yours could be the first.")}</p>
      <Link href="/autopsy" className="text-link">
        {t("Scan my GitHub")} <ArrowRight size={18} />
      </Link>
    </div>
  );
}
