import { projectDraftSchema } from "@/lib/schemas/project";
import type { ProjectDraft } from "@/types/project";
import type { StoredAutopsy } from "@/types/autopsy";

export type CauseCorrection = { causeConfirmed: boolean; actualCause: string };

export const autopsyCopy = {
  en: {
    unknownCause:
      "Based on repository evidence alone, the reason development stopped cannot be established.",
    creatorCause: "According to the creator:",
    evidence: "Based on repository evidence:",
    months: (n: number) => `≈ ${n} ${n === 1 ? "month" : "months"} of activity`,
    days: (n: number) => `≈ ${n} ${n === 1 ? "day" : "days"} of activity`,
  },
  pt: {
    unknownCause:
      "Apenas com as evidências do repositório não é possível determinar por que o desenvolvimento parou.",
    creatorCause: "Segundo quem criou:",
    evidence: "Com base nas evidências do repositório:",
    months: (n: number) => `≈ ${n} ${n === 1 ? "mês" : "meses"} de atividade`,
    days: (n: number) => `≈ ${n} ${n === 1 ? "dia" : "dias"} de atividade`,
  },
} as const;

const firstSentence = (text: string) =>
  text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
export const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/**
 * Turns an autopsy into Deadfolio's editable draft. The creator's correction,
 * when given, becomes the authoritative cause; AI causes are only fallbacks.
 * Lessons stay empty on purpose: the repository cannot know what the creator learned.
 */
export function autopsyToDraft(
  autopsy: StoredAutopsy,
  correction: CauseCorrection,
): ProjectDraft {
  const { report, repository } = autopsy;
  const t = autopsyCopy[autopsy.locale];
  const top = report.likelyCausesOfDeath[0];
  const corrected = !correction.causeConfirmed && correction.actualCause.trim();
  const causeExplanation = corrected
    ? correction.actualCause.trim()
    : top
      ? `${t.evidence} ${top.cause}. ${top.explanation}`.trim()
      : t.unknownCause;
  const tagline =
    (repository.description && repository.description.length >= 10
      ? clip(repository.description, 240)
      : clip(firstSentence(report.projectSummary), 240)) || null;
  const technologies = Array.from(
    new Set(
      [repository.language, ...report.technologies].filter(
        (v): v is string => Boolean(v),
      ),
    ),
  ).slice(0, 25);
  return projectDraftSchema.parse({
    title: repository.name.slice(0, 100),
    tagline,
    summary: report.projectSummary || null,
    category: report.category,
    stage: report.stage,
    primaryCauseOfDeath: corrected ? "other" : (top?.category ?? null),
    causeExplanation: clip(causeExplanation, 6000),
    originalIdea: report.productAssessment.explanation || report.projectSummary || null,
    whatWasBuilt: report.whatWasBuilt.map((s) => clip(s, 1500)),
    whatWentWrong: report.weaknesses.map((s) => clip(s, 1500)),
    whatWorked: report.strengths.map((s) => clip(s, 1500)),
    lessons: [],
    survivingAssets: report.survivingAssets.map((s) => clip(s, 1500)),
    technologies,
    desiredNextSteps: [],
  });
}
