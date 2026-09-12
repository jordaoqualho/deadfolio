import { LocalLink as Link } from "@/components/locale";
import { getTranslations } from "@/lib/i18n/server";
export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="shell page-space empty-state">
      <span className="eyebrow">{t("404 / MISSING RECORD")}</span>
      <h1>{t("No remains found.")}</h1>
      <p>{t("This project isn’t in the public archive.")}</p>
      <Link className="button primary" href="/graveyard">
        {t("Back to the Graveyard")}{" "}
      </Link>
    </div>
  );
}
