"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { LocalLink, useLocale, useTranslations } from "@/components/locale";
import { publishAutopsy } from "@/app/actions";
import { trackEvent } from "@/components/analytics";
import { nextSteps, projectDraftSchema } from "@/lib/schemas/project";
import { autopsyToDraft } from "@/lib/autopsy/draft";
import type { NextStep, ProjectDraft } from "@/types/project";
import type { StoredAutopsy } from "@/types/autopsy";
import { DraftEditor } from "./draft-editor";

type Confirmation = "unanswered" | "agree" | "disagree";

export function PublishPanel({ autopsy }: { autopsy: StoredAutopsy }) {
  const t = useTranslations();
  const locale = useLocale();
  const [confirmation, setConfirmation] = useState<Confirmation>("unanswered");
  const [actualCause, setActualCause] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [creatorName, setCreatorName] = useState("");
  const [nextStep, setNextStep] = useState<NextStep>("let-it-rest");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState<{ slug: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const correction = {
    causeConfirmed: confirmation !== "disagree",
    actualCause: confirmation === "disagree" ? actualCause : "",
  };

  function startEditing() {
    setDraft((current) => current ?? autopsyToDraft(autopsy, correction));
    setEditing(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !form.current?.reportValidity()) return;
    setBusy(true);
    setError("");
    try {
      let cleanDraft: ProjectDraft | undefined;
      if (editing && draft) {
        const parsed = projectDraftSchema.safeParse({
          ...draft,
          ...Object.fromEntries(
            Object.entries(draft)
              .filter(([, value]) => Array.isArray(value))
              .map(([key, value]) => [
                key,
                (value as string[]).map((v) => v.trim()).filter(Boolean),
              ]),
          ),
        });
        if (!parsed.success) {
          setError(
            t("Some edited details are too long. Shorten them before publishing."),
          );
          return;
        }
        cleanDraft = parsed.data;
      }
      const result = await publishAutopsy({
        key: autopsy.key,
        creatorName,
        nextStep,
        locale,
        confirmation,
        actualCause: correction.actualCause,
        draft: cleanDraft,
      });
      if (!result.ok || !result.slug) {
        setError(
          t(
            result.error === "rate-limit"
              ? "Too many publications from your connection. Please try again in an hour."
              : "We couldn’t publish this autopsy. Your details are still here. Please try again.",
          ),
        );
        return;
      }
      trackEvent("Autopsy published");
      setPublished({ slug: result.slug });
      requestAnimationFrame(() => heading.current?.focus());
    } catch {
      setError(
        t(
          "We couldn’t publish this autopsy. Your details are still here. Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (published)
    return (
      <section className="publish-panel submission-success">
        <div className="success-icon">
          <Check size={30} />
        </div>
        <h2 ref={heading} tabIndex={-1}>
          {t("Added to your Deadfolio.")}
        </h2>
        <p>
          {t(
            "The project is public in the Graveyard now. It is marked as filed by an unverified creator, because Deadfolio cannot yet prove who owns a repository.",
          )}
        </p>
        <div className="hero-buttons">
          <LocalLink href={`/projects/${published.slug}`} className="button primary">
            {t("Open the postmortem")} <ArrowRight size={18} />
          </LocalLink>
          <LocalLink href="/graveyard" className="button secondary">
            {t("Back to the Graveyard")}
          </LocalLink>
        </div>
      </section>
    );

  return (
    <section className="publish-panel">
      <div className="confirmation">
        <span className="section-number">{t("11 / THE CREATOR")}</span>
        <h2>{t("Did we get the cause of death right?")}</h2>
        <div className="confirmation-actions" role="group">
          <button
            type="button"
            className={`button ${confirmation === "agree" ? "primary" : "secondary"}`}
            aria-pressed={confirmation === "agree"}
            onClick={() => {
              setConfirmation("agree");
              trackEvent("Autopsy cause confirmed");
            }}
          >
            {t("Pretty much")}
          </button>
          <button
            type="button"
            className={`button ${confirmation === "disagree" ? "primary" : "secondary"}`}
            aria-pressed={confirmation === "disagree"}
            onClick={() => {
              setConfirmation("disagree");
              trackEvent("Autopsy cause disputed");
            }}
          >
            {t("Not really")}
          </button>
        </div>
        {confirmation === "disagree" && (
          <label className="field actual-cause creator-voice">
            <span>{t("What actually killed it?")}</span>
            <textarea
              rows={2}
              maxLength={500}
              value={actualCause}
              placeholder={t("One or two sentences is plenty.")}
              onChange={(e) => setActualCause(e.target.value)}
            />
            <small>
              {t("Your answer replaces the inferred cause everywhere it is shown, and is labeled as the creator’s account.")}
            </small>
          </label>
        )}
      </div>

      {!open ? (
        <div className="publish-cta">
          <button
            type="button"
            className="button primary"
            onClick={() => {
              setOpen(true);
              trackEvent("Add to Deadfolio clicked");
            }}
          >
            {t("Add to my Deadfolio")} <ArrowRight size={18} />
          </button>
          <p className="privacy-note">
            {t("The report becomes the first draft of your postmortem. Editing is optional.")}
          </p>
        </div>
      ) : (
        <form ref={form} className="publish-form" onSubmit={submit}>
          <span className="eyebrow">{t("PUBLISH TO THE GRAVEYARD")}</span>
          <fieldset disabled={busy} className="story-fields">
            <div className="field-grid">
              <label className="field">
                <span>{t("Display name (optional)")}</span>
                <input
                  name="creatorName"
                  autoComplete="nickname"
                  maxLength={100}
                  value={creatorName}
                  placeholder={autopsy.repository.owner}
                  onChange={(e) => setCreatorName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t("What should happen to the project?")}</span>
                <select
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value as NextStep)}
                >
                  {Object.entries(nextSteps).map(([key, label]) => (
                    <option key={key} value={key}>
                      {t(label)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
          <p className="privacy-note">
            {t(
              "Publishing is immediate and public. Deadfolio does not verify repository ownership yet, so the record is labeled as unverified.",
            )}
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="hero-buttons">
            <button className="button primary" type="submit" disabled={busy}>
              {busy && <LoaderCircle size={18} className="spin" />}
              {t(busy ? "Publishing…" : "Publish")}
            </button>
            {!editing && (
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={startEditing}
              >
                {t("Edit details")}
              </button>
            )}
          </div>
          {editing && draft && (
            <div className="publish-editor">
              <DraftEditor draft={draft} onChange={setDraft} disabled={busy} />
            </div>
          )}
        </form>
      )}
    </section>
  );
}
