import Link from "next/link";
import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { BuryLink } from "@/components/navigation";
import { ProjectGrid } from "@/components/deadfolio/project-card";
import { getRepository } from "@/lib/repositories";
import { Reveal } from "@/components/ui/reveal";
export const dynamic = "force-dynamic";
export default async function Home() {
  const projects = await getRepository().findPublished();
  const real = projects.filter((p) => !p.isDemo);
  return (
    <>
      <section className="hero shell">
        <div className="eyebrow hero-eyebrow">
          <span className="live-dot" />
          The portfolio of things that didn’t make it
        </div>
        <h1>
          Good projects die.
          <br />
          <span>
            Their work doesn’t
            <br className="desktop-break" /> have to.
          </span>
        </h1>
        <div className="hero-bottom">
          <div>
            <p>
              Deadfolio is where developers and makers document abandoned
              projects, share what went wrong and preserve what was worth
              building.
            </p>
            <div className="hero-buttons">
              <BuryLink />
              <Link className="button secondary" href="/graveyard">
                Explore the Graveyard <ArrowDown size={17} />
              </Link>
            </div>
          </div>
          <div className="archive-note" aria-label="Archive philosophy">
            <div className="mono">
              <span className="accent">+</span> DEADFOLIO / ARCHIVE
            </div>
            <p>
              THE CODE REMAINS.
              <br />
              THE LESSONS REMAIN.
              <br />
              <span>KEEP THE STORY.</span>
            </p>
            <div className="archive-note-bottom mono">
              <span>STATUS: WORTH KEEPING</span>
              <Plus size={18} />
            </div>
          </div>
        </div>
        <div className="hero-baseline mono">
          <span>Dead projects belong in your portfolio too.</span>
          <span>
            SCROLL TO EXHUME <ArrowDown size={14} />
          </span>
        </div>
      </section>
      {real.length > 0 && (
        <section className="metrics shell" aria-label="Archive statistics">
          <div>
            <strong>{real.length}</strong>
            <span>Projects buried</span>
          </div>
          {real.some((p) => p.estimatedHours !== null) && (
            <div>
              <strong>
                {real
                  .reduce((s, p) => s + (p.estimatedHours || 0), 0)
                  .toLocaleString("en-US")}
              </strong>
              <span>Reported hours invested</span>
            </div>
          )}
          <div>
            <strong>
              {real.filter((p) => p.status === "second-life").length}
            </strong>
            <span>Looking for a second life</span>
          </div>
          <div>
            <strong>{real.filter((p) => p.status === "revived").length}</strong>
            <span>Projects revived</span>
          </div>
        </section>
      )}
      <section className="graveyard-section shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE PUBLIC RECORD</span>
            <h2>
              The Graveyard<span className="accent">.</span>
            </h2>
            <p>Projects ended. Lessons didn’t.</p>
          </div>
          <Link className="text-link" href="/graveyard">
            View the archive <ArrowUpRightIcon />
          </Link>
        </div>
        <ProjectGrid projects={projects.slice(0, 6)} />
      </section>
      <Reveal>
        <section className="final-cta shell">
          <span className="eyebrow">UNFINISHED ≠ WORTHLESS</span>
          <h2>
            Got one buried
            <br />
            in your GitHub?
          </h2>
          <div>
            <p>
              You already built it. You already learned from it. Don’t let the
              story disappear with the repository.
            </p>
            <BuryLink>Bury your project</BuryLink>
          </div>
        </section>
      </Reveal>
    </>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={18} />;
}
