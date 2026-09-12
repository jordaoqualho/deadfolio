import { z } from "zod";
import { categorySchema, causeSchema, stageSchema } from "./project";

export const repositoryVerdicts = {
  active: "Active",
  stale: "Possibly stale",
  "likely-dead": "Likely dead",
  archived: "Archived",
} as const;
export const ideaVerdicts = {
  strong: "Strong",
  promising: "Promising",
  questionable: "Questionable",
  weak: "Weak",
  "insufficient-evidence": "Insufficient evidence",
} as const;
const verdictSchema = z.enum(
  Object.keys(repositoryVerdicts) as [
    keyof typeof repositoryVerdicts,
    ...(keyof typeof repositoryVerdicts)[],
  ],
);
const ideaVerdictSchema = z.enum(
  Object.keys(ideaVerdicts) as [
    keyof typeof ideaVerdicts,
    ...(keyof typeof ideaVerdicts)[],
  ],
);
const confidenceSchema = z.enum(["low", "medium", "high"]);

/**
 * Lenient shape requested from Gemini. It deliberately avoids numeric ranges and
 * string length constraints, which structured-output providers handle unevenly.
 * `normalizeAutopsy` clamps and trims it into `repositoryAutopsySchema`.
 */
export const aiAutopsyOutputSchema = z.object({
  repositoryStatus: z.object({
    verdict: verdictSchema,
    confidence: z.number(),
    evidence: z.array(z.string()),
  }),
  projectSummary: z.string(),
  whatWasBuilt: z.array(z.string()),
  technologies: z.array(z.string()),
  category: categorySchema.nullable(),
  stage: stageSchema.nullable(),
  ideaAssessment: z.object({
    verdict: ideaVerdictSchema,
    explanation: z.string(),
  }),
  technicalCondition: z.object({
    overallScore: z.number(),
    architectureScore: z.number().nullable(),
    maintainabilityScore: z.number().nullable(),
    completenessScore: z.number().nullable(),
    documentationScore: z.number().nullable(),
    explanation: z.string(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  likelyCausesOfDeath: z.array(
    z.object({
      cause: z.string(),
      category: causeSchema.nullable(),
      confidence: confidenceSchema,
      explanation: z.string(),
      evidence: z.array(z.string()),
    }),
  ),
  survivingAssets: z.array(z.string()),
  revivalPotential: z.object({
    score: z.number(),
    verdict: z.string(),
    suggestedDirection: z.string().nullable(),
  }),
  unknowns: z.array(z.string()),
});

const score = z.number().int().min(0).max(100);
const short = z.string().trim().min(1).max(400);
const paragraph = z.string().trim().max(2000);
const shortList = (max: number) => z.array(short).max(max);

export const repositoryAutopsySchema = z.object({
  repositoryStatus: z.object({
    verdict: verdictSchema,
    confidence: score,
    evidence: shortList(10),
  }),
  projectSummary: paragraph,
  whatWasBuilt: shortList(12),
  technologies: z.array(z.string().trim().min(1).max(50)).max(25),
  category: categorySchema.nullable(),
  stage: stageSchema.nullable(),
  ideaAssessment: z.object({
    verdict: ideaVerdictSchema,
    explanation: paragraph,
  }),
  technicalCondition: z.object({
    overallScore: score,
    architectureScore: score.optional(),
    maintainabilityScore: score.optional(),
    completenessScore: score.optional(),
    documentationScore: score.optional(),
    explanation: paragraph,
  }),
  strengths: shortList(10),
  weaknesses: shortList(10),
  likelyCausesOfDeath: z
    .array(
      z.object({
        cause: short,
        category: causeSchema.nullable(),
        confidence: confidenceSchema,
        explanation: paragraph,
        evidence: shortList(8),
      }),
    )
    .max(6),
  survivingAssets: shortList(10),
  revivalPotential: z.object({
    score,
    verdict: short,
    suggestedDirection: paragraph.optional(),
  }),
  unknowns: shortList(12),
});

const isoDate = z.iso.datetime();
const githubName = z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/);

export const repositoryFactsSchema = z.object({
  owner: githubName,
  name: githubName,
  fullName: z.string().max(201),
  htmlUrl: z.url(),
  description: z.string().max(1000).nullable(),
  homepage: z.string().max(2048).nullable(),
  language: z.string().max(100).nullable(),
  topics: z.array(z.string().max(60)).max(30),
  license: z.string().max(100).nullable(),
  stars: z.number().int().min(0),
  forks: z.number().int().min(0),
  openIssues: z.number().int().min(0),
  size: z.number().int().min(0),
  archived: z.boolean(),
  disabled: z.boolean(),
  fork: z.boolean(),
  defaultBranch: z.string().max(255),
  createdAt: isoDate,
  pushedAt: isoDate.nullable(),
  updatedAt: isoDate,
});

export const deadSignalSchema = z.object({
  code: z.enum([
    "archived",
    "disabled",
    "fork",
    "empty",
    "inactive",
    "short-activity",
    "old",
    "open-issues",
    "recent-push",
  ]),
  value: z.number().optional(),
});

export const deadScoreSchema = z.object({
  score: score,
  classification: verdictSchema,
  signals: z.array(deadSignalSchema),
});

export const discoveredRepositorySchema = repositoryFactsSchema.extend({
  deadScore: deadScoreSchema,
});

export const storedAutopsySchema = z.object({
  key: z.string().max(400),
  owner: githubName,
  repo: githubName,
  sha: z.string().regex(/^[0-9a-f]{7,64}$/),
  defaultBranch: z.string().max(255),
  locale: z.enum(["en", "pt"]),
  model: z.string().max(60),
  createdAt: isoDate,
  repository: repositoryFactsSchema,
  deadScore: deadScoreSchema,
  report: repositoryAutopsySchema,
  filesAnalyzed: z.array(z.string().max(500)).max(50),
  usage: z.object({
    inputTokens: z.number().int().min(0).nullable(),
    outputTokens: z.number().int().min(0).nullable(),
  }),
});

const clamp = (value: number) =>
  Math.round(Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0)));
