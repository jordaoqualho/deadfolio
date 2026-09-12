import { emptyProjectContent } from "@/lib/schemas/project";
import type { StoredProject } from "@/types/project";
// Both are explicitly labeled samples. They are seeded locally only and hidden
// in production; delete them from the data store before launch if unwanted.
// Fintal's supplied facts are preserved; unknown dates, stack and metrics are omitted.
export const seedProjects: StoredProject[] = [
  {
    ...emptyProjectContent,
    id: "seed-fintal",
    slug: "fintal",
    title: "Fintal",
    tagline:
      "Making money management beautiful wasn’t enough to make it effortless.",
    summary:
      "A personal finance application with transaction importing, categorization, dashboards, a calendar and notifications.",
    category: "saas",
    stage: "mvp",
    primaryCauseOfDeath: "user-friction",
    causeExplanation:
      "Manual statement importing created too much friction compared with modern financial apps connected directly to banking data.",
    originalIdea:
      "A personal finance application that brought transactions, categories, dashboards, a calendar and notifications together.",
    whatWasBuilt: [
      "Transaction importing and categorization",
      "Personal finance dashboards",
      "Calendar functionality",
      "Notifications",
    ],
    creator: { ...emptyProjectContent.creator, name: "Fintal · sample record" },
    createdAt: "2026-01-01T00:00:00.000Z",
    publishedAt: "2026-01-01T00:00:00.000Z",
    isDemo: true,
    source: "sample",
    ownershipVerified: false,
    causeSource: "creator",
    locale: "en",
  },
  {
    ...emptyProjectContent,
    id: "seed-tabula",
    slug: "tabula",
    title: "Tabula",
    tagline: "A quieter place for the tabs you were definitely going to read.",
    summary:
      "A fictional browser extension for collecting tabs into reading sessions. This example demonstrates a full postmortem.",
    category: "browser-extension",
    stage: "prototype",
    status: "frozen",
    primaryCauseOfDeath: "lost-interest",
    causeExplanation:
      "The prototype solved a small irritation, but maintaining another reading queue became a chore. The maker stopped using it and lost interest in developing it further.",
    originalIdea:
      "Turn a crowded browser window into a small, intentional reading list, organized by topic rather than by the order tabs were opened.",
    whyBuilt:
      "The maker wanted to finish reading saved articles without keeping dozens of tabs open.",
    whatWasBuilt: [
      "Save a group of tabs as a reading session",
      "A distraction-free session overview",
      "Export saved links as a text file",
    ],
    whatWentWrong: [
      "Assumed organizing a reading backlog would make it easier to finish.",
      "Added another place to save things without changing the reading habit.",
    ],
    whatWorked: [
      "One-click session saving was easy to understand.",
      "Plain-text export kept the collected links portable.",
    ],
    lessons: [
      "Test whether the underlying habit changes before polishing the organization tools.",
      "A tool needs a reason to be reopened, not just an easy first use.",
    ],
    survivingAssets: [
      "Extension prototype",
      "Interface sketches",
      "Export utility",
    ],
    technologies: ["TypeScript", "React"],
    desiredNextSteps: ["adoption", "open-source"],
    creator: { ...emptyProjectContent.creator, name: "Demo creator" },
    createdAt: "2026-01-02T00:00:00.000Z",
    publishedAt: "2026-01-02T00:00:00.000Z",
    isDemo: true,
    source: "sample",
    ownershipVerified: false,
    causeSource: "creator",
    locale: "en",
  },
];
