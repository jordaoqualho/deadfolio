import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
