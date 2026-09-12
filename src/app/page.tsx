import { pageMetadata } from "@/lib/i18n/metadata";
import { Suspense } from "react";
import ArchiveLoading from "@/components/ui/archive-loading";
import { LocalLink as Link } from "@/components/locale";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { BuryLink } from "@/components/navigation";
import { ProjectGrid } from "@/components/deadfolio/project-card";
import { getRepository } from "@/lib/repositories";
import { Reveal } from "@/components/ui/reveal";
export async function generateMetadata() {
  return pageMetadata(
    "/",
    "Dead projects belong in your portfolio too.",
    "Deadfolio is where developers and makers document abandoned projects, share what went wrong and preserve what was worth building.",
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
  return (
    <>
      <section className={`hero shell ${locale === "pt" ? "hero-pt" : ""}`}>
        <div className="eyebrow hero-eyebrow">
          <span className="live-dot" />
          {t("The portfolio of things that didn’t make it")}{" "}
        </div>
        <h1>
          {t("Good projects die.")} <br />
          <span>
            {locale === "pt" ? (
              "O trabalho que você colocou neles não precisa morrer junto."
            ) : (
              <>
                Their work doesn’t
                <br className="desktop-break" /> have to.
              </>
            )}
          </span>
        </h1>
        <div className="hero-bottom">
          <div>
            <p>
              {t(
                "Deadfolio is where developers and makers document abandoned projects, share what went wrong and preserve what was worth building.",
              )}{" "}
            </p>
            <div className="hero-buttons">
              <BuryLink />
              <Link className="button secondary" href="/graveyard">
                {t("Explore the Graveyard")} <ArrowDown size={17} />
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
          <span>{t("Dead projects belong in your portfolio too.")}</span>
          <span>
            {t("SCROLL TO EXHUME")} <ArrowDown size={14} />
          </span>
        </div>
      </section>
      {real.length > 0 && (
        <section className="metrics shell" aria-label={t("Archive statistics")}>
          <div>
            <strong>{real.length}</strong>
            <span>{t("Projects buried")}</span>
          </div>
          {real.some((p) => p.estimatedHours !== null) && (
            <div>
              <strong>
                {real
                  .reduce((s, p) => s + (p.estimatedHours || 0), 0)
                  .toLocaleString("en-US")}
              </strong>
              <span>{t("Reported hours invested")}</span>
            </div>
          )}
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
            {t("View the archive")} <ArrowUpRightIcon />
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
            <BuryLink>{t("Bury your project")}</BuryLink>
          </div>
        </section>
      </Reveal>
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={18} />;
}
