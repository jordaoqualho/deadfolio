import { projectSchema, storedProjectSchema } from "@/lib/schemas/project";
import type { Project, StoredProject } from "@/types/project";

/**
 * Persistence for public Graveyard records. Everything saved is public; there
 * is no queue, approval or rejection. Records are written by the autopsy
 * publish flow and by the sample seeds.
 */
export interface ProjectRepository {
  findAll(): Promise<StoredProject[]>;
  findPublished(): Promise<Project[]>;
  findBySlug(slug: string): Promise<Project | null>;
  findById(id: string): Promise<StoredProject | null>;
  save(project: StoredProject): Promise<void>;
  delete(id: string): Promise<void>;
}

export abstract class BaseProjectRepository implements ProjectRepository {
  protected abstract readAll(): Promise<unknown[]>;
  abstract save(project: StoredProject): Promise<void>;
  abstract delete(id: string): Promise<void>;

  /**
   * Records written by earlier versions of Deadfolio (pending manual
   * submissions, for example) may not satisfy the current schema. They are
   * skipped with a warning instead of taking the whole archive down.
   */
  async findAll() {
    const records: StoredProject[] = [];
    for (const raw of await this.readAll()) {
      const parsed = storedProjectSchema.safeParse(raw);
      if (parsed.success) records.push(parsed.data);
      else
        console.warn(
          `Skipping stored project that no longer matches the schema: ${String(
            (raw as { id?: unknown })?.id ?? "unknown",
          )}`,
        );
    }
    return records;
  }
  async findPublished() {
    return (await this.findAll())
      .filter((p) => process.env.NODE_ENV !== "production" || !p.isDemo)
      .map((p) => projectSchema.parse(p))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  async findBySlug(slug: string) {
    return (await this.findPublished()).find((p) => p.slug === slug) ?? null;
  }
  async findById(id: string) {
    return (await this.findAll()).find((p) => p.id === id) ?? null;
  }
}

export function safeSegment(value: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(value)) throw new Error("Invalid storage path.");
  return value;
}
