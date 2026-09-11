"use client";
import { useState } from "react";
import { ArrowRight, LoaderCircle, PenLine } from "lucide-react";
import { emptySubmission } from "@/lib/schemas/empty-submission";
import { ProjectEditor } from "./project-editor";
import type { ProjectSubmission, ProjectDraft } from "@/types/project";
import { trackEvent } from "@/components/analytics";
export function StoryInput({ aiEnabled }: { aiEnabled: boolean }) {
  const [story, setStory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<ProjectSubmission | null>(null);
  function manual() {
    setDraft({ ...structuredClone(emptySubmission), originalIdea: story });
    trackEvent("Submission started");
  }
  async function build() {
    setBusy(true);
    setError("");
    trackEvent("Submission started");
    try {
      const response = await fetch("/api/ai/project-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
        signal: AbortSignal.timeout(55000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const extracted = result.draft as ProjectDraft;
      const clean = Object.fromEntries(
        Object.entries(extracted).filter(([, v]) => v !== null),
      );
      setDraft({
        ...structuredClone(emptySubmission),
        ...clean,
        desiredNextSteps: extracted.desiredNextSteps.length
          ? extracted.desiredNextSteps
          : ["let-it-rest"],
      } as ProjectSubmission);
      trackEvent("AI draft generated");
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "We couldn't format your story automatically. Nothing was lost.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (draft) return <ProjectEditor initial={draft} story={story} />;
  return (
    <div className="story-start">
      <span className="eyebrow">EVERY ENDING DESERVES A RECORD</span>
      <h1>
        Bury a Project<span className="accent">.</span>
      </h1>
      <p className="story-subtitle">
        Don’t fill out a boring form.
        <br />
        Just tell us what happened.
      </p>
      <label className="story-textarea">
        <span className="sr-only">Your project’s story</span>
        <textarea
          value={story}
          maxLength={15000}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Tell us about your project like you’re explaining it to a friend. What did you build? How far did you get? Why did you stop? What still exists?"
          rows={9}
        />
        <span className="mono">
          {story.length.toLocaleString("en-US")} / 15,000
        </span>
      </label>
      <p className="story-helper">
        You can also paste a README, old launch post, project notes or product
        description.
      </p>
      {aiEnabled ? (
        <>
          <p className="privacy-note">
            Formatting sends this text to Google Gemini. Keep secrets and
            personal information out of your story.
          </p>
          <button
            className="button primary wide"
            disabled={busy || story.trim().length < 50}
            onClick={build}
          >
            {busy ? (
              <>
                <LoaderCircle size={19} className="spin" />
                Examining the remains…
              </>
            ) : (
              <>
                Build my postmortem <ArrowRight size={18} />
              </>
            )}
          </button>
          {busy && (
            <p className="processing" role="status">
              Turning your story into a project postmortem.
            </p>
          )}
        </>
      ) : (
        <div className="notice">
          The autopsy assistant is offline. You can still bury your project
          manually.
        </div>
      )}
      {error && (
        <div role="alert" className="form-error">
          <p>We couldn’t format your story automatically. Nothing was lost.</p>
          {!error.includes("Nothing was lost") && <p>{error}</p>}
        </div>
      )}
      <button
        className={`button ${!aiEnabled || error ? "primary wide" : "manual-link"}`}
        disabled={busy}
        onClick={manual}
      >
        <PenLine size={17} />
        {error ? "Continue manually" : "I’d rather fill it out manually"}
      </button>
      <div className="submission-footnote mono">
        NO ACCOUNT. NO SUCCESS STORY REQUIRED.
        <br />
        ALL SUBMISSIONS ARE REVIEWED BEFORE PUBLISHING.
      </div>
    </div>
  );
}
