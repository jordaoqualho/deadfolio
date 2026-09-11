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
