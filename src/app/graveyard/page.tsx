import type { Metadata } from "next";
import { getRepository } from "@/lib/repositories";
import { ProjectFilters } from "@/components/deadfolio/project-filters";
export const metadata: Metadata = {
  title: "The Graveyard",
  description:
    "Browse abandoned projects, honest postmortems and work looking for a second life.",
  alternates: { canonical: "/graveyard" },
};
export const dynamic = "force-dynamic";
export default async function Graveyard() {
  return (
    <div className="shell page-space">
      <header className="page-heading">
        <span className="eyebrow">AN ARCHIVE, NOT A LEADERBOARD</span>
        <h1>
          The Graveyard<span className="accent">.</span>
        </h1>
        <p>Projects ended. Lessons didn’t.</p>
      </header>
      <ProjectFilters projects={await getRepository().findPublished()} />
    </div>
  );
}
