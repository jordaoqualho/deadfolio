"use client";
import { ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/components/analytics";
export function InterestButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="button primary"
      onClick={() => trackEvent("Interest in project clicked")}
    >
      I’m interested in this project <ArrowUpRight size={18} />
    </a>
  );
}
