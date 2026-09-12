import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  emptyProjectContent,
  nextStepSchema,
  projectDraftSchema,
  storedProjectSchema,
} from "@/lib/schemas/project";
import {
  autopsyCopy,
  autopsyToDraft,
  type CauseCorrection,
} from "@/lib/autopsy/draft";
import type { ProjectRepository } from "@/lib/repositories/project-repository";
import type { StoredProject } from "@/types/project";
import type { StoredAutopsy } from "@/types/autopsy";

export { autopsyToDraft } from "@/lib/autopsy/draft";

export const autopsyPublishSchema = z.object({
  key: z.string().min(3).max(400),
  creatorName: z.string().trim().max(100).default(""),
  nextStep: nextStepSchema,
  locale: z.enum(["en", "pt"]).default("en"),
  confirmation: z.enum(["agree", "disagree", "unanswered"]),
  actualCause: z.string().trim().max(500).default(""),
  draft: projectDraftSchema.optional(),
});
export type AutopsyPublishInput = z.infer<typeof autopsyPublishSchema>;

/** GitHub homepages are free text; only clean http(s) URLs survive. */
function safeHttpUrl(value: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function developmentSpan(autopsy: StoredAutopsy) {
  const t = autopsyCopy[autopsy.locale];
  const created = new Date(autopsy.repository.createdAt);
  const pushed = new Date(autopsy.repository.pushedAt ?? autopsy.createdAt);
  const days = Math.max(
    0,
    Math.round((pushed.getTime() - created.getTime()) / 86400000),
  );
  const month = (d: Date) => d.toISOString().slice(0, 7);
  return {
    developmentPeriod:
      month(created) === month(pushed)
        ? month(created)
        : `${month(created)} – ${month(pushed)}`,
    developmentDuration:
      days < 45
        ? t.days(Math.max(1, days))
        : t.months(Math.round(days / 30.44)),
  };
}

export function slugify(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 65) || "project"
  );
}

/**
 * Publishes a Graveyard record built from a cached autopsy. There is no
 * moderation step; the record is public immediately and is marked as filed by
 * an unverified creator, because the MVP cannot prove repository ownership.
 * The creator's correction, when present, is the authoritative cause.
 */
export async function publishAutopsyProject(
  autopsy: StoredAutopsy,
  input: AutopsyPublishInput,
  repository: ProjectRepository,
): Promise<StoredProject> {
  const correction: CauseCorrection = {
    causeConfirmed: input.confirmation !== "disagree",
    actualCause: input.confirmation === "disagree" ? input.actualCause : "",
  };
  const draft = input.draft ?? autopsyToDraft(autopsy, correction);
  const facts = Object.fromEntries(
    Object.entries(draft).filter(([, value]) => value !== null),
  );
  const id = randomUUID();
  const title = (draft.title || autopsy.repository.name).slice(0, 100);
  const verdict = autopsy.report.repositoryStatus.verdict;
  const now = new Date().toISOString();
  const creatorCorrected = Boolean(
    input.confirmation === "disagree" && correction.actualCause.trim(),
  );
  const project = storedProjectSchema.parse({
    ...structuredClone(emptyProjectContent),
    ...facts,
    ...developmentSpan(autopsy),
    id,
    slug: `${slugify(title)}-${id.slice(0, 8)}`,
    title,
    status:
      verdict === "archived" ||
      verdict === "likely-dead" ||
      verdict === "probably-abandoned"
        ? "dead"
        : "frozen",
    creator: {
      ...emptyProjectContent.creator,
      name: input.creatorName || autopsy.repository.owner,
      github: `https://github.com/${autopsy.repository.owner}`,
    },
    links: {
      ...emptyProjectContent.links,
      github: autopsy.repository.htmlUrl,
      website: safeHttpUrl(autopsy.repository.homepage),
    },
    desiredNextSteps: [input.nextStep],
    locale: input.locale,
    autopsyKey: autopsy.key,
    source: "autopsy",
    ownershipVerified: false,
    // Agreeing with the inference is still the creator's call. Silence, or a
    // "not really" with no explanation, leaves the cause marked as inference.
    causeSource:
      creatorCorrected || input.confirmation === "agree"
        ? "creator"
        : "inferred",
    createdAt: now,
    publishedAt: now,
    isDemo: false,
  });
  await repository.save(project);
  return project;
}
