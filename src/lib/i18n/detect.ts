import type { Locale } from "./dictionaries";

export const LOCALE_COOKIE = "deadfolio-locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Browser/OS language preferences from the standard Accept-Language header. */
export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage?.trim()) return "en";

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1] ?? "1") : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (tag === "pt" || tag.startsWith("pt-")) return "pt";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }

  return "en";
}

export function readLocaleCookie(
  value: string | undefined | null,
): Locale | null {
  return value === "pt" || value === "en" ? value : null;
}

export function localePrefixPath(pathname: string, locale: Locale) {
  const clean = pathname.replace(/^\/pt(?=\/|$)/, "") || "/";
  if (/^\/api(\/|$)/.test(clean)) return clean;
  return locale === "pt" ? `/pt${clean === "/" ? "" : clean}` : clean;
}
