import { Suspense } from "react";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { autopsyLimits } from "@/lib/autopsy/config";
import { GitHubError, validUsername } from "@/lib/github/client";
import { discoverRepositories } from "@/lib/github/discovery";
import { clientKey, rateLimit } from "@/lib/security";
import { UsernameForm } from "@/components/autopsy/username-form";
import { RepositoryList } from "@/components/autopsy/repository-list";
import ArchiveLoading from "@/components/ui/archive-loading";

export async function generateMetadata() {
  return pageMetadata(
    "/autopsy",
    "Repository Autopsy",
    "Enter a GitHub username. Deadfolio finds the forgotten repositories and produces an evidence-based postmortem for the ones you choose.",
  );
}
export const dynamic = "force-dynamic";

export default async function AutopsyPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string | string[] }>;
}) {
  const t = await getTranslations();
  const raw = (await searchParams).user;
  const user = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
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
            "Enter a GitHub username. Deadfolio finds the repositories that stopped moving and, only when you ask, examines one and writes a skeptical, evidence-based postmortem.",
          )}
        </p>
        <UsernameForm initial={user} />
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
      "Discover",
      "Up to 100 public repositories are scored from metadata alone: last push, age, archive status, forks. No AI involved.",
    ],
    [
      "Examine",
      "Pick one. Deadfolio collects the README, manifests, tree, recent activity and a dozen architecture-defining files. Secrets and build output are never read.",
    ],
    [
      "Report",
      "One Gemini pass separates evidence from inference and admits what the repository cannot prove. The result is cached per commit for everyone.",
    ],
    [
      "Correct and file",
      "You confirm or correct the cause of death in one sentence, then add it to your Deadfolio. Editing is optional.",
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
