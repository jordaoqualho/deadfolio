"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale";
import { localePath } from "@/lib/i18n/dictionaries";
import { trackEvent } from "@/components/analytics";

const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Accepts a login or a profile URL and navigates to the server-rendered scan. */
export function UsernameForm({
  initial = "",
  compact = false,
}: {
  initial?: string;
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const login = value
      .trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
      .replace(/^@/, "")
      .split(/[/?#]/)[0];
    if (!USERNAME.test(login)) {
      setError(t("Enter a valid GitHub username."));
      return;
    }
    setError("");
    setBusy(true);
    trackEvent("Repository scan started");
    router.push(
      `${localePath(locale, "/autopsy")}?user=${encodeURIComponent(login)}`,
    );
  }
  return (
    <form
      className={`username-form${compact ? " compact" : ""}`}
      onSubmit={onSubmit}
      role="search"
    >
      <label className="username-field">
        <span className="sr-only">{t("GitHub username")}</span>
        <Search size={18} aria-hidden="true" />
        <span className="username-prefix mono" aria-hidden="true">
          github.com/
        </span>
        <input
          name="user"
          value={value}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={120}
          placeholder={t("username")}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
        />
      </label>
      <button className="button primary" type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle size={18} className="spin" />
        ) : (
          <ArrowRight size={18} />
        )}
        {t(busy ? "Scanning…" : "Find forgotten projects")}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
