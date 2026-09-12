import type { Metadata } from "next";
import { getLocale } from "./server";
import { localePath, translate } from "./dictionaries";
export async function pageMetadata(
  path: string,
  title: string,
  description: string,
): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: translate(locale, title),
    description: translate(locale, description),
    alternates: {
      canonical: localePath(locale, path),
      languages: {
        en: localePath("en", path),
        "pt-BR": localePath("pt", path),
        "x-default": localePath("en", path),
      },
    },
    openGraph: {
      title: translate(locale, title),
      description: translate(locale, description),
      locale: locale === "pt" ? "pt_BR" : "en_US",
      url: localePath(locale, path),
      images: ["/opengraph-image"],
    },
  };
}
