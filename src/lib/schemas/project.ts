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
const media = z.object({
  url: z.string().regex(/^\/media\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.webp$/),
  alt: z.string().trim().min(1).max(200),
});
export const projectContentSchema = z.object({
  title: z.string().trim().min(2, "Give your project a name.").max(100),
  tagline: z
    .string()
    .trim()
    .min(10, "Add a one sentence description.")
    .max(240),
  summary: text,
  category: categorySchema,
  stage: stageSchema,
  status: enumeration(statuses),
  primaryCauseOfDeath: causeSchema,
  causeExplanation: text.min(
    20,
    "Tell us why you stopped (at least 20 characters).",
  ),
  originalIdea: text.min(
    20,
    "Tell us about the idea (at least 20 characters).",
  ),
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
    .min(1, "Choose what happens next.")
    .max(5),
  coverImage: media.nullable(),
  screenshots: z.array(media).max(5),
  links: z.object({ website: httpUrl, github: httpUrl, demo: httpUrl }),
  creator: z.object({
    name: z.string().trim().min(2, "Add your display name.").max(100),
    profileUrl: httpUrl,
    github: httpUrl,
    linkedin: httpUrl,
    x: httpUrl,
  }),
  contactUrl: httpUrl,
});
export const projectSubmissionSchema = projectContentSchema
  .extend({ email: z.email("Enter a valid private email address.").max(254) })
  .superRefine((p, ctx) => {
    if (
      p.desiredNextSteps.includes("let-it-rest") &&
      p.desiredNextSteps.length > 1
    )
      ctx.addIssue({
        code: "custom",
        path: ["desiredNextSteps"],
        message: "Let it rest cannot be combined with other next steps.",
      });
  });
export const projectSchema = projectContentSchema.extend({
  id: z.string().regex(/^[a-zA-Z0-9-]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  moderationStatus: z.enum(["draft", "submitted", "published", "rejected"]),
  createdAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().optional(),
  isDemo: z.boolean().default(false),
});
export const storedProjectSchema = projectSchema.extend({ email: z.email() });
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
