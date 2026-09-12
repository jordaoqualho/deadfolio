import { pageMetadata } from "@/lib/i18n/metadata";
import { getTranslations } from "@/lib/i18n/server";
import { BuryLink } from "@/components/navigation";
export async function generateMetadata() {
  return pageMetadata(
    "/about",
    "About",
    "Built something that didn’t make it? Bury it here.",
  );
}
export default async function About() {
  const t = await getTranslations();
  return (
    <article className="shell about page-space">
      <span className="eyebrow">{t("WHY THIS EXISTS")}</span>
      <h1>
        {t("Most portfolios show")} <br />
        {t("what survived.")} <br />
        <span className="muted">
          {t("Deadfolio shows")} <br />
          {t("what didn’t.")}{" "}
        </span>
      </h1>
      <div className="about-copy">
        <p>
          {t(
            "People build things that fail. Good ideas meet bad timing. Side projects outgrow spare time. Products work beautifully and still find no market.",
          )}{" "}
        </p>
        <p>
          {t("Failure doesn’t erase engineering work.")} <br />
          {t("Failure doesn’t erase lessons.")} <br />
          {t("Failure doesn’t erase creativity.")}{" "}
        </p>
        <p>
          {t(
            "Deadfolio is a public home for those stories: what you tried, what you built, what went wrong, and what’s still worth keeping.",
          )}{" "}
        </p>
        <p>
          {t(
            "Some projects deserve a second life. Others deserve a proper ending. Both belong here.",
          )}{" "}
        </p>
        <div className="about-cta">
          <h2>{t("Built something that didn’t make it? Bury it here.")}</h2>
          <BuryLink />
        </div>
      </div>
    </article>
  );
}
