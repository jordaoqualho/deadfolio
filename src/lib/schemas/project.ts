import { z } from "zod";
export const categories = {
  saas: "SaaS",
  "developer-tool": "Developer Tool",
  ai: "AI",
  "mobile-app": "Mobile App",
  "web-app": "Web App",
  "browser-extension": "Browser Extension",
  "open-source": "Open Source",
  marketplace: "Marketplace",
  other: "Other",
} as const;
export const stages = {
  idea: "Idea",
  prototype: "Prototype",
  mvp: "Complete MVP",
  launched: "Launched",
  revenue: "Revenue",
  other: "Other",
} as const;
export const statuses = {
  dead: "Dead",
  frozen: "Frozen",
  "second-life": "Looking for a second life",
  revived: "Revived",
} as const;
export const causes = {
  "no-market": "No market",
  distribution: "Distribution",
  competition: "Competition",
  "user-friction": "User friction",
  "technical-complexity": "Technical complexity",
  costs: "Costs",
  timing: "Timing",
  "lost-interest": "Lost interest",
  team: "Team issues",
  regulation: "Regulation",
  other: "Other",
} as const;
export const nextSteps = {
  "let-it-rest": "Let it rest",
  collaboration: "Looking for collaborator",
  adoption: "Available for adoption",
  "open-source": "Happy to open source",
  offers: "Open to offers",
} as const;
const enumeration = <T extends Record<string, string>>(obj: T) =>
  z.enum(Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]]);
export const categorySchema = enumeration(categories);
export const stageSchema = enumeration(stages);
export const causeSchema = enumeration(causes);
export const nextStepSchema = enumeration(nextSteps);
const text = z.string().trim().max(6000);
const list = z.array(z.string().trim().min(1).max(1500)).max(30);
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((s) => {
    if (!s) return true;
    try {
      const u = new URL(s);
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }, "Enter a valid http or https URL.");
export const projectContentSchema = z.object({
  title: z.string().trim().min(2).max(100),
  tagline: z.string().trim().max(240),
  summary: text,
  category: categorySchema,
  stage: stageSchema,
  status: enumeration(statuses),
  primaryCauseOfDeath: causeSchema,
  causeExplanation: text,
  originalIdea: text,
  whyBuilt: text,
  whatWasBuilt: list,
  whatWentWrong: list,
  whatWorked: list,
  lessons: list,
  survivingAssets: list,
  technologies: z.array(z.string().trim().min(1).max(50)).max(25),
  developmentDuration: z.string().trim().max(100),
  developmentPeriod: z.string().trim().max(100),
  estimatedHours: z.number().int().min(0).max(1000000).nullable(),
  desiredNextSteps: z
    .array(nextStepSchema)
    .min(1)
    .max(5)
    .refine((steps) => !(steps.includes("let-it-rest") && steps.length > 1), {
      message: "Let it rest cannot be combined with other next steps.",
    }),
  links: z.object({ website: httpUrl, github: httpUrl, demo: httpUrl }),
  creator: z.object({
    name: z.string().trim().min(1).max(100),
    profileUrl: httpUrl,
    github: httpUrl,
    linkedin: httpUrl,
    x: httpUrl,
  }),
  contactUrl: httpUrl,
});
/**
 * A public Graveyard record. Everything stored is published: there is no
 * moderation queue. Provenance fields say where the content came from and
 * whether the filer proved they own the repository (never, in the MVP).
 */
export const projectSchema = projectContentSchema.extend({
  id: z.string().regex(/^[a-zA-Z0-9-]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  createdAt: z.iso.datetime(),
  publishedAt: z.iso.datetime(),
  isDemo: z.boolean().default(false),
  source: z.enum(["autopsy", "sample", "manual"]).default("manual"),
  ownershipVerified: z.boolean().default(false),
  causeSource: z.enum(["creator", "inferred"]).default("creator"),
});
export const storedProjectSchema = projectSchema.extend({
  locale: z.enum(["en", "pt"]).default("en"),
  autopsyKey: z.string().max(400).optional(),
});
export const emptyProjectContent: z.infer<typeof projectContentSchema> = {
  title: "",
  tagline: "",
  summary: "",
  category: "other",
  stage: "other",
  status: "dead",
  primaryCauseOfDeath: "other",
  causeExplanation: "",
  originalIdea: "",
  whyBuilt: "",
  whatWasBuilt: [],
  whatWentWrong: [],
  whatWorked: [],
  lessons: [],
  survivingAssets: [],
  technologies: [],
  developmentDuration: "",
  developmentPeriod: "",
  estimatedHours: null,
  desiredNextSteps: ["let-it-rest"],
  links: { website: "", github: "", demo: "" },
  creator: { name: "", profileUrl: "", github: "", linkedin: "", x: "" },
  contactUrl: "",
};
/** Editable fields offered after an autopsy. Null means "leave the autopsy's value". */
export const projectDraftSchema = z.object({
  title: z.string().max(100).nullable(),
  tagline: z.string().max(240).nullable(),
  summary: text.nullable(),
  category: categorySchema.nullable(),
  stage: stageSchema.nullable(),
  primaryCauseOfDeath: causeSchema.nullable(),
  causeExplanation: text.nullable(),
  originalIdea: text.nullable(),
  whatWasBuilt: list,
  whatWentWrong: list,
  whatWorked: list,
  lessons: list,
  survivingAssets: list,
  technologies: z.array(z.string().max(50)).max(25),
  desiredNextSteps: z.array(nextStepSchema).max(5),
});
