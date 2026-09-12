"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { LocalLink, useLocale, useTranslations } from "@/components/locale";
import { DraftPreview } from "@/components/submission/draft-preview";
import { publishAutopsy } from "@/app/actions";
import { trackEvent } from "@/components/analytics";
import { nextSteps, projectDraftSchema } from "@/lib/schemas/project";
import { autopsyToDraft } from "@/lib/autopsy/draft";
import type { ProjectDraft, RawSubmission } from "@/types/project";
import type { StoredAutopsy } from "@/types/autopsy";

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
  const [email, setEmail] = useState("");
  const [nextStep, setNextStep] =
    useState<RawSubmission["nextStep"]>("let-it-rest");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
            t("Some edited details are too long. Shorten them before submitting."),
          );
          return;
        }
        cleanDraft = parsed.data;
      }
      const result = await publishAutopsy({
        key: autopsy.key,
        creatorName,
        email,
        nextStep,
        locale,
        ...correction,
        draft: cleanDraft,
      });
      if (!result.ok || !result.id) {
        setError(
          t(
            result.error === "rate-limit"
              ? "Too many submissions. Please try again in an hour."
              : "We couldn’t file this autopsy. Your details are still here. Please try again.",
          ),
        );
        return;
      }
      trackEvent("Autopsy published");
      setSuccess(result.id);
      requestAnimationFrame(() => heading.current?.focus());
    } catch {
      setError(
        t(
          "We couldn’t file this autopsy. Your details are still here. Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (success)
    return (
      <section className="publish-panel submission-success">
        <div className="success-icon">
          <Check size={30} />
        </div>
        <h2 ref={heading} tabIndex={-1}>
          {t("Autopsy filed.")}
        </h2>
        <p>
          {t(
            "We’ll review it before it enters the public archive. The cause of death you confirmed is the one we keep.",
          )}
        </p>
        <div className="submission-id">
          <span>{t("Submission reference")}</span>
          <code>{success}</code>
        </div>
        <LocalLink href="/graveyard" className="button primary">
          {t("Back to the Graveyard")}
        </LocalLink>
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
          <label className="field actual-cause">
            <span>{t("What actually killed it?")}</span>
            <textarea
              rows={2}
              maxLength={500}
              value={actualCause}
              placeholder={t("One or two sentences is plenty.")}
              onChange={(e) => setActualCause(e.target.value)}
            />
            <small>{t("Your answer replaces the inferred cause everywhere it is shown.")}</small>
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
          <span className="eyebrow">{t("FILE THIS POSTMORTEM")}</span>
          <fieldset disabled={busy} className="story-fields">
            <div className="field-grid">
              <label className="field">
                <span>{t("Creator name")}</span>
                <input
                  name="creatorName"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span>{t("What should happen to the project?")}</span>
              <select
                value={nextStep}
                onChange={(e) =>
                  setNextStep(e.target.value as RawSubmission["nextStep"])
                }
              >
                {Object.entries(nextSteps).map(([key, label]) => (
                  <option key={key} value={key}>
                    {t(label)}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <p className="privacy-note">
            {t("Your email stays private and is only used for moderation.")}{" "}
            {t("ALL SUBMISSIONS ARE REVIEWED BEFORE PUBLISHING.")}
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="hero-buttons">
            <button className="button primary" type="submit" disabled={busy}>
              {busy && <LoaderCircle size={18} className="spin" />}
              {t(busy ? "Filing…" : "Publish")}
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
              <DraftPreview
                draft={draft}
                onChange={setDraft}
                disabled={busy}
                input={{
                  title: draft.title || autopsy.repository.name,
                  story: "",
                  url: autopsy.repository.htmlUrl,
                  nextStep,
                  creatorName: creatorName || "—",
                  email,
                  locale,
                }}
              />
            </div>
          )}
        </form>
      )}
    </section>
  );
}
