import { pageMetadata } from "@/lib/i18n/metadata";
import { getTranslations } from "@/lib/i18n/server";
import { getRepository } from "@/lib/repositories";
import { ProjectFilters } from "@/components/deadfolio/project-filters";
export async function generateMetadata() {
  return pageMetadata(
    "/graveyard",
    "The Graveyard",
    "Projects ended. Lessons didn’t.",
  );
}
export const dynamic = "force-dynamic";
export default async function Graveyard() {
  const t = await getTranslations();
  return (
    <div className="shell page-space">
      <header className="page-heading">
        <span className="eyebrow">{t("AN ARCHIVE, NOT A LEADERBOARD")}</span>
        <h1>
          {t("The Graveyard")}
          <span className="accent">.</span>
        </h1>
        <p>{t("Projects ended. Lessons didn’t.")}</p>
      </header>
      <ProjectFilters projects={await getRepository().findPublished()} />
    </div>
  );
}
