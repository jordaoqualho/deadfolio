import { randomUUID } from "node:crypto";
import {
  projectSchema,
  storedProjectSchema,
  projectSubmissionSchema,
} from "@/lib/schemas/project";
import type {
  Project,
  ProjectSubmission,
  StoredProject,
} from "@/types/project";
export interface ProjectRepository {
  findAll(): Promise<StoredProject[]>;
  findPublished(): Promise<Project[]>;
  findBySlug(slug: string): Promise<Project | null>;
  findById(id: string): Promise<StoredProject | null>;
  createSubmission(
    input: ProjectSubmission,
    id?: string,
  ): Promise<StoredProject>;
  update(id: string, input: ProjectSubmission): Promise<StoredProject>;
  approve(id: string): Promise<StoredProject>;
  reject(id: string): Promise<StoredProject>;
  delete(id: string): Promise<void>;
  save(project: StoredProject): Promise<void>;
  saveMedia(id: string, name: string, bytes: Buffer): Promise<string>;
  readMedia(id: string, name: string): Promise<Buffer | null>;
  deleteMedia(id: string, names: string[]): Promise<void>;
}
export abstract class BaseProjectRepository implements ProjectRepository {
  abstract findAll(): Promise<StoredProject[]>;
  abstract save(project: StoredProject): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract saveMedia(id: string, name: string, bytes: Buffer): Promise<string>;
  abstract readMedia(id: string, name: string): Promise<Buffer | null>;
  abstract deleteMedia(id: string, names: string[]): Promise<void>;
  async findPublished() {
    return (await this.findAll())
      .filter(
        (p) =>
          p.moderationStatus === "published" &&
          p.submissionType !== "raw" &&
          (process.env.NODE_ENV !== "production" || !p.isDemo),
      )
      .map((p) => projectSchema.parse(p))
      .sort((a, b) =>
        (b.publishedAt ?? b.createdAt).localeCompare(
          a.publishedAt ?? a.createdAt,
        ),
      );
  }
  async findBySlug(slug: string) {
    return (await this.findPublished()).find((p) => p.slug === slug) ?? null;
  }
  async findById(id: string) {
    return (await this.findAll()).find((p) => p.id === id) ?? null;
  }
  async createSubmission(input: ProjectSubmission, id = randomUUID()) {
    const stem =
      input.title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 65) || "project";
    const p = storedProjectSchema.parse({
      ...input,
      id,
      slug: `${stem}-${id.slice(0, 8)}`,
      moderationStatus: "submitted",
      createdAt: new Date().toISOString(),
      isDemo: false,
    });
    await this.save(p);
    return p;
  }
  async update(id: string, input: ProjectSubmission) {
    const old = await this.required(id);
    const valid = projectSubmissionSchema.parse(input);
    const p = storedProjectSchema.parse({
      ...old,
      ...valid,
      submissionType: "structured",
    });
    await this.save(p);
    return p;
  }
  async required(id: string) {
    const p = await this.findById(id);
    if (!p) throw new Error("Project not found.");
    return p;
  }
  async approve(id: string) {
    const p = await this.required(id);
    if (p.submissionType === "raw")
      throw new Error("Structure this story before publishing.");
    projectSubmissionSchema.parse(p);
    p.moderationStatus = "published";
    p.publishedAt ??= new Date().toISOString();
    await this.save(p);
    return p;
  }
  async reject(id: string) {
    const p = await this.required(id);
    p.moderationStatus = "rejected";
    await this.save(p);
    return p;
  }
}
export function safeSegment(value: string) {
  if (!/^[a-zA-Z0-9-]+(?:\.webp)?$/.test(value))
    throw new Error("Invalid storage path.");
  return value;
}
