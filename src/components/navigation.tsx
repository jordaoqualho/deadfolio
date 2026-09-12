"use client";
import { LocalLink as Link } from "@/components/locale";
import { LanguageSwitcher, useTranslations } from "@/components/locale";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/deadfolio/logo";
import { trackEvent } from "./analytics";
/** Primary call to action everywhere: start a profile scan. */
export function ScanLink({
  children,
  className = "button primary",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations();
  return (
    <Link
      href="/autopsy"
      className={className}
      onClick={() => trackEvent("Scan GitHub clicked")}
    >
      {children ?? t("Scan my GitHub")}
      <ArrowUpRight size={18} />
    </Link>
  );
}
export function Navigation() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const pathname = usePathname().replace(/^\/pt(?=\/|$)/, "") || "/";
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link href="/" aria-label={t("Deadfolio home")} className="logo">
          <Logo />
        </Link>
        <nav className="desktop-nav" aria-label={t("Main navigation")}>
          <Link
            href="/graveyard"
            aria-current={pathname === "/graveyard" ? "page" : undefined}
          >
            {t("Graveyard")}{" "}
          </Link>
          <Link
            href="/autopsy"
            aria-current={pathname.startsWith("/autopsy") ? "page" : undefined}
          >
            {t("Autopsy")}{" "}
          </Link>
          <Link
            href="/about"
            aria-current={pathname === "/about" ? "page" : undefined}
          >
            {t("About")}{" "}
          </Link>
        </nav>
        <div className="nav-actions">
          <LanguageSwitcher className="desktop-language-switcher" />
          <ScanLink />
          <button
            className="icon-button mobile-menu"
            aria-label={t(open ? "Close menu" : "Open menu")}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="mobile-nav"
          aria-label={t("Mobile navigation")}
        >
          <Link href="/graveyard" onClick={() => setOpen(false)}>
            {t("Graveyard")}{" "}
          </Link>
          <Link href="/autopsy" onClick={() => setOpen(false)}>
            {t("Autopsy")}{" "}
          </Link>
          <Link href="/about" onClick={() => setOpen(false)}>
            {t("About")}{" "}
          </Link>
          <LanguageSwitcher className="mobile-language-switcher" />
        </nav>
      )}
    </header>
  );
}
