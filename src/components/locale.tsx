"use client";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
} from "@/lib/i18n/detect";
import { translate, localePath, type Locale } from "@/lib/i18n/dictionaries";

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};samesite=lax`;
}
const LocaleContext = createContext<Locale>("en");
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}
export function useLocale() {
  return useContext(LocaleContext);
}
export function useTranslations() {
  const locale = useLocale();
  return (key: string) => translate(locale, key);
}
export function T({ children }: { children: string }) {
  return useTranslations()(children);
}
export function LocalLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  return (
    <NextLink
      {...props}
      href={typeof href === "string" ? localePath(locale, href) : href}
    />
  );
}
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const label = translate(locale, "Language");
  // Full navigation updates the document language and server-rendered dictionaries.
  return (
    <nav
      className={["language-switcher", className].filter(Boolean).join(" ")}
      aria-label={label}
    >
      <span className="language-switcher-label mono" aria-hidden="true">
        {label}
      </span>
      <div className="language-switcher-options" role="group" aria-label={label}>
        <a
          href={localePath("en", pathname)}
          lang="en"
          className="language-switcher-option"
          aria-current={locale === "en" ? "true" : undefined}
          onClick={() => rememberLocale("en")}
        >
          EN
        </a>
        <a
          href={localePath("pt", pathname)}
          lang="pt-BR"
          className="language-switcher-option"
          aria-current={locale === "pt" ? "true" : undefined}
          onClick={() => rememberLocale("pt")}
        >
          PT-BR
        </a>
      </div>
    </nav>
  );
}
