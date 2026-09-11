"use client";
import { Analytics } from "@vercel/analytics/next";
import { track } from "@vercel/analytics";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export function trackEvent(name: string) {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true") track(name);
}
export function AnalyticsProvider() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/") trackEvent("Homepage visit");
    else if (pathname.startsWith("/projects/")) trackEvent("Project viewed");
  }, [pathname]);
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" ? (
    <Analytics />
  ) : null;
}
