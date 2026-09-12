"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Microscope, Link2 } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale";
import { localePath } from "@/lib/i18n/dictionaries";
import { parseRepositoryReference } from "@/lib/github/reference";
import { trackEvent } from "@/components/analytics";

/**
 * Direct entry: a repository URL or `owner/repository`. Validation is local;
 * the autopsy page fetches metadata and starts the same autopsy service the
 * scan flow uses.
 */
export function RepositoryForm() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const reference = parseRepositoryReference(value);
    if (!reference) {
      setError(t("That doesn’t look like a GitHub repository URL."));
      return;
    }
    setError("");
    setBusy(true);
    trackEvent("Repository pasted");
    router.push(
      `${localePath(locale, `/autopsy/${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.repo)}`)}?run=1`,
    );
  }
  return (
    <form className="username-form repository-form" onSubmit={onSubmit}>
      <label className="username-field">
        <span className="sr-only">{t("GitHub repository URL")}</span>
        <Link2 size={18} aria-hidden="true" />
        <input
          name="repository"
          type="text"
          inputMode="url"
          value={value}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={300}
          placeholder="https://github.com/owner/repository"
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
        />
      </label>
      <button className="button primary" type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle size={18} className="spin" aria-hidden="true" />
        ) : (
          <Microscope size={18} aria-hidden="true" />
        )}
        {t(busy ? "Opening…" : "Run Repository Autopsy")}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
