import "server-only";
import { autopsyModel, githubConfigured } from "@/lib/autopsy/config";

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Development-only status line. Says whether each integration is configured
 * without ever printing a secret. Called once from `instrumentation.ts`.
 */
export function logIntegrationStatus() {
  if (process.env.NODE_ENV === "production") return;
  console.info(
    aiConfigured()
      ? `[deadfolio] Gemini: GEMINI_API_KEY present, repository autopsies enabled (model ${autopsyModel()}).`
      : "[deadfolio] Gemini: GEMINI_API_KEY missing. Repository scanning works; autopsies will show a configuration error.",
  );
  console.info(
    githubConfigured()
      ? "[deadfolio] GitHub: GITHUB_TOKEN present, authenticated API requests."
      : "[deadfolio] GitHub: GITHUB_TOKEN missing. Unauthenticated requests are limited to 60/hour per IP; scans may hit the limit quickly.",
  );
}
