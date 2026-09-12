import { pageMetadata } from "@/lib/i18n/metadata";
import { getTranslations } from "@/lib/i18n/server";
import { ScanLink } from "@/components/navigation";
export async function generateMetadata() {
  return pageMetadata(
    "/about",
    "About",
    "Most portfolios show what survived. Deadfolio also remembers what didn’t.",
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
          {t("Deadfolio also remembers")} <br />
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
            "Most of that work is still sitting in public repositories. Deadfolio starts there: it reads what the repository can prove, separates evidence from inference, and reconstructs the project with almost no work from its creator.",
          )}{" "}
        </p>
        <p>
          {t(
            "The repository cannot tell us why development stopped, so that is the one thing we ask. Everything else is already written in the code, the commits and the README.",
          )}{" "}
        </p>
        <p>
          {t(
            "Some projects deserve a second life. Others deserve a proper ending. Both belong here.",
          )}{" "}
        </p>
        <div className="about-cta">
          <h2>{t("Left something behind on GitHub? Dig it up.")}</h2>
          <ScanLink />
        </div>
      </div>
    </article>
  );
}
