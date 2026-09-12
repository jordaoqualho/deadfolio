"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, Check } from "lucide-react";
import {
  projectDraftSchema,
  rawSubmissionSchema,
  nextSteps,
} from "@/lib/schemas/project";
import type { RawSubmission, ProjectDraft } from "@/types/project";
import { requestDraft } from "@/lib/ai/request-draft";
import { saveStory } from "@/app/actions";
import { trackEvent } from "@/components/analytics";
import { LocalLink, useLocale, useTranslations } from "@/components/locale";
import { DraftPreview } from "./draft-preview";

export function StoryInput({ aiEnabled }: { aiEnabled: boolean }) {
  const locale = useLocale();
  const t = useTranslations();
  const [input, setInput] = useState<RawSubmission>({
    title: "",
    story: "",
    url: "",
    nextStep: "let-it-rest",
    creatorName: "",
    email: "",
    locale,
  });
  const [busy, setBusy] = useState<"build" | "save" | null>(null);
  const [failedAI, setFailedAI] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);
  function focusHeading() {
    requestAnimationFrame(() => heading.current?.focus());
  }
  function update<K extends keyof RawSubmission>(
    key: K,
    value: RawSubmission[K],
  ) {
    setInput((previous) => ({ ...previous, [key]: value }));
    setError("");
  }
  async function submit(direct = false) {
    if (locked.current) return;
    if (!draft && !form.current?.reportValidity()) return;
    const parsed = rawSubmissionSchema.safeParse(input);
    if (!parsed.success) {
      setError(
        t(
          parsed.error.issues[0]?.path[0] === "story"
            ? "Use 50–15,000 characters for your story."
            : "Check your project name, contact details and URL.",
        ),
      );
      return;
    }
    locked.current = true;
    setError("");
    const build = !direct && !draft && aiEnabled && !failedAI;
    setBusy(build ? "build" : "save");
    try {
      if (build) {
        trackEvent("Submission started");
        const result = await requestDraft(input);
        setDraft({
          ...result,
          title: input.title,
          desiredNextSteps: [input.nextStep],
        });
        trackEvent("AI draft generated");
        focusHeading();
      } else {
        const cleanDraft = draft
          ? projectDraftSchema.safeParse({
              ...draft,
              ...Object.fromEntries(
                Object.entries(draft)
                  .filter(([, value]) => Array.isArray(value))
                  .map(([key, value]) => [
                    key,
                    (value as string[])
                      .map((item) => item.trim())
                      .filter(Boolean),
                  ]),
              ),
            })
          : null;
        if (cleanDraft && !cleanDraft.success) {
          setError(
            t(
              "Some edited details are too long. Shorten them before submitting.",
            ),
          );
          return;
        }
        const result = await saveStory(
          { ...input, title: draft?.title?.trim() || input.title },
          cleanDraft?.success ? cleanDraft.data : undefined,
        );
        if (!result.ok || !result.id) {
          setError(
            t(
              result.error === "rate-limit"
                ? "Too many submissions. Please try again in an hour."
                : "We couldn’t save your story. Your text is still here. Please try again.",
            ),
          );
          return;
        }
        setSuccess(result.id);
        trackEvent("Submission completed");
        focusHeading();
      }
    } catch {
      if (build) setFailedAI(true);
      else
        setError(
          t(
            "We couldn’t save your story. Your text is still here. Please try again.",
          ),
        );
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }
  if (success)
    return (
      <div className="submission-success">
        <div className="success-icon">
          <Check size={30} />
        </div>
        <h1 ref={heading} tabIndex={-1}>
          {t("Story received.")}
        </h1>
        <p>
          {t(
            "Thank you for sharing it. We’ll review your story before it enters the public archive.",
          )}
        </p>
        <div className="submission-id">
          <span>{t("Submission reference")}</span>
          <code>{success}</code>
        </div>
        <LocalLink href="/graveyard" className="button primary">
          {t("Back to the Graveyard")}
        </LocalLink>
      </div>
    );
  if (draft)
    return (
      <div className="submission-preview">
        <div className="story-start">
          <span className="eyebrow">{t("REVIEW BEFORE BURIAL")}</span>
          <h1 ref={heading} tabIndex={-1}>
            {t("Here’s your project’s autopsy.")}
          </h1>
          <p>
            {t(
              "Review the draft. Edit anything you like; missing details can stay blank.",
            )}
          </p>
          <div className="hero-buttons">
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => void submit()}
            >
              {t(busy ? "Submitting…" : "Submit for review")}{" "}
              <ArrowRight size={18} />
            </button>
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={() => {
                setDraft(null);
                setError("");
              }}
            >
              {t("Back to my story")}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <DraftPreview
          draft={draft}
          onChange={setDraft}
          input={input}
          disabled={!!busy}
        />
      </div>
    );
  return (
    <form ref={form} className="story-start story-form" onSubmit={onSubmit}>
      <span className="eyebrow">{t("EVERY ENDING DESERVES A RECORD")}</span>
      <h1 ref={heading} tabIndex={-1}>
        {t("Tell us what happened.")}
      </h1>
      <p className="story-helper">
        {t(
          "Write it like you're explaining the project to a friend. You can also paste a README, old launch post, notes or anything else you still have.",
        )}
      </p>
      <p className="story-helper autopsy-hint">
        {t("Is it on GitHub?")}{" "}
        <LocalLink href="/autopsy" className="text-link">
          {t("Let Deadfolio read the repository instead.")}
        </LocalLink>
      </p>
      <fieldset disabled={!!busy} className="story-fields">
        <label className="field">
          <span>{t("Project name")}</span>
          <input
            name="title"
            value={input.title}
            required
            minLength={2}
            maxLength={100}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>
        <label className="story-textarea">
          <span className="sr-only">{t("Your project’s story")}</span>
          <textarea
            name="story"
            value={input.story}
            required
            minLength={50}
            maxLength={15000}
            rows={10}
            aria-describedby="story-length"
            placeholder={t(
              "What did you build? Why did you stop? What did you learn?",
            )}
            onChange={(e) => update("story", e.target.value)}
          />
          <span id="story-length" className="mono">
            {input.story.length.toLocaleString(
              locale === "pt" ? "pt-BR" : "en-US",
            )}{" "}
            / 15,000
          </span>
        </label>
        <label className="field">
          <span>{t("Project URL or GitHub (optional)")}</span>
          <input
            name="url"
            type="url"
            placeholder="https://…"
            maxLength={2048}
            value={input.url}
            onChange={(e) => update("url", e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("What should happen to the project?")}</span>
          <select
            value={input.nextStep}
            onChange={(e) =>
              update("nextStep", e.target.value as RawSubmission["nextStep"])
            }
          >
            {Object.entries(nextSteps).map(([key, label]) => (
              <option key={key} value={key}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
        <div className="field-grid">
          <label className="field">
            <span>{t("Creator name")}</span>
            <input
              name="creatorName"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={input.creatorName}
              onChange={(e) => update("creatorName", e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("Creator email")}</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={input.email}
              aria-describedby="email-note"
              onChange={(e) => update("email", e.target.value)}
            />
          </label>
        </div>
      </fieldset>
      <p id="email-note" className="privacy-note">
        {t("Your email stays private and is only used for moderation.")}
      </p>
      {failedAI && (
        <p role="alert" className="notice">
          {t(
            "Couldn't build the postmortem automatically. You can still submit your story and we'll review it.",
          )}
        </p>
      )}
      {aiEnabled && !failedAI && (
        <p className="privacy-note">
          {t(
            "Formatting sends only your story and project name to Google Gemini. Keep secrets and personal information out of the story.",
          )}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary wide" disabled={!!busy} type="submit">
        {busy && <LoaderCircle size={18} className="spin" />}
        {t(
          busy === "build"
            ? "Building your postmortem…"
            : busy === "save"
              ? "Submitting…"
              : aiEnabled && !failedAI
                ? "✨ Build my postmortem"
                : "Submit my story",
        )}
      </button>
      {aiEnabled && !failedAI && (
        <button
          className="button manual-link"
          type="button"
          disabled={!!busy}
          onClick={() => void submit(true)}
        >
          {t("Submit without formatting")}
        </button>
      )}
      <div className="submission-footnote mono">
        {t("NO ACCOUNT. NO SUCCESS STORY REQUIRED.")}
        <br />
        {t("ALL SUBMISSIONS ARE REVIEWED BEFORE PUBLISHING.")}
      </div>
    </form>
  );
}
