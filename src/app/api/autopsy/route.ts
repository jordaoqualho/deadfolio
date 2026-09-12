import { z } from "zod";
import { GitHubError } from "@/lib/github/client";
import { AutopsyServiceError, runAutopsy } from "@/lib/services/autopsy";
import { clientKey, sameOrigin } from "@/lib/security";

export const maxDuration = 60;

/**
 * Error codes are translated client-side. Provider messages never reach the
 * visitor; server logs keep the detail.
 */
const failure = (code: string, status: number, resetAt?: Date) =>
  Response.json(
    { error: code, ...(resetAt ? { resetAt: resetAt.toISOString() } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );

export async function POST(request: Request) {
  if (!(await sameOrigin(request))) return failure("forbidden", 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("invalid", 400);
  }
  const input = z
    .object({
      owner: z.string().trim().min(1).max(39),
      repo: z.string().trim().min(1).max(100),
      locale: z.enum(["en", "pt"]).default("en"),
    })
    .safeParse(body);
  if (!input.success) return failure("invalid", 400);
  try {
    const result = await runAutopsy({
      ...input.data,
      client: await clientKey(),
    });
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof GitHubError) {
      if (error.kind === "rate-limited")
        return failure("github-rate-limited", 503, error.resetAt);
      if (error.kind === "not-found" || error.kind === "invalid")
        return failure("not-found", 404);
      if (error.kind === "empty") return failure("empty", 422);
      return failure("github-unavailable", 503);
    }
    if (error instanceof AutopsyServiceError) {
      const status: Record<AutopsyServiceError["kind"], number> = {
        "ai-disabled": 503,
        "daily-limit": 429,
        concurrent: 429,
        busy: 429,
        quota: 503,
        transient: 503,
        failed: 502,
      };
      return failure(error.kind, status[error.kind]);
    }
    console.error(
      "Autopsy failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return failure("failed", 502);
  }
}
