import "server-only";
import { LocalProjectRepository } from "./local-project-repository";
import {
  BlobProjectRepository,
  blobStoreConfigured,
} from "./blob-project-repository";
import type { ProjectRepository } from "./project-repository";
let repository: ProjectRepository;
export function getRepository() {
  if (repository) return repository;
  const mode =
    process.env.PROJECT_REPOSITORY || (process.env.VERCEL ? "blob" : "local");
  if (mode === "blob") {
    if (!blobStoreConfigured())
      throw new Error(
        "Configure a private Vercel Blob store before accepting submissions.",
      );
    repository = new BlobProjectRepository();
  } else {
    if (process.env.VERCEL)
      throw new Error(
        "Filesystem persistence is not supported on Vercel. Set PROJECT_REPOSITORY=blob.",
      );
    repository = new LocalProjectRepository();
  }
  return repository;
}
