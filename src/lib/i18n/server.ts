import "server-only";
import { headers } from "next/headers";
import { translate, type Locale } from "./dictionaries";
export async function getLocale(): Promise<Locale> {
  return (await headers()).get("x-deadfolio-locale") === "pt" ? "pt" : "en";
}
export async function getTranslations() {
  const locale = await getLocale();
  return (key: string) => translate(locale, key);
}