const trim = (value: string, max: number) => {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};
const items = (values: string[], max: number, length = 400) =>
  values
    .map((v) => trim(String(v ?? ""), length))
    .filter(Boolean)
    .slice(0, max);
const optionalScore = (value: number | null) =>
  value === null || value === undefined ? undefined : clamp(value);

/** Turns the model's loose output into the strict, storable report. */
export function normalizeAutopsy(
  raw: z.infer<typeof aiAutopsyOutputSchema>,
): z.infer<typeof repositoryAutopsySchema> {
  return repositoryAutopsySchema.parse({
    repositoryStatus: {
      verdict: raw.repositoryStatus.verdict,
      confidence: clamp(raw.repositoryStatus.confidence),
      evidence: items(raw.repositoryStatus.evidence, 10),
    },
    projectSummary: trim(raw.projectSummary, 2000),
    whatWasBuilt: items(raw.whatWasBuilt, 12),
    technologies: items(raw.technologies, 25, 50),
    category: raw.category,
    stage: raw.stage,
    ideaAssessment: {
      verdict: raw.ideaAssessment.verdict,
      explanation: trim(raw.ideaAssessment.explanation, 2000),
    },
    technicalCondition: {
      overallScore: clamp(raw.technicalCondition.overallScore),
      architectureScore: optionalScore(raw.technicalCondition.architectureScore),
      maintainabilityScore: optionalScore(
        raw.technicalCondition.maintainabilityScore,
      ),
      completenessScore: optionalScore(
        raw.technicalCondition.completenessScore,
      ),
      documentationScore: optionalScore(
        raw.technicalCondition.documentationScore,
      ),
      explanation: trim(raw.technicalCondition.explanation, 2000),
    },
    strengths: items(raw.strengths, 10),
    weaknesses: items(raw.weaknesses, 10),
    likelyCausesOfDeath: raw.likelyCausesOfDeath
      .filter((c) => c && String(c.cause ?? "").trim())
      .slice(0, 6)
      .map((c) => ({
        cause: trim(c.cause, 400),
        category: c.category,
        confidence: c.confidence,
        explanation: trim(c.explanation, 2000),
        evidence: items(c.evidence, 8),
      })),
    survivingAssets: items(raw.survivingAssets, 10),
    revivalPotential: {
      score: clamp(raw.revivalPotential.score),
      verdict: trim(raw.revivalPotential.verdict || "—", 400),
      suggestedDirection: raw.revivalPotential.suggestedDirection
        ? trim(raw.revivalPotential.suggestedDirection, 2000)
        : undefined,
    },
    unknowns: items(raw.unknowns, 12),
  });
}
