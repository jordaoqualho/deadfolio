import type { Metadata } from "next";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Navigation } from "@/components/navigation";
import { Logo } from "@/components/deadfolio/logo";
import { AnalyticsProvider } from "@/components/analytics";
import { siteUrl } from "@/lib/site";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Deadfolio — Dead projects belong in your portfolio too.",
    template: "%s | Deadfolio",
  },
  description:
    "A public home for abandoned technology projects. Share what went wrong, preserve what you built, and give the work a second life.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Deadfolio",
    title: "Dead projects belong in your portfolio too.",
    description: "Good projects die. Their work doesn’t have to.",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Navigation />
        <main id="main">{children}</main>
        <footer className="site-footer shell">
          <Link className="logo" href="/">
            <Logo />
          </Link>
          <p>Every failed project has a story worth keeping.</p>
          <span className="mono">END OF FILE. NOT END OF STORY.</span>
        </footer>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
