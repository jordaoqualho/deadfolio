import { projectSubmissionSchema } from "@/lib/schemas/project";
import type { ProjectRepository } from "@/lib/repositories/project-repository";
export async function submitProject(
  input: unknown,
  repository: ProjectRepository,
  id?: string,
) {
  const valid = projectSubmissionSchema.parse(input);
  return repository.createSubmission(valid, id);
}

import { randomUUID } from "node:crypto";
import {
  rawSubmissionSchema,
  projectDraftSchema,
  storedProjectSchema,
} from "@/lib/schemas/project";
import { emptySubmission } from "@/lib/schemas/empty-submission";

export async function submitStory(
  input: unknown,
  repository: ProjectRepository,
  draftInput?: unknown,
) {
  const raw = rawSubmissionSchema.parse(input);
  const draft =
    draftInput === undefined ? undefined : projectDraftSchema.parse(draftInput);
  const facts = draft
    ? Object.fromEntries(
        Object.entries(draft).filter(([, value]) => value !== null),
      )
    : {};
  const id = randomUUID();
  const project = storedProjectSchema.parse({
    ...structuredClone(emptySubmission),
    ...facts,
    id,
    slug: `project-${id}`,
    title: raw.title,
    creator: { ...emptySubmission.creator, name: raw.creatorName },
    email: raw.email,
    links: { ...emptySubmission.links, website: raw.url },
    desiredNextSteps: [raw.nextStep],
    rawStory: raw.story,
    locale: raw.locale,
    submissionType: draft ? "structured" : "raw",
    moderationStatus: "submitted",
    createdAt: new Date().toISOString(),
    isDemo: false,
    isFounder: false,
  });
  await repository.save(project);
  return project;
}
