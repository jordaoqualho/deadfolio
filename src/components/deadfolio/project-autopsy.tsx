import type { Project } from "@/types/project";
import {
  statuses,
  categories,
  causes,
  stages,
  nextSteps,
} from "@/lib/schemas/project";
import { ArrowUpRight, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { InterestButton } from "./interest-button";
export function ProjectAutopsy({
  project: p,
  preview = false,
}: {
  project: Project;
  preview?: boolean;
}) {
  return (
    <article className="shell autopsy page-space">
      <Link href={preview ? "/admin" : "/graveyard"} className="back-link">
        <ArrowLeft size={16} />
        {preview ? "Back to moderation" : "Back to the Graveyard"}
      </Link>
      {p.isDemo && (
        <div className="notice">
          Sample project ·{" "}
          {p.slug === "fintal"
            ? "Based on the supplied Fintal description. Unknown details are left blank."
            : "Fictional demo content, created to show how a postmortem works."}
        </div>
      )}
      {preview && (
        <div className="notice">
          Private moderation preview · {p.moderationStatus}
        </div>
      )}
      <header className="autopsy-header">
        <div className="eyebrow">PROJECT POSTMORTEM / {p.id.slice(0, 12)}</div>
        <h1>
          {p.title}
          <span className="accent">.</span>
        </h1>
        <p className="autopsy-tagline">{p.tagline}</p>
        <div className="autopsy-byline">
          <span>
            Filed by <strong>{p.creator.name}</strong>
          </span>
          <span className={`status status-${p.status}`}>
            <i />
            {statuses[p.status]}
          </span>
        </div>
      </header>
      {p.coverImage && (
        <img
          className="detail-cover"
          src={p.coverImage.url}
          alt={p.coverImage.alt}
        />
      )}
      <div className="autopsy-layout">
        <aside className="project-facts">
          <span className="eyebrow">THE RECORD</span>
          <dl>
            {[
              ["Category", categories[p.category]],
              ["Stage reached", stages[p.stage]],
              ["Development period", p.developmentPeriod],
              ["Development time", p.developmentDuration],
              [
                "Estimated time invested",
                p.estimatedHours !== null
                  ? `${p.estimatedHours.toLocaleString("en-US")} hours`
                  : "",
              ],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {p.technologies.length > 0 && (
            <>
              <h2 className="eyebrow">TECHNOLOGY</h2>
              <div className="tags">
                {p.technologies.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </>
          )}
          <div className="external-links">
            {Object.entries({
              ...p.links,
              profile: p.creator.profileUrl,
              "Creator GitHub": p.creator.github,
              LinkedIn: p.creator.linkedin,
              X: p.creator.x,
            })
              .filter(([, url]) => url)
              .map(([label, url]) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {label}
                  <ArrowUpRight size={15} />
                </a>
              ))}
          </div>
        </aside>
        <div className="autopsy-story">
          <section>
            <span className="section-number">01 / THE BEGINNING</span>
            <h2>The Idea</h2>
            {p.summary && <p className="lead">{p.summary}</p>}
            <p>{p.originalIdea}</p>
            {p.whyBuilt && <p>{p.whyBuilt}</p>}
          </section>
          <section>
            <span className="section-number">02 / THE WORK</span>
            <h2>What Was Built</h2>
            <ContentList
              items={p.whatWasBuilt}
              empty="The creator hasn’t documented the build yet."
            />
            {p.screenshots.length > 0 && (
              <div className="screenshots">
                {p.screenshots.map((s) => (
                  <figure key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      <img src={s.url} alt={s.alt} loading="lazy" />
                    </a>
                    <figcaption>{s.alt}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
          <section className="cause-block">
            <div className="cause-heading">
              <span className="section-number">03 / THE END</span>
              <Plus size={26} />
            </div>
            <h2>Cause of Death</h2>
            <strong>{causes[p.primaryCauseOfDeath]}</strong>
            <p>{p.causeExplanation}</p>
          </section>
          <section>
            <span className="section-number">04 / THE AUTOPSY</span>
            <h2>What I Got Wrong</h2>
            <ContentList
              items={p.whatWentWrong}
              empty="The creator hasn’t documented this yet."
            />
          </section>
          <section>
            <h2>What Actually Worked</h2>
            <ContentList
              items={p.whatWorked}
              empty="The creator hasn’t documented this yet."
            />
          </section>
          <section>
            <h2>What I Learned</h2>
            <ContentList
              items={p.lessons}
              empty="The creator hasn’t documented the lessons yet."
            />
          </section>
          <section>
            <span className="section-number">05 / THE REMAINS</span>
            <h2>What Survived</h2>
            <ContentList
              items={p.survivingAssets}
              empty="Nothing was left behind."
            />
          </section>
          <section className="future-block">
            <span className="section-number">06 / THE NEXT CHAPTER</span>
            <h2>What Happens Now?</h2>
            <div className="next-steps">
              {p.desiredNextSteps.map((s) => (
                <span key={s}>
                  <Plus size={16} />
                  {nextSteps[s]}
                </span>
              ))}
            </div>
            {p.contactUrl && (
              <>
                <p>
                  The creator has shared a public contact link for this project.
                </p>
                <InterestButton url={p.contactUrl} />
              </>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
function ContentList({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul className="story-list">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  ) : (
    <p className="muted">{empty}</p>
  );
}
