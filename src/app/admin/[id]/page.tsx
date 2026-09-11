import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/security";
import { getRepository } from "@/lib/repositories";
import { ProjectAutopsy } from "@/components/deadfolio/project-autopsy";
import { AdminActions } from "@/components/admin";
import { projectSchema } from "@/lib/schemas/project";
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin");
  const p = await getRepository().findById((await params).id);
  if (!p) notFound();
  return (
    <>
      <div className="shell admin-preview-actions">
        <AdminActions id={p.id} status={p.moderationStatus} />
      </div>
      <ProjectAutopsy project={projectSchema.parse(p)} preview />
    </>
  );
}
