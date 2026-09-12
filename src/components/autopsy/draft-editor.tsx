"use client";
import { useTranslations } from "@/components/locale";
import { categories, stages, causes } from "@/lib/schemas/project";
import type { ProjectDraft } from "@/types/project";

/**
 * Optional edits to the postmortem draft built from an autopsy. Every field
 * starts pre-filled; nothing here is required to publish.
 */
export function DraftEditor({
  draft,
  onChange,
  disabled,
}: {
  draft: ProjectDraft;
  onChange: (draft: ProjectDraft) => void;
  disabled: boolean;
}) {
  const t = useTranslations();
  return (
    <fieldset className="story-fields draft-editor" disabled={disabled}>
      <legend className="eyebrow">{t("EDIT DETAILS")}</legend>
      {(
        [
          ["title", "Project name", 100],
          ["tagline", "One sentence description", 240],
          ["summary", "Summary", 6000],
          ["originalIdea", "The Idea", 6000],
          ["causeExplanation", "Cause of Death", 6000],
        ] as const
      ).map(([key, label, max]) => (
        <label className="field" key={key}>
          <span>{t(label)}</span>
          <textarea
            rows={key === "title" || key === "tagline" ? 2 : 4}
            maxLength={max}
            value={draft[key] || ""}
            onChange={(e) => onChange({ ...draft, [key]: e.target.value || null })}
          />
        </label>
      ))}
      <div className="field-grid">
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
              onChange={(e) => onChange({ ...draft, [key]: e.target.value || null })}
            >
              <option value="">—</option>
              {Object.entries(options).map(([value, optionLabel]) => (
                <option key={value} value={value}>
                  {t(optionLabel)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
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
            onChange={(e) => onChange({ ...draft, [key]: e.target.value.split("\n") })}
          />
          <small>{t("One item per line. Leave blank if unknown.")}</small>
        </label>
      ))}
    </fieldset>
  );
}
