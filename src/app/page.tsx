import { pageMetadata } from "@/lib/i18n/metadata";
import { Suspense } from "react";
import ArchiveLoading from "@/components/ui/archive-loading";
import { LocalLink as Link } from "@/components/locale";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { ArrowDown, ArrowRight, ArrowUpRight, Link2, Plus } from "lucide-react";
import { ScanLink } from "@/components/navigation";
import { ProjectGrid } from "@/components/deadfolio/project-card";
import { getRepository } from "@/lib/repositories";
import { Reveal } from "@/components/ui/reveal";
export async function generateMetadata() {
  return pageMetadata(
    "/",
    "Your GitHub is full of projects you left behind.",
    "Scan your public repositories, find the projects that stopped moving and run an AI autopsy to see what happened, what survived and whether they're worth another shot.",
  );
}
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <Suspense fallback={<ArchiveLoading />}>
      <HomeContent />
    </Suspense>
  );
}
async function HomeContent() {
  const t = await getTranslations();
  const locale = await getLocale();
  const projects = await getRepository().findPublished();
  const real = projects.filter((p) => !p.isDemo);
  const steps: [string, string, string][] = [
    [
      "01 — Scan",
      "Scan",
      "Deadfolio checks public GitHub repository metadata. No AI required.",
    ],
    [
      "02 — Autopsy",
      "Autopsy",
      "Pick a project and Gemini examines the repository.",
    ],
    [
      "03 — Preserve",
      "Preserve",
      "Confirm what actually happened and add the project to your Deadfolio.",
    ],
  ];
  return (
    <>
      <section className={`hero shell ${locale === "pt" ? "hero-pt" : ""}`}>
        <div className="eyebrow hero-eyebrow">
          <span className="live-dot" />
          {t("Failed projects belong in your portfolio")}{" "}
        </div>
        <h1>
          {t("Your GitHub is full of projects you left behind.")} <br />
          <span>{t("Deadfolio digs them up.")}</span>
        </h1>
        <div className="hero-bottom">
          <div>
            <p>
              {t(
                "Scan your public repositories, find the projects that stopped moving and run an AI autopsy to see what happened, what survived and whether they're worth another shot.",
              )}{" "}
            </p>
            <div className="hero-buttons">
              <ScanLink />
              <Link className="button secondary" href="/autopsy?mode=repo">
                <Link2 size={17} /> {t("Paste a repository")}
              </Link>
            </div>
          </div>
          <div className="archive-note" aria-label={t("Archive philosophy")}>
            <div className="mono">
              <span className="accent">+</span>
              {t("DEADFOLIO / ARCHIVE")}{" "}
            </div>
            <p>
              {t("THE CODE REMAINS.")} <br />
              {t("THE LESSONS REMAIN.")} <br />
              <span>{t("KEEP THE STORY.")}</span>
            </p>
            <div className="archive-note-bottom mono">
              <span>{t("STATUS: WORTH KEEPING")}</span>
              <Plus size={18} />
            </div>
          </div>
        </div>
        <div className="hero-baseline mono">
          <span>{t("Evidence first. Stories second.")}</span>
          <span>
            {t("SCROLL TO EXHUME")} <ArrowDown size={14} />
          </span>
        </div>
      </section>
      <section className="how-section shell" aria-label={t("How it works")}>
        <ol className="how-it-works home-steps">
          {steps.map(([number, , body]) => (
            <li key={number}>
              <span className="section-number">{t(number).toUpperCase()}</span>
              <p>{t(body)}</p>
            </li>
          ))}
        </ol>
      </section>
      {real.length > 0 && (
        <section className="metrics shell" aria-label={t("Archive statistics")}>
          <div>
            <strong>{real.length}</strong>
            <span>{t("Projects buried")}</span>
          </div>
          <div>
            <strong>{real.filter((p) => p.source === "autopsy").length}</strong>
            <span>{t("Filed from repository autopsies")}</span>
          </div>
          <div>
            <strong>
              {real.filter((p) => p.status === "second-life").length}
            </strong>
            <span>{t("Looking for a second life")}</span>
          </div>
          <div>
            <strong>{real.filter((p) => p.status === "revived").length}</strong>
            <span>{t("Projects revived")}</span>
          </div>
        </section>
      )}
      <section className="graveyard-section shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{t("THE PUBLIC RECORD")}</span>
            <h2>
              {t("The Graveyard")}
              <span className="accent">.</span>
            </h2>
            <p>{t("Projects ended. Lessons didn’t.")}</p>
          </div>
          <Link className="text-link" href="/graveyard">
            {t("View the archive")} <ArrowRight size={18} />
          </Link>
        </div>
        <ProjectGrid
          projects={[...real, ...projects.filter((p) => p.isDemo)].slice(0, 6)}
        />
      </section>
      <Reveal>
        <section className="final-cta shell">
          <span className="eyebrow">{t("UNFINISHED ≠ WORTHLESS")}</span>
          <h2>
            {t("Got one buried")} <br />
            {t("in your GitHub?")}{" "}
          </h2>
          <div>
            <p>
              {t(
                "You already built it. You already learned from it. Don’t let the story disappear with the repository.",
              )}{" "}
            </p>
            <div className="hero-buttons">
              <ScanLink />
              <Link className="button secondary" href="/autopsy?mode=repo">
                {t("Paste a repository")} <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
