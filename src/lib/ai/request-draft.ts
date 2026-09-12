import { projectDraftSchema } from "@/lib/schemas/project";
import type { RawSubmission } from "@/types/project";

/** The formatting request deliberately excludes the creator and private email. */
export async function requestDraft(
  input: Pick<RawSubmission, "story" | "title" | "locale">,
  send: typeof fetch = fetch,
) {
  const response = await send("/api/ai/project-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      story: input.story,
      title: input.title,
      locale: input.locale,
    }),
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok) throw new Error("format-failed");
  return projectDraftSchema.parse((await response.json()).draft);
}
