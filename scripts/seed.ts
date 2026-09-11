import { seedProjects } from "../src/data/seed-projects";
import { BlobProjectRepository } from "../src/lib/repositories/blob-project-repository";
import { LocalProjectRepository } from "../src/lib/repositories/local-project-repository";
async function main() {
  const blob = process.env.PROJECT_REPOSITORY === "blob";
  if (blob && !process.env.BLOB_READ_WRITE_TOKEN)
    throw new Error("Set BLOB_READ_WRITE_TOKEN for a private Blob store.");
  const repo = blob
    ? new BlobProjectRepository()
    : new LocalProjectRepository();
  for (const seed of seedProjects) {
    if (await repo.findById(seed.id)) {
      console.log(`Kept existing ${seed.title}.`);
      continue;
    }
    await repo.save(seed);
    console.log(`Added sample project: ${seed.title}.`);
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seeding failed.");
  process.exitCode = 1;
});
