import { getRepository } from "@/lib/repositories";
import { isAdmin } from "@/lib/security";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await params;
  if (!/^[a-zA-Z0-9-]+$/.test(id) || !/^[a-zA-Z0-9-]+\.webp$/.test(name))
    return new Response(null, { status: 404 });
  const repo = getRepository();
  const project = await repo.findById(id);
  if (
    !project ||
    ((project.moderationStatus !== "published" ||
      project.submissionType === "raw" ||
      (process.env.NODE_ENV === "production" && project.isDemo)) &&
      !(await isAdmin()))
  )
    return new Response(null, { status: 404 });
  const url = `/media/${id}/${name}`;
  if (
    project.coverImage?.url !== url &&
    !project.screenshots.some((s) => s.url === url)
  )
    return new Response(null, { status: 404 });
  const bytes = await repo.readMedia(id, name);
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
