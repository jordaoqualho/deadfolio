"use client";
import { ProjectAutopsy } from "@/components/deadfolio/project-autopsy";
import { useTranslations } from "@/components/locale";
import { emptySubmission } from "@/lib/schemas/empty-submission";
import { categories, stages, causes } from "@/lib/schemas/project";
import type { Project, ProjectDraft, RawSubmission } from "@/types/project";

export function DraftPreview({
  draft,
  onChange,
  input,
  disabled,
}: {
  draft: ProjectDraft;
  onChange: (draft: ProjectDraft) => void;
  input: RawSubmission;
  disabled: boolean;
}) {
  const t = useTranslations();
  const project: Project = {
    ...structuredClone(emptySubmission),
    ...Object.fromEntries(
      Object.entries(draft).filter(([, value]) => value !== null),
    ),
    title: draft.title || input.title,
    creator: { ...emptySubmission.creator, name: input.creatorName },
    links: { ...emptySubmission.links, website: input.url },
    desiredNextSteps: [input.nextStep],
    id: "preview",
    slug: "preview",
    moderationStatus: "submitted",
    createdAt: "",
    isDemo: false,
    isFounder: false,
  };
  return (
    <>
      <details className="original-story draft-edit story-start">
        <summary>{t("Edit")}</summary>
        <fieldset className="story-fields" disabled={disabled}>
          {(
            [
              ["title", "Project name"],
              ["tagline", "One sentence description"],
              ["summary", "Summary"],
              ["originalIdea", "The Idea"],
              ["causeExplanation", "Cause of Death"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>
              <span>{t(label)}</span>
              <textarea
                rows={key === "title" || key === "tagline" ? 2 : 4}
                maxLength={
                  key === "title" ? 100 : key === "tagline" ? 240 : 6000
                }
                value={draft[key] || ""}
                onChange={(e) =>
                  onChange({ ...draft, [key]: e.target.value || null })
                }
              />
            </label>
          ))}
          {(
            [
              ["category", "Category", categories],
              ["stage", "Stage reached", stages],
              ["primaryCauseOfDeath", "Cause of death", causes],
            ] as const
          ).map(([key, label, options]) => (
            <label className="field" key={key}>
              <span>{t(label)}</span>
              <select
                value={draft[key] || ""}
                onChange={(e) =>
                  onChange({ ...draft, [key]: e.target.value || null })
                }
              >
                <option value="">—</option>
                {Object.entries(options).map(([value, label]) => (
                  <option key={value} value={value}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {(
            [
              ["whatWasBuilt", "What Was Built"],
              ["whatWentWrong", "What went wrong"],
              ["whatWorked", "What worked"],
              ["lessons", "Lessons"],
              ["survivingAssets", "Surviving assets"],
              ["technologies", "Technologies"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>
              <span>{t(label)}</span>
              <textarea
                rows={3}
                value={draft[key].join("\n")}
                onChange={(e) =>
                  onChange({ ...draft, [key]: e.target.value.split("\n") })
                }
              />
              <small>{t("One item per line. Leave blank if unknown.")}</small>
            </label>
          ))}
        </fieldset>
      </details>
      <ProjectAutopsy project={project} submissionPreview />
    </>
  );
}
