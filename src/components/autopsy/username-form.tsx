"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale";
import { localePath } from "@/lib/i18n/dictionaries";
import { parseUsername } from "@/lib/github/reference";
import { trackEvent } from "@/components/analytics";

/** Accepts a login or a profile URL and navigates to the server-rendered scan. */
export function UsernameForm({ initial = "" }: { initial?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const login = parseUsername(value);
    if (!login) {
      setError(t("Enter a valid GitHub username."));
      return;
    }
    setError("");
    trackEvent("Repository scan started");
    startTransition(() => {
      router.push(
        `${localePath(locale, "/autopsy")}?user=${encodeURIComponent(login)}`,
      );
    });
  }
  return (
    <form className="username-form" onSubmit={onSubmit} role="search">
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
        {t(busy ? "Scanning…" : "Find my forgotten projects")}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
