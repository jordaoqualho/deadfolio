import { put, get, list, del } from "@vercel/blob";
import { BaseProjectRepository, safeSegment } from "./project-repository";
import { storedProjectSchema } from "@/lib/schemas/project";
import type { StoredProject } from "@/types/project";

export function blobStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export class BlobProjectRepository extends BaseProjectRepository {
  private async paths(prefix: string) {
    const blobs: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      blobs.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return blobs;
  }
  private async read(path: string) {
    const result = await get(path, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  async findAll() {
    return Promise.all(
      (await this.paths("deadfolio/projects/"))
        .filter((p) => p.endsWith(".json"))
        .map(async (path) => {
          const bytes = await this.read(path);
          if (!bytes) throw new Error("Stored project could not be read.");
          return storedProjectSchema.parse(JSON.parse(bytes.toString()));
        }),
    );
  }
  async save(p: StoredProject) {
    await put(
      `deadfolio/projects/${safeSegment(p.id)}.json`,
      JSON.stringify(storedProjectSchema.parse(p)),
      {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      },
    );
  }
  async delete(id: string) {
    safeSegment(id);
    await del([
      `deadfolio/projects/${id}.json`,
      ...(await this.paths(`deadfolio/media/${id}/`)),
    ]);
  }
  async saveMedia(id: string, name: string, bytes: Buffer) {
    await put(
      `deadfolio/media/${safeSegment(id)}/${safeSegment(name)}`,
      bytes,
      { access: "private", addRandomSuffix: false, contentType: "image/webp" },
    );
    return `/media/${id}/${name}`;
  }
  async deleteMedia(id: string, names: string[]) {
    if (names.length)
      await del(
        names.map(
          (name) => `deadfolio/media/${safeSegment(id)}/${safeSegment(name)}`,
        ),
      );
  }
  async readMedia(id: string, name: string) {
    return this.read(`deadfolio/media/${safeSegment(id)}/${safeSegment(name)}`);
  }
}
