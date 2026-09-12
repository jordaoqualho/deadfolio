"use client";
import { useRef, useState } from "react";
import { LoaderCircle, Microscope } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale";
import { trackEvent } from "@/components/analytics";
import { storedAutopsySchema } from "@/lib/schemas/autopsy";
import { formatDate } from "@/lib/autopsy/format";
import type { AutopsyLookup, StoredAutopsy } from "@/types/autopsy";
import { AutopsyReport } from "./autopsy-report";
import { PublishPanel } from "./publish-panel";

const ERROR_COPY: Record<string, string> = {
  "daily-limit":
    "You’ve reached today’s autopsy limit. Cached autopsies still open instantly; new ones unlock tomorrow.",
  concurrent: "An autopsy is already running for you. Give it a moment.",
  busy: "The lab is at capacity right now. Try again in a few minutes.",
  quota:
    "Our AI quota is exhausted for the moment. Nothing was lost; try again later.",
  transient: "The analysis didn’t complete. Try once more in a minute.",
  failed: "We couldn’t produce a reliable report for this repository.",
  "ai-disabled": "Autopsies are not enabled on this deployment.",
  "github-rate-limited":
    "GitHub is rate-limiting us right now. Repository browsing still works; try the autopsy again shortly.",
  "github-unavailable": "GitHub could not be reached. Try again shortly.",
  "not-found": "This repository is not publicly accessible.",
  empty: "This repository has no commits to examine.",
  network: "The connection dropped before the report arrived. Try again.",
};

export function RunAutopsy({
  owner,
  repo,
  lookup,
  aiEnabled,
}: {
  owner: string;
  repo: string;
  lookup: AutopsyLookup;
  aiEnabled: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [autopsy, setAutopsy] = useState<StoredAutopsy | null>(
    lookup.state === "ready" ? lookup.autopsy : null,
  );
  const [previous] = useState<StoredAutopsy | null>(
    lookup.state === "outdated" ? lookup.autopsy : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetAt, setResetAt] = useState<string | null>(null);
  const locked = useRef(false);

  async function run() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setResetAt(null);
    trackEvent("Autopsy requested");
    try {
      const response = await fetch("/api/autopsy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, locale }),
        signal: AbortSignal.timeout(75000),
      });
      const body = (await response.json().catch(() => ({}))) as {
        autopsy?: unknown;
        cached?: boolean;
        error?: string;
        resetAt?: string;
      };
      if (!response.ok) {
        setError(t(ERROR_COPY[body.error ?? ""] ?? ERROR_COPY.failed));
        if (body.resetAt) setResetAt(body.resetAt);
        return;
      }
      const parsed = storedAutopsySchema.safeParse(body.autopsy);
      if (!parsed.success) {
        setError(t(ERROR_COPY.failed));
        return;
      }
      setAutopsy(parsed.data);
      trackEvent(body.cached ? "Autopsy served from cache" : "Autopsy generated");
      requestAnimationFrame(() =>
        document.getElementById("autopsy-report")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    } catch {
      setError(t(ERROR_COPY.network));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  const shown = autopsy ?? previous;
  return (
    <>
      {!autopsy && (
        <section className="run-autopsy">
          {previous ? (
            <>
              <span className="eyebrow">{t("REPOSITORY CHANGED")}</span>
              <h2>{t("New activity detected. Run a new autopsy?")}</h2>
              <p>
                {t("The report below is from")}{" "}
                <code className="mono">{previous.sha.slice(0, 7)}</code>{" "}
                ({formatDate(previous.createdAt, locale)}).{" "}
                {t("The default branch has moved since then.")}
              </p>
            </>
          ) : (
            <>
              <span className="eyebrow">{t("NO AUTOPSY ON FILE")}</span>
              <h2>{t("Nobody has examined this repository yet.")}</h2>
              <p>
                {t(
                  "Deadfolio reads the public README, manifests, tree and a handful of architecture-defining files, then asks Gemini for a skeptical, evidence-based report. One generation per repository version; results are cached for everyone.",
                )}
              </p>
            </>
          )}
          {aiEnabled ? (
            <button
              type="button"
              className="button primary autopsy-run-button"
              disabled={busy}
              onClick={() => void run()}
            >
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <Microscope size={18} />
              )}
              {t(
                busy
                  ? "Examining the repository…"
                  : previous
                    ? "Run a new autopsy"
                    : "🔬 Run Autopsy",
              )}
            </button>
          ) : (
            <p className="notice">{t(ERROR_COPY["ai-disabled"])}</p>
          )}
          {busy && (
            <p className="processing mono">
              {t("Collecting evidence, then one Gemini pass. Usually under a minute.")}
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
              {resetAt && ` ${t("Quota resets at")} ${new Date(resetAt).toLocaleTimeString(locale === "pt" ? "pt-BR" : "en-US", { hour: "2-digit", minute: "2-digit" })}.`}
            </p>
          )}
          <p className="privacy-note">
            {t(
              "Only public repository content is analyzed. Files that look like secrets, build output, vendored code or binaries are never collected.",
            )}
          </p>
        </section>
      )}
      {shown && (
        <div id="autopsy-report">
          <AutopsyReport autopsy={shown}>
            <PublishPanel key={shown.key} autopsy={shown} />
          </AutopsyReport>
        </div>
      )}
    </>
  );
}
