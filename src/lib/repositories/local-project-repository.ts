import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  rm,
  access,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { BaseProjectRepository, safeSegment } from "./project-repository";
import { storedProjectSchema } from "@/lib/schemas/project";
import { seedProjects } from "@/data/seed-projects";
import type { StoredProject } from "@/types/project";
export class LocalProjectRepository extends BaseProjectRepository {
  private ready: Promise<void> | undefined;
  constructor(
    private root = path.resolve(
      /* turbopackIgnore: true */ process.env.LOCAL_DATA_DIR || ".data",
    ),
    private seed = process.env.NODE_ENV !== "production" &&
      process.env.SEED_DEMOS !== "false",
  ) {
    super();
  }
  private init() {
    return (this.ready ??= (async () => {
      await mkdir(path.join(this.root, "projects"), { recursive: true });
      try {
        await access(path.join(this.root, ".initialized"));
      } catch {
        if (this.seed)
          for (const p of seedProjects) {
            try {
              await writeFile(
                path.join(this.root, "projects", `${p.id}.json`),
                JSON.stringify(p),
                { flag: "wx", mode: 0o600 },
              );
            } catch (e) {
              if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
            }
          }
        await writeFile(path.join(this.root, ".initialized"), "1");
      }
    })());
  }
  protected async readAll() {
    await this.init();
    const files = (await readdir(path.join(this.root, "projects"))).filter(
      (f) => f.endsWith(".json"),
    );
    return Promise.all(
      files.map(
        async (f) =>
          JSON.parse(
            await readFile(path.join(this.root, "projects", f), "utf8"),
          ) as unknown,
      ),
    );
  }
  async save(p: StoredProject) {
    await this.init();
    const target = path.join(
      this.root,
      "projects",
      `${safeSegment(p.id)}.json`,
    );
    const temp = `${target}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(storedProjectSchema.parse(p)), {
      mode: 0o600,
    });
    await rename(temp, target);
  }
  async delete(id: string) {
    await this.init();
    await rm(path.join(this.root, "projects", `${safeSegment(id)}.json`), {
      force: true,
    });
  }
}
