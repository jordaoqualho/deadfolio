import sharp from "sharp";
import { randomUUID } from "node:crypto";
import type { ProjectRepository } from "@/lib/repositories/project-repository";
import type { ProjectSubmission } from "@/types/project";
export async function attachMedia(
  input: ProjectSubmission,
  form: FormData,
  id: string,
  repo: ProjectRepository,
) {
  const cover = form.get("cover");
  const screenshots = form
    .getAll("screenshots")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (screenshots.length + input.screenshots.length > 5)
    throw new Error("Attach no more than five screenshots.");
  const files = [
    ...(cover instanceof File && cover.size > 0 ? [cover] : []),
    ...screenshots,
  ];
  if (files.reduce((sum, f) => sum + f.size, 0) > 3 * 1024 * 1024)
    throw new Error("Images must total less than 3 MB after compression.");
  // Decode and re-encode all images before writing anything. This strips metadata and rejects disguised files.
  const processed = await Promise.all(
    files.map(async (file) => {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 1024 * 1024
      )
        throw new Error("Use JPEG, PNG or WebP images under 1 MB each.");
      try {
        return await sharp(Buffer.from(await file.arrayBuffer()), {
          limitInputPixels: 24000000,
          animated: false,
        })
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        throw new Error(
          "An image could not be read. Choose a valid JPEG, PNG or WebP.",
        );
      }
    }),
  );
  const alts = form.getAll("screenshotAlt");
  const coverAlt = String(form.get("coverAlt") || "").trim();
  if (
    cover instanceof File &&
    cover.size > 0 &&
    (!coverAlt || coverAlt.length > 200)
  )
    throw new Error("Describe the cover image in 1–200 characters.");
  for (let i = 0; i < screenshots.length; i++) {
    const alt = String(alts[i] || "").trim();
    if (!alt || alt.length > 200)
      throw new Error("Describe each screenshot in 1–200 characters.");
  }
  const written: string[] = [];
  async function write(bytes: Buffer) {
    const name = `${randomUUID()}.webp`;
    const url = await repo.saveMedia(id, name, bytes);
    written.push(name);
    return url;
  }
  let offset = 0;
  try {
    if (cover instanceof File && cover.size > 0) {
      input.coverImage = {
        url: await write(processed[offset++]),
        alt: coverAlt,
      };
    }
    for (let i = 0; i < screenshots.length; i++) {
      const alt = String(alts[i] || "").trim();
      if (!alt || alt.length > 200)
        throw new Error("Describe each screenshot in 1–200 characters.");
      input.screenshots.push({ url: await write(processed[offset++]), alt });
    }
    return input;
  } catch (error) {
    await repo.deleteMedia(id, written).catch(() => {});
    throw error;
  }
}
