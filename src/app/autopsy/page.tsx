import { Suspense } from "react";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { autopsyLimits } from "@/lib/autopsy/config";
import { GitHubError } from "@/lib/github/client";
import { validUsername } from "@/lib/github/reference";
import { discoverRepositories } from "@/lib/github/discovery";
import { summarizeScan } from "@/lib/github/dead-score";
import { clientKey, rateLimit } from "@/lib/security";
import { EntryModes, type EntryMode } from "@/components/autopsy/entry-modes";
import { RepositoryList } from "@/components/autopsy/repository-list";
import ArchiveLoading from "@/components/ui/archive-loading";

export async function generateMetadata() {
  return pageMetadata(
    "/autopsy",
    "Repository Autopsy",
    "Scan a public GitHub profile for forgotten projects, or paste a repository and run an evidence-based autopsy.",
  );
}
export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

export default async function AutopsyPage({
  searchParams,
}: {
  searchParams: Promise<{
    user?: string | string[];
    mode?: string | string[];
  }>;
}) {
  const t = await getTranslations();
  const params = await searchParams;
  const user = first(params.user);
  const mode: EntryMode = first(params.mode) === "repo" && !user ? "repo" : "scan";
  return (
    <div className="shell page-space autopsy-page">
      <header className="page-heading autopsy-heading">
        <span className="eyebrow">{t("EVIDENCE FIRST. STORIES SECOND.")}</span>
        <h1>
          {t("Repository Autopsy")}
          <span className="accent">.</span>
        </h1>
        <p>
          {t(
            "Find the projects that stopped moving, then let one autopsy explain what happened, what survived and whether it deserves another shot.",
          )}
        </p>
        <EntryModes initialMode={mode} initialUser={user} />
      </header>
      {user && (
        <Suspense fallback={<ArchiveLoading />}>
          <ScanResults user={user} />
        </Suspense>
      )}
      {!user && <HowItWorks />}
    </div>
  );
}

async function ScanResults({ user }: { user: string }) {
  const t = await getTranslations();
  if (!validUsername(user))
    return <p className="notice">{t("Enter a valid GitHub username.")}</p>;
  if (!rateLimit(`scan:${await clientKey()}`, 30))
    return (
      <p className="notice" role="alert">
        {t("Too many scans from your connection. Try again in an hour.")}
      </p>
    );
  const result = await discoverRepositories(user).then(
    (discovery) => ({ discovery, error: null }),
    (error: unknown) => ({
      discovery: null,
      error:
        error instanceof GitHubError
          ? error
          : new GitHubError("unavailable", "Discovery failed."),
    }),
  );
  if (result.discovery)
    return (
      <RepositoryList
        login={result.discovery.login}
        repositories={result.discovery.repositories}
        summary={summarizeScan(result.discovery.repositories)}
        truncated={result.discovery.truncated}
        limit={autopsyLimits().maxRepositoriesPerScan}
      />
    );
  const locale = await getLocale();
  const reset = result.error.resetAt
    ? result.error.resetAt.toLocaleTimeString(
        locale === "pt" ? "pt-BR" : "en-US",
        { hour: "2-digit", minute: "2-digit" },
      )
    : null;
  return (
    <p className="notice" role="alert">
      {t(
        result.error.kind === "not-found"
          ? "No GitHub user with that name."
          : result.error.kind === "rate-limited"
            ? "GitHub is rate-limiting us right now. Try again shortly."
            : result.error.kind === "invalid"
              ? "Enter a valid GitHub username."
              : "GitHub could not be reached. Try again shortly.",
      )}
      {reset && ` ${t("Quota resets at")} ${reset}.`}
    </p>
  );
}

async function HowItWorks() {
  const t = await getTranslations();
  const steps: [string, string][] = [
    [
      "Scan",
      "Up to 100 public repositories are scored from metadata alone: last push, age, archive status, forks. No AI involved.",
    ],
    [
      "Autopsy",
      "Pick one. Deadfolio collects the README, manifests, tree, recent activity and a dozen architecture-defining files. Secrets and build output are never read.",
    ],
    [
      "Confirm",
      "One Gemini pass separates evidence from inference and admits what the repository cannot prove. You confirm or correct the cause of death in one sentence.",
    ],
    [
      "Preserve",
      "Add the project to your Deadfolio. The report becomes the first draft of the postmortem; editing is optional.",
    ],
  ];
  return (
    <ol className="how-it-works">
      {steps.map(([title, body], i) => (
        <li key={title}>
          <span className="section-number">
            {String(i + 1).padStart(2, "0")} / {t(title).toUpperCase()}
          </span>
          <p>{t(body)}</p>
        </li>
      ))}
    </ol>
  );
}
