import { randomUUID } from "node:crypto";
import { z } from "zod";
import { emptySubmission } from "@/lib/schemas/empty-submission";
import {
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
  creatorName: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  nextStep: nextStepSchema,
  locale: z.enum(["en", "pt"]).default("en"),
  causeConfirmed: z.boolean(),
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

/** Moderators read this instead of a visitor-written story. */
export function renderAutopsyStory(
  autopsy: StoredAutopsy,
  correction: CauseCorrection,
) {
  const r = autopsy.report;
  const lines = [
    `Repository autopsy for ${autopsy.repository.fullName} @ ${autopsy.sha.slice(0, 12)} (${autopsy.model}, ${autopsy.createdAt.slice(0, 10)})`,
    `Verdict: ${r.repositoryStatus.verdict} (${r.repositoryStatus.confidence}% confidence)`,
    ...r.repositoryStatus.evidence.map((e) => `  - ${e}`),
    ``,
    `Creator confirmation: ${correction.causeConfirmed ? "agreed with the likely cause" : "disagreed"}`,
    correction.actualCause.trim()
      ? `${autopsyCopy[autopsy.locale].creatorCause} ${correction.actualCause.trim()}`
      : "",
    ``,
    `Summary: ${r.projectSummary}`,
    `Idea: ${r.ideaAssessment.verdict} — ${r.ideaAssessment.explanation}`,
    `Technical condition: ${r.technicalCondition.overallScore}/100 — ${r.technicalCondition.explanation}`,
    `Likely causes:`,
    ...r.likelyCausesOfDeath.map(
      (c) => `  - [${c.confidence}] ${c.cause}: ${c.explanation}`,
    ),
    `Revival potential: ${r.revivalPotential.score}/100 — ${r.revivalPotential.verdict}`,
    `Unknowns:`,
    ...r.unknowns.map((u) => `  - ${u}`),
    `Files analyzed: ${autopsy.filesAnalyzed.join(", ") || "(none)"}`,
  ];
  return lines.join("\n").slice(0, 15000);
}

/**
 * Creates a pending, structured submission from an autopsy. Nothing publishes
 * automatically: moderation still approves the record.
 */
export async function submitAutopsyProject(
  autopsy: StoredAutopsy,
  input: AutopsyPublishInput,
  repository: ProjectRepository,
): Promise<StoredProject> {
  const correction: CauseCorrection = {
    causeConfirmed: input.causeConfirmed,
    actualCause: input.actualCause,
  };
  const draft = input.draft ?? autopsyToDraft(autopsy, correction);
  const facts = Object.fromEntries(
    Object.entries(draft).filter(([, value]) => value !== null),
  );
  const id = randomUUID();
  const title = (draft.title || autopsy.repository.name).slice(0, 100);
  const stem =
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 65) || "project";
  const verdict = autopsy.report.repositoryStatus.verdict;
  const project = storedProjectSchema.parse({
    ...structuredClone(emptySubmission),
    ...facts,
    ...developmentSpan(autopsy),
    id,
    slug: `${stem}-${id.slice(0, 8)}`,
    title,
    status:
      verdict === "archived" || verdict === "likely-dead" ? "dead" : "frozen",
    creator: {
      ...emptySubmission.creator,
      name: input.creatorName,
      github: `https://github.com/${autopsy.repository.owner}`,
    },
    email: input.email,
    links: {
      ...emptySubmission.links,
      github: autopsy.repository.htmlUrl,
      website: safeHttpUrl(autopsy.repository.homepage),
    },
    desiredNextSteps: [input.nextStep],
    rawStory: renderAutopsyStory(autopsy, correction),
    locale: input.locale,
    submissionType: "structured",
    moderationStatus: "submitted",
    createdAt: new Date().toISOString(),
    isDemo: false,
    isFounder: false,
  });
  await repository.save(project);
  return project;
}
