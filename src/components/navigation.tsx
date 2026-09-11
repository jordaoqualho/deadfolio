"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Plus, Menu, X } from "lucide-react";
import { useState } from "react";
import { trackEvent } from "./analytics";
export function BuryLink({
  children = "Bury a Project",
  className = "button primary",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href="/bury"
      className={className}
      onClick={() => trackEvent("Bury project clicked")}
    >
      {children}
      <ArrowUpRight size={18} />
    </Link>
  );
}
export function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link href="/" aria-label="Deadfolio home" className="logo">
          <Plus className="brand-mark" strokeWidth={3} />
          <span>
            deadfolio<span className="accent">.</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link
            href="/graveyard"
            aria-current={pathname === "/graveyard" ? "page" : undefined}
          >
            Graveyard
          </Link>
          <Link
            href="/about"
            aria-current={pathname === "/about" ? "page" : undefined}
          >
            About
          </Link>
        </nav>
        <div className="nav-actions">
          <BuryLink />
          <button
            className="icon-button mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
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
          aria-label="Mobile navigation"
        >
          <Link href="/graveyard" onClick={() => setOpen(false)}>
            Graveyard
          </Link>
          <Link href="/about" onClick={() => setOpen(false)}>
            About
          </Link>
        </nav>
      )}
    </header>
  );
}
