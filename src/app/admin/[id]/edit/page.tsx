import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/security";
import { getRepository } from "@/lib/repositories";
import { ProjectEditor } from "@/components/submission/project-editor";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin");
  const p = await getRepository().findById((await params).id);
  if (!p) notFound();
  return (
    <div className="shell page-space">
      <ProjectEditor initial={{ ...p }} editId={p.id} story={p.rawStory} />
    </div>
  );
}
