"use client";
import type { Project } from "@/types/project";
import { useTranslations } from "@/components/locale";
import {
  statuses,
  categories,
  causes,
  stages,
  nextSteps,
} from "@/lib/schemas/project";
import { ArrowUpRight, ArrowLeft, Plus } from "lucide-react";
import { LocalLink as Link } from "@/components/locale";
import { InterestButton } from "./interest-button";
export function ProjectAutopsy({
  project: p,
  preview = false,
  submissionPreview = false,
}: {
  project: Project;
  preview?: boolean;
  submissionPreview?: boolean;
}) {
  const t = useTranslations();
  return (
    <article className="shell autopsy page-space">
      {!submissionPreview && (
        <Link href={preview ? "/admin" : "/graveyard"} className="back-link">
          <ArrowLeft size={16} />
          {t(preview ? "Back to moderation" : "Back to the Graveyard")}
        </Link>
      )}
      {p.isDemo && (
        <div className="notice">
          {t("Sample project ·")}{" "}
          {t(
            p.slug === "fintal"
              ? "Based on the supplied Fintal description. Unknown details are left blank."
              : "Fictional demo content, created to show how a postmortem works.",
          )}
        </div>
      )}
      {preview && (
        <div className="notice">
          {t("Private moderation preview ·")} {p.moderationStatus}
        </div>
      )}
      <header className="autopsy-header">
        <div className="eyebrow">
          {t("PROJECT POSTMORTEM /")} {p.id.slice(0, 12)}
        </div>
        <h1>
          {p.title}
          <span className="accent">.</span>
        </h1>
        <p className="autopsy-tagline">{p.tagline}</p>
        <div className="autopsy-byline">
          <span>
            {t("Filed by")} <strong>{p.creator.name}</strong>
          </span>
          <span className={`status status-${p.status}`}>
            <i />
            {t(statuses[p.status])}
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
          <span className="eyebrow">{t("THE RECORD")}</span>
          <dl>
            {[
              ["Category", categories[p.category]],
              ["Stage reached", stages[p.stage]],
              ["Development period", p.developmentPeriod],
              ["Development time", p.developmentDuration],
              [
                "Estimated time invested",
                p.estimatedHours !== null
                  ? `${p.estimatedHours.toLocaleString()} ${t("hours")}`
                  : "",
              ],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{t(k)}</dt>
                  <dd>{t(v)}</dd>
                </div>
              ))}
          </dl>
          {p.technologies.length > 0 && (
            <>
              <h2 className="eyebrow">{t("TECHNOLOGY")}</h2>
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
                  key={t(label)}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {t(label)}
                  <ArrowUpRight size={15} />
                </a>
              ))}
          </div>
        </aside>
        <div className="autopsy-story">
          <section>
            <span className="section-number">{t("01 / THE BEGINNING")}</span>
            <h2>{t("The Idea")}</h2>
            {p.summary && <p className="lead">{p.summary}</p>}
            <p>{p.originalIdea}</p>
            {p.whyBuilt && <p>{p.whyBuilt}</p>}
          </section>
          <section>
            <span className="section-number">{t("02 / THE WORK")}</span>
            <h2>{t("What Was Built")}</h2>
            <ContentList
              items={p.whatWasBuilt}
              empty={t("The creator hasn’t documented the build yet.")}
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
              <span className="section-number">{t("03 / THE END")}</span>
              <Plus size={26} />
            </div>
            <h2>{t("Cause of Death")}</h2>
            <strong>{t(causes[p.primaryCauseOfDeath])}</strong>
            <p>{p.causeExplanation}</p>
          </section>
          <section>
            <span className="section-number">{t("04 / THE AUTOPSY")}</span>
            <h2>{t("What I Got Wrong")}</h2>
            <ContentList
              items={p.whatWentWrong}
              empty={t("The creator hasn’t documented this yet.")}
            />
          </section>
          <section>
            <h2>{t("What Actually Worked")}</h2>
            <ContentList
              items={p.whatWorked}
              empty={t("The creator hasn’t documented this yet.")}
            />
          </section>
          <section>
            <h2>{t("What I Learned")}</h2>
            <ContentList
              items={p.lessons}
              empty={t("The creator hasn’t documented the lessons yet.")}
            />
          </section>
          <section>
            <span className="section-number">{t("05 / THE REMAINS")}</span>
            <h2>{t("What Survived")}</h2>
            <ContentList
              items={p.survivingAssets}
              empty={t("Nothing was left behind.")}
            />
          </section>
          <section className="future-block">
            <span className="section-number">{t("06 / THE NEXT CHAPTER")}</span>
            <h2>{t("What Happens Now?")}</h2>
            <div className="next-steps">
              {p.desiredNextSteps.map((s) => (
                <span key={s}>
                  <Plus size={16} />
                  {t(nextSteps[s])}
                </span>
              ))}
            </div>
            {p.contactUrl && (
              <>
                <p>
                  {t(
                    "The creator has shared a public contact link for this project.",
                  )}{" "}
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
