import type { Metadata } from "next";
import { BuryLink } from "@/components/navigation";
export const metadata: Metadata = {
  title: "About",
  description:
    "Failure doesn’t erase engineering work. Deadfolio preserves the projects and lessons that portfolios leave out.",
  alternates: { canonical: "/about" },
};
export default function About() {
  return (
    <article className="shell about page-space">
      <span className="eyebrow">WHY THIS EXISTS</span>
      <h1>
        Most portfolios show
        <br />
        what survived.
        <br />
        <span className="muted">
          Deadfolio shows
          <br />
          what didn’t.
        </span>
      </h1>
      <div className="about-copy">
        <p>
          People build things that fail. Good ideas meet bad timing. Side
          projects outgrow spare time. Products work beautifully and still find
          no market.
        </p>
        <p>
          Failure doesn’t erase engineering work.
          <br />
          Failure doesn’t erase lessons.
          <br />
          Failure doesn’t erase creativity.
        </p>
        <p>
          Deadfolio is a public home for those stories: what you tried, what you
          built, what went wrong, and what’s still worth keeping.
        </p>
        <p>
          Some projects deserve a second life. Others deserve a proper ending.
          Both belong here.
        </p>
        <div className="about-cta">
          <h2>Built something that didn’t make it? Bury it here.</h2>
          <BuryLink />
        </div>
      </div>
    </article>
  );
}
